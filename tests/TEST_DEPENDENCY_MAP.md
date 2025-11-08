# Test Dependency Map

## Purpose
This document tracks dependencies between tests to ensure proper execution order when retesting individual failures.

---

## Dependency Rules

### Rule 1: Always Include Prerequisites
When retesting a failed test, **always run its prerequisite tests first** in the same command.

### Rule 2: Database State Dependencies
Tests that depend on specific database records must run after the tests that create those records.

### Rule 3: Sequential Data Creation
Tests that create sequentially-numbered records (C-0001, C-0002, J-0001, etc.) must run in order.

---

## Stage 1: Foundation Tests

**No internal dependencies** - All tests are independent.

```bash
# Any test can run individually
npx playwright test tests/stages/stage01_foundation.test.ts:LINE
```

---

## Stage 2: Customer Tests

### Test Structure
```
Line ~50:  Create first customer → Creates C-0001
Line ~100: Create second customer → Creates C-0002
Line ~150: Customer search → Depends on: C-0001, C-0002 existing
Line ~200: Customer edit → Depends on: C-0001 existing
Line ~250: Business customer → Independent
Line ~300: Multi-contact → Depends on: Business customer created
```

### Dependency Matrix

| Test | Line | Dependencies | Run Command |
|------|------|-------------|-------------|
| Create Customer C-0001 | ~50 | None | `...test.ts:50` |
| Create Customer C-0002 | ~100 | C-0001 (for ID sequence) | `...test.ts:50 ...test.ts:100` |
| Customer Search | ~150 | C-0001, C-0002 | `...test.ts:50 ...test.ts:100 ...test.ts:150` |
| Customer Edit | ~200 | C-0001 | `...test.ts:50 ...test.ts:200` |
| Business Customer | ~250 | None | `...test.ts:250` |
| Multi-contact | ~300 | Business customer | `...test.ts:250 ...test.ts:300` |

### Quick Reference Commands

```bash
# Test customer search (needs both customers)
npx playwright test tests/stages/stage02_customers.test.ts:50 tests/stages/stage02_customers.test.ts:100 tests/stages/stage02_customers.test.ts:150 --project=chromium --workers=1

# Test customer edit (needs C-0001)
npx playwright test tests/stages/stage02_customers.test.ts:50 tests/stages/stage02_customers.test.ts:200 --project=chromium --workers=1

# Test multi-contact (needs business customer)
npx playwright test tests/stages/stage02_customers.test.ts:250 tests/stages/stage02_customers.test.ts:300 --project=chromium --workers=1
```

---

## Stage 3: Jobs Tests

### Test Structure
```
Line ~80:  Create job for C-0001 → Creates J-0001
Line ~150: Create job for C-0002 → Creates J-0002
Line ~228: Job wizard navigation → Depends on: Customer exists
Line ~320: Job ID generation → Depends on: J-0001 exists
Line ~380: Job status update → Depends on: J-0001 exists
Line ~422: Status update UI → Depends on: J-0001 exists
Line ~450: Visit #2 display → Depends on: J-0001 with visits
Line ~500: Callback creation → Depends on: J-0001 exists
Line ~550: Job-customer link → Depends on: C-0001, J-0001 exist
```

### Dependency Matrix

| Test | Line | Dependencies | Run Command |
|------|------|-------------|-------------|
| Create Job J-0001 | ~80 | C-0001 | `stage02:50 stage03:80` |
| Create Job J-0002 | ~150 | C-0001, C-0002, J-0001 | `stage02:50,100 stage03:80,150` |
| Job Wizard Nav | ~228 | C-0001 | `stage02:50 stage03:228` |
| Job ID Generation | ~320 | C-0001, J-0001 | `stage02:50 stage03:80,320` |
| Status Update | ~380 | C-0001, J-0001 | `stage02:50 stage03:80,380` |
| Status Update UI | ~422 | C-0001, J-0001 | `stage02:50 stage03:80,422` |
| Visit Display | ~450 | C-0001, J-0001 + visits | `stage02:50 stage03:80,450` |
| Callback Creation | ~500 | C-0001, J-0001 | `stage02:50 stage03:80,500` |
| Job-Customer Link | ~550 | C-0001, J-0001 | `stage02:50 stage03:80,550` |

### Quick Reference Commands

```bash
# Test job wizard (needs customer)
npx playwright test tests/stages/stage02_customers.test.ts:50 tests/stages/stage03_jobs.test.ts:228 --project=chromium --workers=1

# Test job status update (needs customer + job)
npx playwright test tests/stages/stage02_customers.test.ts:50 tests/stages/stage03_jobs.test.ts:80 tests/stages/stage03_jobs.test.ts:422 --project=chromium --workers=1

# Test callback creation (needs customer + original job)
npx playwright test tests/stages/stage02_customers.test.ts:50 tests/stages/stage03_jobs.test.ts:80 tests/stages/stage03_jobs.test.ts:500 --project=chromium --workers=1
```

---

## Stage 4: Tour Tests

### Test Structure
```
Line ~50:  Start/stop tour → Independent
Line ~100: Activity tracking → Independent
Line ~150: Job time allocation → Depends on: J-0001, J-0002
Line ~200: Mileage calculation → Depends on: J-0001, J-0002
```

### Dependency Matrix

| Test | Line | Dependencies | Run Command |
|------|------|-------------|-------------|
| Start/Stop Tour | ~50 | None | `stage04:50` |
| Activity Tracking | ~100 | None | `stage04:100` |
| Job Time Allocation | ~150 | C-0001, C-0002, J-0001, J-0002 | `stage02:50,100 stage03:80,150 stage04:150` |
| Mileage Calc | ~200 | C-0001, C-0002, J-0001, J-0002 | `stage02:50,100 stage03:80,150 stage04:200` |

---

## Stage 5: Parts Tests

### Test Structure
```
Line ~50:  Part lookup → Independent (uses master data)
Line ~100: FIFO calculation → Independent (creates test inventory)
Line ~150: Stock tracking → Independent
Line ~200: Part usage on job → Depends on: J-0001
Line ~250: Auto-replenishment → Independent
```

### Dependency Matrix

| Test | Line | Dependencies | Run Command |
|------|------|-------------|-------------|
| Part Lookup | ~50 | None | `stage05:50` |
| FIFO Calc | ~100 | None | `stage05:100` |
| Stock Tracking | ~150 | None | `stage05:150` |
| Part Usage on Job | ~200 | C-0001, J-0001 | `stage02:50 stage03:80 stage05:200` |
| Auto-replenishment | ~250 | None | `stage05:250` |

---

## Common Patterns

### Pattern 1: Testing Job Features
**Any test involving a specific job needs:**
1. Customer creation test (stage02:~50)
2. Job creation test (stage03:~80)
3. Your actual test

```bash
npx playwright test \
  tests/stages/stage02_customers.test.ts:50 \
  tests/stages/stage03_jobs.test.ts:80 \
  tests/stages/stageXX_feature.test.ts:LINE \
  --project=chromium --workers=1
```

### Pattern 2: Testing Multi-Job Features
**Tests that need multiple jobs:**
1. First customer creation (stage02:~50)
2. Second customer creation (stage02:~100)
3. First job creation (stage03:~80)
4. Second job creation (stage03:~150)
5. Your actual test

```bash
npx playwright test \
  tests/stages/stage02_customers.test.ts:50 \
  tests/stages/stage02_customers.test.ts:100 \
  tests/stages/stage03_jobs.test.ts:80 \
  tests/stages/stage03_jobs.test.ts:150 \
  tests/stages/stageXX_feature.test.ts:LINE \
  --project=chromium --workers=1
```

### Pattern 3: Testing Customer Features
**Tests that need specific customers:**
1. Customer creation test(s)
2. Your actual test

```bash
npx playwright test \
  tests/stages/stage02_customers.test.ts:50 \
  tests/stages/stage02_customers.test.ts:200 \
  --project=chromium --workers=1
```

---

## Automated Dependency Resolution Helper

### Using the Helper Script

Create a helper script to automatically resolve dependencies:

```bash
# tests/helpers/run-with-deps.sh

# Usage: ./run-with-deps.sh stage03_jobs.test.ts 422
# Automatically runs dependencies based on the map

STAGE_FILE=$1
LINE=$2

case "$STAGE_FILE" in
  *stage03_jobs*)
    case "$LINE" in
      228|320|380|422|450|500|550)
        # Most job tests need C-0001 and J-0001
        npx playwright test \
          tests/stages/stage02_customers.test.ts:50 \
          tests/stages/stage03_jobs.test.ts:80 \
          tests/stages/$STAGE_FILE:$LINE \
          --project=chromium --workers=1
        ;;
      *)
        npx playwright test tests/stages/$STAGE_FILE:$LINE --project=chromium --workers=1
        ;;
    esac
    ;;
  *stage04_tour*)
    case "$LINE" in
      150|200)
        # Tour tests with jobs
        npx playwright test \
          tests/stages/stage02_customers.test.ts:50 \
          tests/stages/stage02_customers.test.ts:100 \
          tests/stages/stage03_jobs.test.ts:80 \
          tests/stages/stage03_jobs.test.ts:150 \
          tests/stages/$STAGE_FILE:$LINE \
          --project=chromium --workers=1
        ;;
      *)
        npx playwright test tests/stages/$STAGE_FILE:$LINE --project=chromium --workers=1
        ;;
    esac
    ;;
  *)
    # Default: run without dependencies
    npx playwright test tests/stages/$STAGE_FILE:$LINE --project=chromium --workers=1
    ;;
esac
```

---

## Quick Lookup Table

When a test fails, find it here to see what dependencies to include:

| Failed Test Location | Include These Tests | Command |
|---------------------|---------------------|---------|
| stage02:150 (search) | stage02:50,100 | `...stage02:50 ...stage02:100 ...stage02:150` |
| stage02:200 (edit) | stage02:50 | `...stage02:50 ...stage02:200` |
| stage02:300 (multi-contact) | stage02:250 | `...stage02:250 ...stage02:300` |
| stage03:228 (wizard) | stage02:50 | `...stage02:50 ...stage03:228` |
| stage03:320 (job ID) | stage02:50, stage03:80 | `...stage02:50 ...stage03:80 ...stage03:320` |
| stage03:422 (status UI) | stage02:50, stage03:80 | `...stage02:50 ...stage03:80 ...stage03:422` |
| stage03:450 (visits) | stage02:50, stage03:80 | `...stage02:50 ...stage03:80 ...stage03:450` |
| stage03:500 (callback) | stage02:50, stage03:80 | `...stage02:50 ...stage03:80 ...stage03:500` |
| stage04:150 (job time) | stage02:50,100, stage03:80,150 | `...stage02:50 ...stage02:100 ...stage03:80 ...stage03:150 ...stage04:150` |
| stage05:200 (part on job) | stage02:50, stage03:80 | `...stage02:50 ...stage03:80 ...stage05:200` |

---

## Test Isolation vs Dependencies

### When Tests Should Be Isolated (Use beforeEach setup):
- Unit-level tests
- Tests that don't care about specific IDs
- Tests that can use any valid data

### When Tests Should Have Dependencies (Use this map):
- Tests that verify specific ID sequences (C-0001, C-0002)
- Tests that verify relationships between specific records
- Integration tests that test full workflows

---

## Database State Management

### Option 1: Use Dependencies (Recommended for Integration Tests)
Run prerequisite tests that create the needed data.

**Pros:**
- Tests the full workflow
- Verifies data creation works
- More realistic integration testing

**Cons:**
- Longer execution time
- More complex dependency tracking

### Option 2: Use beforeEach Setup (Recommended for Unit Tests)
Create test data in `beforeEach` hooks.

**Pros:**
- Faster test execution
- True test isolation
- Simpler to run individual tests

**Cons:**
- Doesn't test data creation workflows
- May hide data creation bugs

---

## Examples from Current Test Failures

### Example 1: stage03_jobs.test.ts:422 fails
**Test:** Status update UI
**Error:** "Cannot update status on undefined job"

**Analysis:** This test expects J-0001 to exist

**Solution:**
```bash
npx playwright test \
  tests/stages/stage02_customers.test.ts:50 \
  tests/stages/stage03_jobs.test.ts:80 \
  tests/stages/stage03_jobs.test.ts:422 \
  --project=chromium --workers=1
```

### Example 2: stage03_jobs.test.ts:228 fails
**Test:** Job wizard navigation
**Error:** "Cannot create job - no customer selected"

**Analysis:** This test expects at least one customer to exist

**Solution:**
```bash
npx playwright test \
  tests/stages/stage02_customers.test.ts:50 \
  tests/stages/stage03_jobs.test.ts:228 \
  --project=chromium --workers=1
```

### Example 3: stage04_tour.test.ts:150 fails
**Test:** Job time allocation
**Error:** "Cannot allocate time to job J-0001 - not found"

**Analysis:** This test expects J-0001 and J-0002 to exist

**Solution:**
```bash
npx playwright test \
  tests/stages/stage02_customers.test.ts:50 \
  tests/stages/stage02_customers.test.ts:100 \
  tests/stages/stage03_jobs.test.ts:80 \
  tests/stages/stage03_jobs.test.ts:150 \
  tests/stages/stage04_tour.test.ts:150 \
  --project=chromium --workers=1
```

---

## Maintenance Guidelines

### When Adding New Tests:

1. **Document dependencies immediately** - Add the test to this map
2. **Use descriptive test names** - Make dependencies obvious
3. **Comment dependencies in test file** - Add `// DEPENDS ON: C-0001, J-0001`
4. **Update Quick Lookup Table** - Add entry if it has dependencies
5. **Test in isolation first** - Verify dependency list is complete

### When Modifying Existing Tests:

1. **Check downstream dependencies** - Other tests might depend on this one
2. **Update dependency map** - Keep this document current
3. **Verify dependent tests still pass** - Run full stage after changes

---

## Summary

✅ **Always check this map before retesting a failed test**
✅ **Include all prerequisite tests in the same command**
✅ **Use --workers=1 to ensure sequential execution**
✅ **Run full stage test after all fixes to verify no regressions**
