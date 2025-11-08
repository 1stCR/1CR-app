// Clean up all test data from Stage 7 tests
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function cleanup() {
  console.log('Authenticating...');
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: process.env.VITE_TEST_USER_EMAIL,
    password: process.env.VITE_TEST_USER_PASSWORD
  });

  if (authError) {
    console.error('Auth failed:', authError);
    return;
  }

  console.log('Cleaning up test data...\n');

  // Delete in reverse order of dependencies
  const tables = [
    { name: 'payments', pattern: 'PAY-TEST%' },
    { name: 'invoices', pattern: 'INV-TEST%' },
    { name: 'quotes', pattern: 'Q-TEST%' },
    { name: 'job_parts', pattern: 'J-S7%', column: 'job_id' },
    { name: 'parts_transactions', pattern: 'J-S7%', column: 'job_id' },
    { name: 'parts_master', pattern: 'STAGE7%', column: 'part_number' },
    { name: 'jobs', pattern: 'J-S7%', column: 'job_id' },
    { name: 'customers', pattern: 'C-S7%', column: 'customer_id' }
  ];

  for (const table of tables) {
    const column = table.column || table.name.replace(/s$/, '') + '_id';
    console.log(`Deleting from ${table.name} where ${column} LIKE '${table.pattern}'...`);

    const { error, count } = await supabase
      .from(table.name)
      .delete({ count: 'exact' })
      .ilike(column, table.pattern);

    if (error) {
      console.log(`  ❌ Error: ${error.message}`);
    } else {
      console.log(`  ✅ Deleted ${count || 0} rows`);
    }
  }

  console.log('\n✅ Cleanup complete!');
}

cleanup();
