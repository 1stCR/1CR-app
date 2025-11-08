// Check quotes foreign keys
import fs from 'fs';

const projectRef = 'frbulthijdpkeqdphnxc';
const accessToken = 'sbp_c5209100dc615ba947fe30cb2828851cc7b43981';

const sql = fs.readFileSync('check-quotes-fk.sql', 'utf8');

console.log('Checking quotes table foreign keys...\n');

const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

async function checkFK() {
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
      console.log('Quotes foreign keys:');
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log('Failed:', await response.text());
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkFK();
