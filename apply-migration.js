// Quick script to apply the Stage 7 migration to Supabase
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.test' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.test');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('Reading migration file...');

  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250103000000_fix_stage7_schema_issues.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Authenticating...');
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: process.env.VITE_TEST_USER_EMAIL,
    password: process.env.VITE_TEST_USER_PASSWORD
  });

  if (authError) {
    console.error('Authentication failed:', authError);
    process.exit(1);
  }

  console.log('Applying migration...');
  console.log('SQL to execute:');
  console.log(sql);
  console.log('\nNote: This script uses the Supabase REST API which may not support all DDL operations.');
  console.log('You may need to run this SQL manually in the Supabase dashboard.');
  console.log('\nPlease visit: https://supabase.com/dashboard/project/frbulthijdpkeqdphnxc/sql/new');
  console.log('And paste the SQL shown above.\n');
}

applyMigration();
