import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

console.log('SUPABASE_URL:', supabaseUrl);
console.log('SUPABASE_ANON_KEY:', supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'MISSING');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAnonQuery() {
  console.log('\n--- Querying public.products using SUPABASE_ANON_KEY ---');
  const { data, error } = await supabase.from('products').select('*');

  if (error) {
    console.error('❌ Supabase Query Error:', error);
  } else {
    console.log(`QueryResult Length: ${data ? data.length : 0}`);
    console.log('Data returned to Anon Key:', JSON.stringify(data, null, 2));
  }
}

testAnonQuery();
