#!/usr/bin/env node

/**
 * Database Migration Script
 * Applies the missing columns migration to the jobs table
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check for environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('');
  console.error('Please set the following environment variables:');
  console.error('  VITE_SUPABASE_URL=your_supabase_url');
  console.error('  VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
  console.error('');
  console.error('Or create a .env file with these values.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🚀 Starting database migration...');
  console.log('');

  const migrations = [
    {
      name: 'Add priority column',
      sql: `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'Normal';`
    },
    {
      name: 'Add visit 1 tracking columns',
      sql: `ALTER TABLE jobs
        ADD COLUMN IF NOT EXISTS visit_1_date DATE,
        ADD COLUMN IF NOT EXISTS visit_1_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS visit_1_status VARCHAR(50);`
    },
    {
      name: 'Add visit 2 tracking columns',
      sql: `ALTER TABLE jobs
        ADD COLUMN IF NOT EXISTS visit_2_date DATE,
        ADD COLUMN IF NOT EXISTS visit_2_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS visit_2_status VARCHAR(50);`
    },
    {
      name: 'Add visit 3 tracking columns',
      sql: `ALTER TABLE jobs
        ADD COLUMN IF NOT EXISTS visit_3_date DATE,
        ADD COLUMN IF NOT EXISTS visit_3_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS visit_3_status VARCHAR(50);`
    },
    {
      name: 'Add visit 4 tracking columns',
      sql: `ALTER TABLE jobs
        ADD COLUMN IF NOT EXISTS visit_4_date DATE,
        ADD COLUMN IF NOT EXISTS visit_4_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS visit_4_status VARCHAR(50);`
    },
    {
      name: 'Add visit 5 tracking columns',
      sql: `ALTER TABLE jobs
        ADD COLUMN IF NOT EXISTS visit_5_date DATE,
        ADD COLUMN IF NOT EXISTS visit_5_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS visit_5_status VARCHAR(50);`
    },
    {
      name: 'Add job management flags',
      sql: `ALTER TABLE jobs
        ADD COLUMN IF NOT EXISTS primary_job BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS added_on_site BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS combined_invoice BOOLEAN DEFAULT false;`
    },
    {
      name: 'Add photo tracking columns',
      sql: `ALTER TABLE jobs
        ADD COLUMN IF NOT EXISTS photo_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS has_site_photos BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS has_diagnosis_photos BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS has_repair_photos BOOLEAN DEFAULT false;`
    }
  ];

  let successCount = 0;
  let failCount = 0;

  for (const migration of migrations) {
    try {
      console.log(`📝 ${migration.name}...`);
      const { data, error } = await supabase.rpc('exec_sql', { sql: migration.sql });

      if (error) {
        // Try direct query if RPC doesn't work
        const { error: directError } = await supabase.from('jobs').select('*').limit(0);

        if (directError && directError.message.includes('does not exist')) {
          console.error(`   ❌ Error: jobs table does not exist`);
          failCount++;
        } else {
          console.log(`   ⚠️  Note: Using anon key may not have ALTER TABLE permissions`);
          console.log(`   → You may need to run this in Supabase SQL Editor instead`);
        }
      } else {
        console.log(`   ✅ Success`);
        successCount++;
      }
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
      failCount++;
    }
  }

  console.log('');
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log('');

  if (failCount > 0) {
    console.log('⚠️  Some migrations failed.');
    console.log('');
    console.log('🔧 Alternative: Run migration in Supabase SQL Editor');
    console.log('   1. Open your Supabase Dashboard');
    console.log('   2. Go to SQL Editor');
    console.log('   3. Copy and paste the contents of:');
    console.log('      database-migration-add-missing-columns.sql');
    console.log('   4. Click Run');
    console.log('');
  }

  // Verify columns exist
  console.log('🔍 Verifying migration...');
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('priority, visit_1_status, primary_job, photo_count')
      .limit(0);

    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('   ❌ Verification failed - columns still missing');
        console.log('   → Please use the Supabase SQL Editor method above');
      } else {
        console.log('   ⚠️  Could not verify (permissions issue)');
      }
    } else {
      console.log('   ✅ Migration verified successfully!');
    }
  } catch (err) {
    console.log(`   ⚠️  Verification check failed: ${err.message}`);
  }

  console.log('');
  console.log('✨ Migration process complete!');
}

applyMigration().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
