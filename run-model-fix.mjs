// Execute fix for appliance_model column
import fs from 'fs';

const projectRef = 'frbulthijdpkeqdphnxc';
const accessToken = 'sbp_c5209100dc615ba947fe30cb2828851cc7b43981';

const sql = fs.readFileSync('fix-appliance-model.sql', 'utf8');

console.log('Adding appliance_model column...\n');

const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

async function executeFix() {
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
      console.log('\n✅ Fix applied successfully!');
    } else {
      console.log('\n❌ Fix failed.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

executeFix();
