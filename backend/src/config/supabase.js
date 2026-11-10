import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
} catch (e) {}

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY || '';

let supabaseClient = null;

if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-supabase')) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  console.log('✅ Supabase client initialized with provided credentials.');
} else {
  console.log('⚠️ Supabase credentials missing or default. Running in mock memory fallback mode for dev preview.');
}

export const supabase = supabaseClient;

