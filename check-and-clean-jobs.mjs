// Check and clean jobs table data
import fs from 'fs';

const projectRef = 'frbulthijdpkeqdphnxc';
const accessToken = 'sbp_c5209100dc615ba947fe30cb2828851cc7b43981';

console.log('Checking jobs table data...\n');

const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

async function checkAndClean() {
  try {
    // First check what's in the table
    const checkSql = fs.readFileSync('check-jobs-data.sql', 'utf8');

    const checkResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: checkSql
      })
    });

    if (checkResponse.ok) {
      const checkResult = await checkResponse.json();
      console.log('Current jobs table data:');
      console.log(JSON.stringify(checkResult, null, 2));

      if (checkResult.length > 0) {
        console.log('\n⚠️  Found existing jobs data. Deleting all rows...\n');

        // Delete all jobs
        const deleteSql = 'DELETE FROM jobs;';
        const deleteResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: deleteSql
          })
        });

        if (deleteResponse.ok) {
          console.log('✅ All jobs deleted successfully!');
        } else {
          console.log('❌ Failed to delete jobs');
          console.log(await deleteResponse.text());
        }
      } else {
        console.log('\n✅ Jobs table is empty, ready for migration!');
      }
    } else {
      console.log('Failed to check jobs:', await checkResponse.text());
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAndClean();
