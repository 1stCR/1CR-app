import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load test environment
config({ path: '.env.test' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

async function cleanTestParts() {
  console.log('Cleaning test parts from database...')

  // First, list all parts to see what we have
  const { data: allParts } = await supabase
    .from('parts_master')
    .select('part_number')

  console.log(`Found ${allParts?.length || 0} total parts in database`)
  if (allParts && allParts.length > 0) {
    console.log('Part numbers:', allParts.map(p => p.part_number).join(', '))
  }

  // Delete all parts (since this is a test database)
  const { data, error } = await supabase
    .from('parts_master')
    .delete()
    .neq('part_number', 'XXXNEVERXXX') // Delete everything
    .select()

  if (error) {
    console.error('Error deleting parts:', error)
    process.exit(1)
  }

  console.log(`✓ Deleted ${data?.length || 0} parts from database`)

  process.exit(0)
}

cleanTestParts()
