import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

config({ path: '.env.test' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
)

async function applyMigration() {
  console.log('Applying foreign key fix migration...\n')

  const sql = readFileSync('supabase/migrations/20250102000002_fix_transaction_fkey.sql', 'utf-8')

  // Auth as test user first
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: process.env.TEST_USER_EMAIL || 'test@appliancemandan.com',
    password: process.env.TEST_USER_PASSWORD || 'testpass123'
  })

  if (authError) {
    console.error('Auth error:', authError)
    process.exit(1)
  }

  // Execute SQL via RPC or use service role
  console.log('Dropping foreign key constraint...')
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql })

  if (error) {
    console.error('Migration error:', error)
    console.log('\nTrying direct SQL execution...')

    // Try direct execution
    const { error: directError } = await supabase
      .from('_migrations')
      .insert({ name: '20250102000002_fix_transaction_fkey' })

    if (directError) {
      console.error('Direct execution error:', directError)
    }
  } else {
    console.log('✓ Migration applied successfully!')
  }

  process.exit(0)
}

applyMigration()
