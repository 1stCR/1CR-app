# Database Migration Required

## Problem Summary

Your application code expects **23 additional columns** in the `jobs` table that don't exist in your current Supabase database. This is causing test failures and will break user features.

## Why This Happened

The `database-schema.sql` file in your repo is the **original schema** - it's missing columns that were added later as the application evolved. Your Supabase database was likely created from this original schema.

## Missing Columns Impact

### Critical Missing Columns (Breaking User Features):

1. **`priority`** (VARCHAR) - Used throughout UI for job prioritization
   - JobList page has priority filter dropdown
   - Job cards display priority badges (Normal/High/Urgent)
   - JobDetail page shows priority with color coding

2. **Visit Tracking** (15 columns) - Multi-visit workflow
   - `visit_1_date`, `visit_1_type`, `visit_1_status`
   - `visit_2_date`, `visit_2_type`, `visit_2_status`
   - `visit_3_date`, `visit_3_type`, `visit_3_status`
   - `visit_4_date`, `visit_4_type`, `visit_4_status`
   - `visit_5_date`, `visit_5_type`, `visit_5_status`
   - **Impact**: Visit status badges, multi-visit tracking completely broken

3. **Job Management Flags** (3 columns)
   - `primary_job` (BOOLEAN)
   - `added_on_site` (BOOLEAN)
   - `combined_invoice` (BOOLEAN)

4. **Photo Tracking** (4 columns)
   - `photo_count` (INTEGER)
   - `has_site_photos` (BOOLEAN)
   - `has_diagnosis_photos` (BOOLEAN)
   - `has_repair_photos` (BOOLEAN)

## Current Test Status

```
❌ 6 tests failing due to schema mismatch
✅ 11 tests passing
```

**Failing tests:**
- 2 schema errors (`priority`, `visit_1_status` columns not found)
- 2 duplicate customer_id (race condition - separate issue)
- 1 job wizard timeout (UI issue - separate)
- 1 status update UI (separate issue)

## How to Fix

### Step 1: Run the Migration

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file: `database-migration-add-missing-columns.sql`
4. Copy and paste the entire contents into the SQL Editor
5. Click **Run**

### Step 2: Verify Migration

The migration script includes a verification query that will show all columns in the `jobs` table. You should see all 23 new columns.

### Step 3: Re-run Tests

After the migration:
```bash
npx playwright test tests/stages/stage03_jobs.test.ts --project=chromium --workers=1
```

**Expected result**: 2 more tests should pass (the schema error tests)

## Alternative: Update Database Schema File

After running the migration, you should update `database-schema.sql` to include these columns so it matches your actual database. This prevents future confusion.

## What Gets Added

### Priority Management
```sql
ALTER TABLE jobs ADD COLUMN priority VARCHAR(20) DEFAULT 'Normal';
```

### Visit Tracking (5 visits × 3 fields each)
```sql
ALTER TABLE jobs
ADD COLUMN visit_1_date DATE,
ADD COLUMN visit_1_type VARCHAR(50),
ADD COLUMN visit_1_status VARCHAR(50);
-- ... and visit_2 through visit_5
```

### Job Flags & Photo Tracking
```sql
ALTER TABLE jobs
ADD COLUMN primary_job BOOLEAN DEFAULT true,
ADD COLUMN added_on_site BOOLEAN DEFAULT false,
ADD COLUMN combined_invoice BOOLEAN DEFAULT false,
ADD COLUMN photo_count INTEGER DEFAULT 0,
ADD COLUMN has_site_photos BOOLEAN DEFAULT false,
ADD COLUMN has_diagnosis_photos BOOLEAN DEFAULT false,
ADD COLUMN has_repair_photos BOOLEAN DEFAULT false;
```

## Safe to Run

- Uses `IF NOT EXISTS` - won't error if columns already present
- Default values set for all new columns
- No data loss - only adds columns
- Reversible (can drop columns if needed)

## Remaining Test Issues (After Migration)

Once migration is complete, we still need to fix:

1. **Duplicate customer_id race condition** (2 tests)
   - Fix: Add unique constraint check or sequential ID generation lock

2. **Job wizard timeout** (1 test)
   - Fix: Investigate why wizard doesn't navigate after submit

3. **Status update UI** (1 test)
   - Fix: Check dialog visibility and interaction

**Target after migration**: 13/17 tests passing (76%)

## Questions?

If you need help running the migration or want to understand any of these changes, let me know!
