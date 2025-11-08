// Simple schema check
import fs from 'fs';

const projectRef = 'frbulthijdpkeqdphnxc';
const accessToken = 'sbp_c5209100dc615ba947fe30cb2828851cc7b43981';

const sql = fs.readFileSync('check-schema-simple.sql', 'utf8');

console.log('Checking customers table schema...\n');
console.log('SQL:', sql, '\n');

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

    console.log('Response status:', response.status);
    const text = await response.text();
    console.log('Raw response:', text);

    if (response.ok) {
      try {
        const json = JSON.parse(text);
        console.log('\nParsed JSON:');
        console.log(JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('Could not parse as JSON');
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSchema();
