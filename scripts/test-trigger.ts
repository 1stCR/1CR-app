import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load test environment
config({ path: '.env.test' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

async function testTrigger() {
  console.log('Testing database trigger...\n')

  // Authenticate first
  console.log('0. Authenticating...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: process.env.TEST_USER_EMAIL || 'test@appliancemandan.com',
    password: process.env.TEST_USER_PASSWORD || 'testpass123'
  })

  if (authError) {
    console.error('Error authenticating:', authError)
    process.exit(1)
  }
  console.log(`   Authenticated as: ${authData.user?.email}\n`)

  // Create a test part
  const testPartNumber = `TRIGGER-TEST-${Date.now()}`

  console.log(`1. Creating part: ${testPartNumber}`)
  const { data: part, error: partError } = await supabase
    .from('parts_master')
    .insert([{
      part_number: testPartNumber,
      description: 'Test Part for Trigger',
      category: 'Test',
      brand: 'Test',
      markup_percent: 20,
      in_stock: 0
    }])
    .select()
    .single()

  if (partError) {
    console.error('Error creating part:', partError)
    process.exit(1)
  }

  console.log(`   Initial stock: ${part.in_stock}`)

  // Add a purchase transaction
  console.log(`\n2. Adding Purchase transaction (qty: 10, cost: $25)`)
  const { data: transaction, error: txError } = await supabase
    .from('parts_transactions')
    .insert([{
      part_number: testPartNumber,
      qty: 10,
      type: 'Purchase',
      unit_cost: 25.00,
      total_cost: 250.00,
      created_by: 'test'
    }])
    .select()
    .single()

  if (txError) {
    console.error('Error creating transaction:', txError)
    process.exit(1)
  }

  console.log(`   Transaction created: ${transaction.id}`)

  // Wait a moment for trigger to execute
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Check the part's stock
  console.log(`\n3. Checking part stock after trigger...`)
  const { data: updatedPart, error: checkError } = await supabase
    .from('parts_master')
    .select('*')
    .eq('part_number', testPartNumber)
    .single()

  if (checkError) {
    console.error('Error checking part:', checkError)
    process.exit(1)
  }

  console.log(`   Stock after transaction: ${updatedPart.in_stock}`)
  console.log(`   Average cost: $${updatedPart.avg_cost}`)
  console.log(`   Sell price: $${updatedPart.sell_price}`)

  if (updatedPart.in_stock === 10) {
    console.log(`\n✓ SUCCESS: Trigger is working correctly!`)
  } else {
    console.log(`\n✗ FAILURE: Expected stock to be 10, but got ${updatedPart.in_stock}`)
  }

  // Cleanup
  console.log(`\n4. Cleaning up test data...`)
  await supabase.from('parts_transactions').delete().eq('part_number', testPartNumber)
  await supabase.from('parts_master').delete().eq('part_number', testPartNumber)
  console.log(`   Cleanup complete`)

  process.exit(0)
}

testTrigger()
