import { insertBook, updateBook } from './bookService.js';
import { upsertReadingLogEntry } from './readingLogService.js';
import { uploadCover } from './coverService.js';

function base64ToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function importFromJson(jsonData, userId, onProgress) {
  const result = { booksImported: 0, logEntriesImported: 0, errors: [] };
  const books = Array.isArray(jsonData.books) ? jsonData.books : [];
  const readingLog = jsonData.readingLog || {};

  let done = 0;
  for (const oldBook of books) {
    try {
      const newBook = await insertBook(
        {
          title: oldBook.title,
          author: oldBook.author,
          pages: oldBook.pages,
          status: oldBook.status,
          rating: oldBook.rating,
          date: oldBook.date,
          note: oldBook.note,
          genres: oldBook.genres,
          pagesRead: oldBook.pagesRead,
          plannedMonth: oldBook.plannedMonth,
          plannedYear: oldBook.plannedYear
        },
        userId
      );

      if (oldBook.image && typeof oldBook.image === 'string' && oldBook.image.startsWith('data:')) {
        try {
          const blob = base64ToBlob(oldBook.image);
          const path = await uploadCover(userId, newBook.id, blob);
          await updateBook(newBook.id, { ...newBook, coverPath: path }, userId);
        } catch (imgErr) {
          result.errors.push(`Kep hiba (${oldBook.title}): ${imgErr.message}`);
        }
      }
      result.booksImported++;
    } catch (err) {
      result.errors.push(`Konyv hiba (${oldBook.title || '?'}): ${err.message}`);
    }
    done++;
    if (onProgress) onProgress(done, books.length);
  }

  for (const [date, pages] of Object.entries(readingLog)) {
    try {
      await upsertReadingLogEntry(userId, date, pages);
      result.logEntriesImported++;
    } catch (err) {
      result.errors.push(`Naplo hiba (${date}): ${err.message}`);
    }
  }

  return result;
}
