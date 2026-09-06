import { supabase } from '../lib/supabaseClient.js';

function rowToBook(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author || '',
    pages: row.pages || 0,
    status: row.status,
    rating: row.rating || 0,
    date: row.date || '',
    note: row.note || '',
    genres: row.genres || [],
    series: row.series || [],
    pagesRead: row.pages_read || 0,
    plannedMonth: row.planned_month,
    plannedYear: row.planned_year,
    coverPath: row.cover_path || null,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
  };
}

function bookToRow(book, userId) {
  return {
    user_id: userId,
    title: book.title,
    author: book.author || null,
    pages: book.pages || 0,
    status: book.status,
    rating: book.rating || 0,
    date: book.date || null,
    note: book.note || null,
    genres: book.genres || [],
    series: book.series || [],
    pages_read: book.pagesRead || 0,
    planned_month: book.plannedMonth || null,
    planned_year: book.plannedYear || null,
    cover_path: book.coverPath || null
  };
}

export async function listBooks(userId) {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(rowToBook);
}

export async function insertBook(book, userId) {
  const row = bookToRow(book, userId);
  const { data, error } = await supabase
    .from('books')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return rowToBook(data);
}

export async function updateBook(id, book, userId) {
  const row = bookToRow(book, userId);
  row.updated_at = new Date().toISOString();
  const { data, error } = await supabase
    .from('books')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return rowToBook(data);
}

export async function deleteBookRow(id) {
  const { error } = await supabase.from('books').delete().eq('id', id);
  if (error) throw error;
}
