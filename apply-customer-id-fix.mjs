// Apply jobs.customer_id type fix
import fs from 'fs';

const projectRef = 'frbulthijdpkeqdphnxc';
const accessToken = 'sbp_c5209100dc615ba947fe30cb2828851cc7b43981';

const sql = fs.readFileSync('fix-jobs-customer-id.sql', 'utf8');

console.log('Applying jobs.customer_id type fix...\n');

const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

async function applyFix() {
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

    console.log('Response status:', response.status);
    const text = await response.text();

    if (response.ok) {
      console.log('✅ Migration applied successfully!');
      try {
        const json = JSON.parse(text);
        console.log('\nResponse:');
        console.log(JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('Raw response:', text);
      }
    } else {
      console.log('❌ Migration failed!');
      console.log('Response:', text);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

applyFix();
