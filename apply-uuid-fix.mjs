// Apply UUID to VARCHAR migration
import fs from 'fs';

const projectRef = 'frbulthijdpkeqdphnxc';
const accessToken = 'sbp_c5209100dc615ba947fe30cb2828851cc7b43981';

const sql = fs.readFileSync('fix-uuid-to-varchar.sql', 'utf8');

console.log('Converting UUID columns to VARCHAR...\n');
console.log('This will allow custom ID formats like "C-STAGE7-001"\n');

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

    const result = await response.text();
    console.log('Response status:', response.status);
    console.log('Response:', result);

    if (response.ok) {
      console.log('\n✅ Migration applied successfully!');
      console.log('ID columns converted from UUID to VARCHAR(20)');
    } else {
      console.log('\n❌ Migration failed. Response:', result);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

applyFix();
