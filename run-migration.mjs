// Execute migration SQL via Supabase Management API
import fs from 'fs';

const projectRef = 'frbulthijdpkeqdphnxc';
const accessToken = 'sbp_c5209100dc615ba947fe30cb2828851cc7b43981';

// Read the migration SQL
const sql = fs.readFileSync('supabase/migrations/20250103000000_fix_stage7_schema_issues.sql', 'utf8');

console.log('Executing migration SQL via Supabase Management API...\n');
console.log('SQL to execute:');
console.log(sql);
console.log('\n---\n');

// Use Supabase Management API to execute SQL
const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

async function executeMigration() {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: sql
      })
    });

    const result = await response.text();
    console.log('Response status:', response.status);
    console.log('Response:', result);

    if (response.ok) {
      console.log('\n✅ Migration applied successfully!');
    } else {
      console.log('\n❌ Migration failed. You may need to apply it manually.');
      console.log('Please visit: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
    }
  } catch (error) {
    console.error('Error executing migration:', error.message);
    console.log('\nPlease apply the migration manually at:');
    console.log('https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
  }
}

executeMigration();
