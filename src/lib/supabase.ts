import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://frbulthijdpkeqdphnxc.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyYnVsdGhpamRwa2VxZHBobnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NzUzMzMsImV4cCI6MjA3NzQ1MTMzM30.hDpF1znvh95ow1tXp-YDsEjPRd3D6ADWofWbOIk62DE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)