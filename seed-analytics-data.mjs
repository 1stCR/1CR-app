import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.test' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

// Authenticate
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: process.env.VITE_TEST_USER_EMAIL,
  password: process.env.VITE_TEST_USER_PASSWORD
})

if (authError) {
  console.error('Auth error:', authError)
  process.exit(1)
}

console.log('Authenticated successfully')

// Get user ID
const userId = authData.user.id

// Create test customers
console.log('Creating test customers...')
const customers = []
for (let i = 1; i <= 10; i++) {
  const { data, error } = await supabase
    .from('customers')
    .insert({
      customer_id: `C-ANALYT-${String(i).padStart(3, '0')}`,
      customer_type: i % 3 === 0 ? 'Commercial' : 'Residential',
      first_name: i % 3 === 0 ? null : `Analytics`,
      last_name: i % 3 === 0 ? null : `Customer${i}`,
      business_name: i % 3 === 0 ? `Business ${i}` : null,
      phone: `307555${String(i).padStart(4, '0')}`,
      email: `analytics${i}@test.com`,
      address: `${i}00 Test St`,
      city: 'Mandan',
      state: 'ND',
      zip_code: '58554'
    })
    .select()
    .single()

  if (error) {
    console.error(`Error creating customer ${i}:`, error)
  } else {
    customers.push(data)
    console.log(`Created customer: ${data.customer_id}`)
  }
}

// Create test parts
console.log('\nCreating test parts...')
const parts = []
const partData = [
  { number: 'ANALYTICS-001', desc: 'Defrost Timer', category: 'Refrigeration', cost: 35.00, price: 42.00 },
  { number: 'ANALYTICS-002', desc: 'Compressor Relay', category: 'Refrigeration', cost: 28.50, price: 37.00 },
  { number: 'ANALYTICS-003', desc: 'Door Gasket', category: 'Refrigeration', cost: 45.00, price: 60.00 },
  { number: 'ANALYTICS-004', desc: 'Heating Element', category: 'Laundry', cost: 55.00, price: 75.00 },
  { number: 'ANALYTICS-005', desc: 'Water Inlet Valve', category: 'Laundry', cost: 32.00, price: 45.00 }
]

for (const part of partData) {
  const { data, error } = await supabase
    .from('parts_master')
    .insert({
      part_number: part.number,
      description: part.desc,
      category: part.category,
      cost: part.cost,
      price: part.price,
      quantity_on_hand: 10,
      reorder_point: 3,
      is_active: true
    })
    .select()
    .single()

  if (error) {
    console.error(`Error creating part ${part.number}:`, error)
  } else {
    parts.push(data)
    console.log(`Created part: ${data.part_number}`)
  }
}

// Create test jobs with various scenarios
console.log('\nCreating test jobs...')
const jobs = []
const jobScenarios = [
  // Regular completed jobs
  ...Array(15).fill().map((_, i) => ({
    isCallback: false,
    status: 'Complete',
    stage: 'Complete',
    appliance: 'Refrigerator',
    hasParts: i % 2 === 0
  })),
  // Callback jobs
  ...Array(3).fill().map((_, i) => ({
    isCallback: true,
    status: 'Complete',
    stage: 'Complete',
    appliance: 'Washer',
    callbackReason: i === 0 ? 'Parts Failure' : i === 1 ? 'Incomplete Repair' : 'Customer Request',
    hasParts: true
  })),
  // In-progress jobs
  ...Array(5).fill().map((_, i) => ({
    isCallback: false,
    status: 'In Progress',
    stage: i % 2 === 0 ? 'Diagnosis' : 'Repair',
    appliance: i % 2 === 0 ? 'Dryer' : 'Dishwasher',
    hasParts: false
  }))
]

for (let i = 0; i < jobScenarios.length; i++) {
  const scenario = jobScenarios[i]
  const customer = customers[i % customers.length]

  const jobId = `J-ANALYT-${String(i + 1).padStart(4, '0')}`

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      job_id: jobId,
      customer_id: customer.customer_id,
      appliance_type: scenario.appliance,
      appliance_brand: 'TestBrand',
      appliance_model: 'TEST-' + (i + 1),
      issue_description: `Test issue for analytics ${i + 1}`,
      job_stage: scenario.stage,
      current_status: scenario.status,
      is_callback: scenario.isCallback,
      callback_reason: scenario.callbackReason || null,
      callback_count: scenario.isCallback ? 1 : 0,
      priority: i % 3 === 0 ? 'High' : 'Normal',
      created_at: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString() // Spread over days
    })
    .select()
    .single()

  if (error) {
    console.error(`Error creating job ${jobId}:`, error)
    continue
  }

  jobs.push(data)
  console.log(`Created job: ${data.job_id} (${scenario.stage})`)

  // Add parts to jobs that need them
  if (scenario.hasParts && parts.length > 0) {
    const part = parts[i % parts.length]
    const quantity = Math.floor(Math.random() * 3) + 1

    const { error: partError } = await supabase
      .from('job_parts')
      .insert({
        job_id: data.id,
        part_id: part.id,
        quantity: quantity,
        cost_each: part.cost,
        price_each: part.price
      })

    if (partError) {
      console.error(`Error adding part to job ${jobId}:`, partError)
    } else {
      console.log(`  Added part ${part.part_number} (qty: ${quantity})`)
    }

    // Create parts transaction
    await supabase
      .from('parts_transactions')
      .insert({
        part_id: part.id,
        job_id: data.id,
        transaction_type: 'usage',
        quantity: -quantity,
        cost_per_unit: part.cost,
        notes: `Used in job ${jobId}`
      })
  }

  // Add tour activities for completed jobs
  if (scenario.status === 'Complete') {
    // Create a tour for this job
    const tourDate = new Date(Date.now() - (i * 24 * 60 * 60 * 1000))
    tourDate.setHours(0, 0, 0, 0)

    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .insert({
        tour_date: tourDate.toISOString().split('T')[0],
        technician_id: userId,
        status: 'Completed',
        start_time: new Date(tourDate.getTime() + 8 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(tourDate.getTime() + 16 * 60 * 60 * 1000).toISOString(),
        total_duration_minutes: 480,
        travel_time_minutes: 60,
        diagnosis_time_minutes: 90,
        repair_time_minutes: 180,
        research_time_minutes: 30,
        break_time_minutes: 60,
        jobs_completed: 1,
        jobs_worked: 1
      })
      .select()
      .single()

    if (!tourError && tour) {
      // Add tour activities
      await supabase
        .from('tour_activities')
        .insert([
          {
            tour_id: tour.id,
            job_id: data.id,
            activity_type: 'Travel',
            start_time: new Date(tourDate.getTime() + 8 * 60 * 60 * 1000).toISOString(),
            end_time: new Date(tourDate.getTime() + 8.5 * 60 * 60 * 1000).toISOString(),
            duration_minutes: 30
          },
          {
            tour_id: tour.id,
            job_id: data.id,
            activity_type: 'Diagnosis',
            start_time: new Date(tourDate.getTime() + 8.5 * 60 * 60 * 1000).toISOString(),
            end_time: new Date(tourDate.getTime() + 10 * 60 * 60 * 1000).toISOString(),
            duration_minutes: 90
          },
          {
            tour_id: tour.id,
            job_id: data.id,
            activity_type: 'Repair',
            start_time: new Date(tourDate.getTime() + 10 * 60 * 60 * 1000).toISOString(),
            end_time: new Date(tourDate.getTime() + 13 * 60 * 60 * 1000).toISOString(),
            duration_minutes: 180
          }
        ])
    }
  }
}

// Create invoices for completed jobs
console.log('\nCreating invoices...')
for (let i = 0; i < jobs.length; i++) {
  const job = jobs[i]
  if (job.job_stage !== 'Complete') continue

  const subtotal = 150 + (i * 25)
  const taxAmount = subtotal * 0.04
  const total = subtotal + taxAmount

  const { error } = await supabase
    .from('invoices')
    .insert({
      invoice_id: `INV-ANALYT-${String(i + 1).padStart(4, '0')}`,
      job_id: job.job_id,
      customer_id: job.customer_id,
      status: i % 4 === 0 ? 'Pending' : 'Paid',
      line_items: [{
        type: 'labor',
        description: 'Service Call',
        quantity: 1,
        unit_price: subtotal,
        subtotal: subtotal
      }],
      subtotal: subtotal,
      tax_rate: 4.00,
      tax_amount: taxAmount,
      total: total,
      amount_paid: i % 4 === 0 ? 0 : total,
      balance_due: i % 4 === 0 ? total : 0,
      invoice_date: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
      due_date: new Date(Date.now() - (i * 24 * 60 * 60 * 1000) + (14 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
      paid_date: i % 4 === 0 ? null : new Date(Date.now() - (i * 24 * 60 * 60 * 1000) + (7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
    })

  if (error) {
    console.error(`Error creating invoice for job ${job.job_id}:`, error)
  } else {
    console.log(`Created invoice for job: ${job.job_id}`)
  }
}

console.log('\n✅ Analytics test data seeded successfully!')
console.log(`Created ${customers.length} customers`)
console.log(`Created ${parts.length} parts`)
console.log(`Created ${jobs.length} jobs`)
console.log('Created invoices for completed jobs')
