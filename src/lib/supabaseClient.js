import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    'Hianyzo Supabase konfiguracio. Ellenorizd, hogy letrehoztad-e a .env fajlt ' +
    'a .env.example alapjan, es hogy tartalmazza a VITE_SUPABASE_URL es ' +
    'VITE_SUPABASE_ANON_KEY valtozokat.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
