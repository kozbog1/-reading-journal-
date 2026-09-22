import { supabase } from '../lib/supabaseClient.js';

export async function loadChallengeState(userId) {
  const { data, error } = await supabase.from('challenge_state').select('*').eq('user_id', userId);
  if (error) throw error;
  const map = {};
  for (const row of data) map[row.challenge_key] = row;
  return map;
}

export async function upsertChallengeState(userId, key, fields) {
  const { error } = await supabase.from('challenge_state').upsert(
    { user_id: userId, challenge_key: key, ...fields },
    { onConflict: 'user_id,challenge_key' }
  );
  if (error) throw error;
}