// Check parts_master table schema
import fs from 'fs';

const projectRef = 'frbulthijdpkeqdphnxc';
const accessToken = 'sbp_c5209100dc615ba947fe30cb2828851cc7b43981';

const sql = fs.readFileSync('check-parts-master-schema.sql', 'utf8');

console.log('Checking parts_master table schema...\n');

const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

async function checkSchema() {
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

    if (response.ok) {
      const results = await response.json();
      console.log('parts_master columns:');
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log('Failed:', await response.text());
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSchema();
