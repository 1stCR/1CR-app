// Verify database schema for Stage 7 tables
import fs from 'fs';

const projectRef = 'frbulthijdpkeqdphnxc';
const accessToken = 'sbp_c5209100dc615ba947fe30cb2828851cc7b43981';

const sql = fs.readFileSync('verify-schema.sql', 'utf8');

console.log('Verifying database schema...\n');

const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

async function verifySchema() {
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

    if (!response.ok) {
      console.log('Response status:', response.status);
      const text = await response.text();
      console.log('Response:', text);
      return;
    }

    const results = await response.json();

    console.log('='.repeat(80));
    console.log('SCHEMA VERIFICATION RESULTS');
    console.log('='.repeat(80));

    if (Array.isArray(results)) {
      results.forEach((result, index) => {
        console.log(`\n--- Query ${index + 1} Results ---`);
        if (result && result.length > 0) {
          console.table(result);
        } else {
          console.log('No results found for this query');
        }
      });
    } else {
      console.log('\nResults:');
      console.log(JSON.stringify(results, null, 2));
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Schema verification complete!');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

verifySchema();
