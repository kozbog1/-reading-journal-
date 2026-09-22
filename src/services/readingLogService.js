import { supabase } from '../lib/supabaseClient.js';

export async function loadReadingLog(userId) {
  const { data, error } = await supabase
    .from('reading_log')
    .select('log_date, pages, is_evening, duration_minutes')
    .eq('user_id', userId);
  if (error) throw error;
  const log = {};
  const meta = {};
  for (const row of data) {
    log[row.log_date] = row.pages;
    meta[row.log_date] = { isEvening: !!row.is_evening, durationMinutes: row.duration_minutes || 0 };
  }
  return { log, meta };
}

export async function upsertReadingLogEntry(userId, date, pages, extra = {}) {
  const { error } = await supabase
    .from('reading_log')
    .upsert(
      { user_id: userId, log_date: date, pages, is_evening: !!extra.isEvening, duration_minutes: extra.durationMinutes || null },
      { onConflict: 'user_id,log_date' }
    );
  if (error) throw error;
}

export async function deleteReadingLogEntry(userId, date) {
  const { error } = await supabase
    .from('reading_log')
    .delete()
    .eq('user_id', userId)
    .eq('log_date', date);
  if (error) throw error;
}