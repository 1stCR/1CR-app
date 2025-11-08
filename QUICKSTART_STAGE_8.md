# Quick Start Guide: Running Stage 8

This guide shows you the **exact commands** to run Stage 8 on your machine.

---

## Prerequisites

Before starting, make sure you have:
- ✅ Docker Desktop installed and running (for local Supabase)
- ✅ Node.js installed
- ✅ This project cloned to your computer

---

## Step-by-Step Instructions

### Step 1: Open Terminal/Command Prompt

```bash
# Navigate to your project folder
cd C:\Users\Owner\Desktop\App Development\appliance-manager
```

### Step 2: Start Supabase

```bash
npx supabase start
```

**What this does:**
- Starts PostgreSQL database in Docker
- Starts Supabase Studio at http://localhost:54323
- Sets up authentication

**Expected output:**
```
Started supabase local development setup.

         API URL: http://localhost:54321
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
        Anon Key: eyJh...
Service Role Key: eyJh...
```

**If you see an error about Docker:**
1. Open Docker Desktop
2. Wait for it to fully start (whale icon in system tray)
3. Try the command again

---

### Step 3: Apply Stage 8 Database Migration

**Option A: Fresh Start (Recommended for testing)**

```bash
npx supabase db reset
```

**What this does:**
- Drops all existing tables
- Runs ALL migrations (Stages 1-8) in order
- Creates all tables fresh
- Seeds default data

**When to use:** First time setting up, or when you want to start clean.

---

**Option B: Keep Existing Data**

```bash
npx supabase migration up
```

**What this does:**
- Keeps your existing data
- Only runs new migrations (Stage 8)
- Adds new tables without touching old ones

**When to use:** You already have data in Stages 1-7 that you want to keep.

---

### Step 4: Verify Migration Succeeded

**Check in Supabase Studio:**

1. Open browser to http://localhost:54323
2. Click "Table Editor" in left sidebar
3. Look for these new tables:
   - `suppliers`
   - `storage_locations`
   - `parts_xref_groups`
   - `parts_orders`
   - `parts_order_items`
   - `shipments`
   - `parts_supplier_pricing`

**Or check via SQL:**

1. In Supabase Studio, click "SQL Editor"
2. Paste this query:
```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```
3. Click "Run"
4. You should see all 7 new Stage 8 tables in the list

---

### Step 5: Run Stage 8 Tests

```bash
npm run test:stage8
```

**What this does:**
- Runs all 20 Stage 8 tests
- Tests suppliers, purchase orders, shipments, stocking scores, etc.
- Shows you which features are working

**Expected output:**
```
Running 20 tests using 1 worker

✓  1 [chromium] Should create a supplier (1.2s)
✓  2 [chromium] Should fetch active suppliers (0.8s)
✓  3 [chromium] Should create storage location (0.7s)
... (more tests)

20 passed (45s)
```

**If tests fail:**
- Check that Supabase is running
- Check that migration completed successfully
- Check `.env.test` has correct credentials

---

### Step 6: (Optional) Run Only Critical Tests

```bash
npm run test:critical
```

**What this does:**
- Runs only tests marked with `@critical`
- Faster than running all tests
- Good for quick verification

---

### Step 7: View Test Results in UI

```bash
npm run test:ui
```

**What this does:**
- Opens Playwright Test UI in your browser
- You can see tests visually
- Watch tests run step-by-step
- Very helpful for debugging

---

## Common Issues & Solutions

### Issue 1: "Docker not found" or "Cannot connect to Docker"

**Solution:**
1. Open Docker Desktop
2. Wait until the whale icon appears in your system tray
3. Try `npx supabase start` again

---

### Issue 2: "Port 54321 already in use"

**Solution:**
```bash
# Stop Supabase
npx supabase stop

# Start again
npx supabase start
```

---

### Issue 3: "Migration failed" or "Table already exists"

**Solution:**
```bash
# Reset everything and start fresh
npx supabase db reset
```

---

### Issue 4: Tests fail with "Authentication error"

**Solution:**
1. Check your `.env.test` file exists
2. Make sure it has these variables:
```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_TEST_USER_EMAIL=test@example.com
VITE_TEST_USER_PASSWORD=testpassword123
```
3. Get the anon key from `npx supabase status`

---

### Issue 5: "Cannot find module" errors

**Solution:**
```bash
# Install dependencies
npm install
```

---

## What Each Command Does

### Database Commands

| Command | What It Does | When to Use |
|---------|--------------|-------------|
| `npx supabase start` | Starts local database | Every time you begin work |
| `npx supabase stop` | Stops local database | When you're done working |
| `npx supabase status` | Shows running services | Check if Supabase is running |
| `npx supabase db reset` | Wipes and recreates DB | Fresh start, or after major changes |
| `npx supabase migration up` | Applies new migrations | Add new features without losing data |

### Test Commands

| Command | What It Does | When to Use |
|---------|--------------|-------------|
| `npm run test:stage8` | Run all Stage 8 tests | Verify Stage 8 works |
| `npm run test:stage7` | Run all Stage 7 tests | Verify Stage 7 works |
| `npm run test:stage6` | Run all Stage 6 tests | Verify Stage 6 works |
| `npm run test:all` | Run ALL stage tests | Full system verification |
| `npm run test:critical` | Run only @critical tests | Quick smoke test |
| `npm run test:ui` | Open test UI | Visual debugging |
| `npm run test:debug` | Debug mode | Step through failing tests |

---

## Complete Example Workflow

Here's a complete session from start to finish:

```bash
# 1. Open terminal
cd C:\Users\Owner\Desktop\App Development\appliance-manager

# 2. Start Supabase
npx supabase start
# Wait for "Started supabase local development setup"

# 3. Apply all migrations (fresh start)
npx supabase db reset
# Confirm with 'y' when prompted

# 4. Verify tables created
# Open browser: http://localhost:54323
# Click "Table Editor" → See all tables

# 5. Run Stage 8 tests
npm run test:stage8
# Watch tests run

# 6. If all pass, you're good to go!

# 7. When done for the day
npx supabase stop
```

---

## Next Steps After Stage 8 Works

Once Stage 8 is running and tests pass:

1. **Try the purchase order workflow:**
   ```typescript
   // In your app code or console
   import { usePurchaseOrderStore } from './src/stores/purchaseOrderStore';

   const store = usePurchaseOrderStore.getState();
   const orderId = await store.createOrder('Test Supplier');
   console.log('Created order:', orderId);
   ```

2. **Calculate stocking scores:**
   ```typescript
   import { calculateStockingScore } from './src/utils/stockingScore';

   const score = await calculateStockingScore('PART-001');
   console.log('Stocking score:', score);
   ```

3. **Check the User Guide:**
   - Read `STAGE_8_USER_GUIDE.md` for detailed examples
   - Learn how to use each feature
   - See real-world workflows

4. **Build UI components** (optional):
   - Purchase order form
   - Auto-replenishment dashboard
   - Cross-reference group manager

---

## File Locations

### Where are the Stage 8 files?

**Database migration:**
```
supabase/migrations/20250102000006_create_advanced_parts_tables.sql
```

**Utility functions:**
```
src/utils/stockingScore.ts
src/utils/minStockCalculation.ts
```

**Store:**
```
src/stores/purchaseOrderStore.ts
```

**Tests:**
```
tests/stages/stage08_advanced_parts.test.ts
```

**Documentation:**
```
STAGE_8_USER_GUIDE.md  (detailed feature guide)
QUICKSTART_STAGE_8.md  (this file - commands only)
```

---

## Quick Reference

**Start working:**
```bash
npx supabase start
```

**Apply new changes:**
```bash
npx supabase db reset
```

**Run tests:**
```bash
npm run test:stage8
```

**Stop when done:**
```bash
npx supabase stop
```

---

That's it! Stage 8 should now be running on your machine. 🚀

If you have any issues, check the "Common Issues & Solutions" section above.
