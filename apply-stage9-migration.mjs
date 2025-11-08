// Apply Stage 9 Analytics Schema Migration
import fs from 'fs';

const projectRef = 'frbulthijdpkeqdphnxc';
const accessToken = 'sbp_c5209100dc615ba947fe30cb2828851cc7b43981';

const sql = fs.readFileSync('supabase/migrations/20250103010000_stage09_analytics_schema.sql', 'utf8');

console.log('Applying Stage 9 Analytics Schema Migration...\n');
console.log('This will create:');
console.log('- analytics_cache table');
console.log('- performance_goals table');
console.log('- report_templates table');
console.log('- job_metrics_view');
console.log('- parts_roi_view');
console.log('- monthly_revenue_summary view');
console.log('- Helper functions and indexes\n');

const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

async function applyMigration() {
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
      console.log('\n✅ Stage 9 Analytics Schema Migration applied successfully!');
      console.log('\nCreated:');
      console.log('  ✓ analytics_cache table with indexes');
      console.log('  ✓ performance_goals table with indexes');
      console.log('  ✓ report_templates table with indexes');
      console.log('  ✓ job_metrics_view (comprehensive job analytics)');
      console.log('  ✓ parts_roi_view (parts profitability)');
      console.log('  ✓ monthly_revenue_summary view');
      console.log('  ✓ RLS policies for all tables');
      console.log('  ✓ Helper functions (calculate_fcc_rate, cleanup_expired_cache)');
      console.log('  ✓ Performance indexes');

      console.log('\n📊 Analytics system ready!');
      console.log('\nYou can now:');
      console.log('  1. Query job_metrics_view for comprehensive job data');
      console.log('  2. Query parts_roi_view for parts profitability');
      console.log('  3. Query monthly_revenue_summary for monthly rollups');
      console.log('  4. Build frontend analytics dashboards');

      try {
        const json = JSON.parse(text);
        if (json && Object.keys(json).length > 0) {
          console.log('\nMigration response:');
          console.log(JSON.stringify(json, null, 2));
        }
      } catch (e) {
        // Response might be empty on success
      }
    } else {
      console.log('\n❌ Migration failed!');
      console.log('Response:', text);

      // Try to parse error details
      try {
        const errorJson = JSON.parse(text);
        if (errorJson.message) {
          console.log('\nError details:', errorJson.message);
        }
      } catch (e) {
        // Raw text is already shown
      }
    }

  } catch (error) {
    console.error('\n❌ Error applying migration:', error.message);
  }
}

applyMigration();
