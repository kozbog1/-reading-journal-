import { supabase } from '../lib/supabaseClient.js';

const BUCKET = 'covers';

export async function uploadCover(userId, bookId, blob) {
  const path = `${userId}/${bookId}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  return path;
}

export async function deleteCover(path) {
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.warn('Nem sikerult torolni a boritokepet:', error.message);
}

const signedUrlCache = new Map();

export async function getCoverUrl(path) {
  if (!path) return null;
  if (signedUrlCache.has(path)) return signedUrlCache.get(path);
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24);
  if (error) {
    console.warn('Nem sikerult boritokepet lekerni:', error.message);
    return null;
  }
  signedUrlCache.set(path, data.signedUrl);
  return data.signedUrl;
}

export function clearCoverUrlCache() {
  signedUrlCache.clear();
}

export function resizeImageToBlob(file, maxDim = 500, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > h) { if (w > maxDim) { h = Math.round(h * maxDim / w); w = maxDim; } }
        else { if (h > maxDim) { w = Math.round(w * maxDim / h); h = maxDim; } }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Nem sikerult a kep tomoriteset.')),
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Nem sikerult beolvasni a kepet.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Nem sikerult beolvasni a fajlt.'));
    reader.readAsDataURL(file);
  });
}
