import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

let supabaseClient = null;

if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-supabase')) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  console.log('✅ Supabase client initialized with provided credentials.');
} else {
  console.log('⚠️ Supabase credentials missing or default. Running in mock memory fallback mode for dev preview.');
}

export const supabase = supabaseClient;
