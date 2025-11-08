import fs from 'fs';

const projectRef = 'frbulthijdpkeqdphnxc';
const accessToken = 'sbp_c5209100dc615ba947fe30cb2828851cc7b43981';

const sql = fs.readFileSync('check-jobs-schema.sql', 'utf8');

console.log('Checking jobs table schema...\n');

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

    const json = await response.json();
    console.log(JSON.stringify(json, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSchema();
