# How to Apply the Database Migration

## Quick Start (Recommended Method)

### Step 1: Open Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your project

### Step 2: Open SQL Editor
1. In the left sidebar, click on **SQL Editor**
2. Click **New Query** button

### Step 3: Run the Migration
1. Open the file: `database-migration-add-missing-columns.sql`
2. Copy the **entire contents** of the file
3. Paste it into the SQL Editor
4. Click the **Run** button (or press Ctrl+Enter / Cmd+Enter)

### Step 4: Verify Success
You should see a success message. The migration will add 23 columns to the `jobs` table:

**Columns added:**
- `priority` - Job priority (Normal/High/Urgent)
- 15 visit tracking columns (visit_1_date through visit_5_date, etc.)
- 3 job management flags (primary_job, added_on_site, combined_invoice)
- 4 photo tracking columns (photo_count, has_site_photos, etc.)

## Verification Query

After running the migration, you can verify it worked by running this query:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'jobs'
  AND table_schema = 'public'
  AND column_name IN (
    'priority',
    'visit_1_status',
    'primary_job',
    'photo_count'
  )
ORDER BY column_name;
```

You should see 4 rows returned.

## Alternative Method (If you have service-role key)

If you have your Supabase service-role key (NOT the anon key), you can run the migration locally:

1. Create a `.env` file:
```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

2. Run the migration script:
```bash
node apply-migration.mjs
```

⚠️ **Note**: The anon key typically doesn't have ALTER TABLE permissions, so the SQL Editor method is recommended.

## What This Migration Does

### Adds Priority Management
```sql
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'Normal';
```

### Adds Multi-Visit Tracking
Allows tracking up to 5 visits per job:
- visit_1_date, visit_1_type, visit_1_status
- visit_2_date, visit_2_type, visit_2_status
- ... through visit_5

### Adds Job Flags
- `primary_job`: Is this the main job or a related job?
- `added_on_site`: Was this job added while on-site?
- `combined_invoice`: Should this be on a combined invoice?

### Adds Photo Tracking
- `photo_count`: Total number of photos
- `has_site_photos`: Photos of the site/location
- `has_diagnosis_photos`: Photos during diagnosis
- `has_repair_photos`: Photos during/after repair

## Safety Features

- Uses `IF NOT EXISTS` - safe to run multiple times
- Only adds columns - doesn't modify or delete data
- Sets appropriate defaults for all new columns
- No data loss risk

## After Migration

Once the migration is complete, run the tests to verify:

```bash
npm run test:stage3
```

Expected improvement:
- Before: 11/17 tests passing (65%)
- After: 13/17 tests passing (76%)

The 2 schema-related test failures should be resolved.

## Need Help?

If you encounter any issues:
1. Check that you selected the correct project
2. Ensure you have admin/owner permissions on the project
3. Try refreshing the Supabase dashboard
4. Check the SQL Editor error messages for details

---

**Ready to proceed?** Follow the steps above and let me know when the migration is complete!
