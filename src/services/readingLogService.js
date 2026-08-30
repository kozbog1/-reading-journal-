import { supabase } from '../lib/supabaseClient.js';

export async function loadReadingLog(userId) {
  const { data, error } = await supabase
    .from('reading_log')
    .select('log_date, pages')
    .eq('user_id', userId);
  if (error) throw error;
  const log = {};
  for (const row of data) {
    log[row.log_date] = row.pages;
  }
  return log;
}

export async function upsertReadingLogEntry(userId, date, pages) {
  const { error } = await supabase
    .from('reading_log')
    .upsert(
      { user_id: userId, log_date: date, pages },
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
