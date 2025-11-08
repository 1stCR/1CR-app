# Efficient Testing Workflow

## Overview
This document outlines an efficient testing workflow that minimizes test execution time during fix/retest cycles.

**IMPORTANT:** Always check [TEST_DEPENDENCY_MAP.md](./TEST_DEPENDENCY_MAP.md) before retesting individual failures to identify prerequisite tests that must run together.

## Testing Strategy

### 1. Initial Full Test Run
Always start with a complete test run to establish baseline:
```bash
npx playwright test tests/stages/stage03_jobs.test.ts --project=chromium --workers=1
```

This provides:
- Complete picture of all failures
- Baseline metrics (X/Y tests passing)
- Error context for all issues

### 2. Iterative Fix-Retest Cycle
During the fixing phase, only rerun failed tests to save time:

```bash
# Run only specific failing tests
npx playwright test tests/stages/stage03_jobs.test.ts:228 --project=chromium --workers=1
npx playwright test tests/stages/stage03_jobs.test.ts:320 --project=chromium --workers=1
npx playwright test tests/stages/stage03_jobs.test.ts:422 --project=chromium --workers=1
npx playwright test tests/stages/stage03_jobs.test.ts:450 --project=chromium --workers=1
```

**Important Dependencies to Consider:**
- Tests that create test data (customers, jobs) may affect later tests
- Check `beforeAll` and `beforeEach` hooks for shared setup
- If a test depends on previous tests running first, include all dependent tests in the run

### 3. Dependency-Aware Testing (CRITICAL)
**Before retesting any failed test, check the test file for dependency comments or consult [TEST_DEPENDENCY_MAP.md](./TEST_DEPENDENCY_MAP.md)**

For tests with dependencies, **you MUST group them together**:

```bash
# WRONG - Job test without customer dependency
npx playwright test tests/stages/stage03_jobs.test.ts:422 --project=chromium --workers=1
# Result: FAILS because no customer exists

# CORRECT - Job test WITH customer dependency
npx playwright test tests/stages/stage02_customers.test.ts:50 tests/stages/stage03_jobs.test.ts:422 --project=chromium --workers=1
# Result: PASSES because customer is created first
```

**How to find dependencies:**
1. Look at the test file - dependency comments are above each test
2. Check [TEST_DEPENDENCY_MAP.md](./TEST_DEPENDENCY_MAP.md) - Quick lookup table
3. Look at the test code - see what data it uses (customer IDs, job IDs, etc.)

### 4. Final Verification Run
Once all individual tests pass, run the full suite to confirm:
```bash
npx playwright test tests/stages/stage03_jobs.test.ts --project=chromium --workers=1
```

This ensures:
- No regressions from fixes
- All tests pass together
- No interaction issues between tests
- Ready to move forward

### 5. Pre-Next-Stage Review (CRITICAL)
**Before moving to the next development stage**, review ALL previous stage test fixes and update the next stage's implementation guide to prevent repeating the same issues.

**Process:**
1. **Analyze all previous stage fixes** - Review test failures and fixes from ALL completed stages (not just current)
2. **Extract patterns and lessons** - Identify common pitfalls, best practices, and solutions
3. **Review next stage's MD file** - Read the implementation plan for the upcoming stage
4. **Update implementation guide** - Add warnings, code examples, and best practices to prevent known issues
5. **Document patterns** - Ensure successful patterns are highlighted for reuse

**Example: Preparing for Stage 4 after completing Stage 3**

Review these sources:
- `tests/stages/stage02_customers.test.ts` - What failed? What was fixed?
- `tests/stages/stage03_jobs.test.ts` - What failed? What was fixed?
- Git commit messages from fixes
- Test error logs and solutions

Extract lessons like:
- Empty string database validation issues
- Test timing and async issues
- Zustand store update patterns
- Form validation approaches

Then update `docs/STAGE_04_PARTS.md` with:
- "Common Pitfalls" section
- Code examples showing correct patterns
- Warnings about known issues
- Links to successful implementations from previous stages

**This step ensures each stage learns from ALL previous stages, creating cumulative improvement.**

## Playwright Test Targeting

### Run Specific Test by Line Number
```bash
npx playwright test file.test.ts:LINE_NUMBER
```

### Run Specific Test by Name
```bash
npx playwright test --grep "test name pattern"
```

### Run Multiple Specific Tests
```bash
npx playwright test file.test.ts:228 file.test.ts:320
```

### Run with Headed Mode (for debugging)
```bash
npx playwright test file.test.ts:228 --headed
```

## Workflow Summary

```
1. FULL TEST ──> Identify all failures
         │
         ├──> 4 failures found (lines 228, 320, 422, 450)
         │
2. FIX CYCLE ──> Check dependencies ──> Fix issue #1 ──> Retest with dependencies
         │              │                   │                        │
         │              └─ Look up in       │                        │
         │                 TEST_DEPENDENCY  │                        └──> Pass? Continue
         │                 _MAP.md          │
         │                                  │
         │       Check dependencies ──> Fix issue #2 ──> Retest with dependencies
         │              │                   │                        │
         │              └─ Found: needs     │                        │
         │                 customer test    │                        └──> Pass? Continue
         │                                  │
         │       Check dependencies ──> Fix issue #3 ──> Retest with dependencies
         │              │                   │                        │
         │              └─ Found: needs     │                        │
         │                 customer + job   │                        └──> Pass? Continue
         │                                  │
         │       Check dependencies ──> Fix issue #4 ──> Retest with dependencies
         │                                  │                        │
         │                                  │                        └──> Pass? Continue
         │
3. FINAL FULL TEST ──> Verify all fixes together
         │
         └──> 100% pass ──> DONE!
```

## Example: Stage 3 Jobs Testing

### Initial Run
```bash
npx playwright test tests/stages/stage03_jobs.test.ts --project=chromium --workers=1
```
Result: 13/17 passing (76%)

**Failures:**
1. Line 228: Job wizard navigation timeout
2. Line 320: Job ID generation timeout
3. Line 422: Status update UI text issue
4. Line 450: Visit #2 display issue

### Fix Cycle

#### Fix #1: Wizard Navigation
```bash
# 1. Check dependency comment in test file or TEST_DEPENDENCY_MAP.md
# Found: Line 228 depends on customer existing

# 2. Edit src/stores/jobStore.ts
# Make createJob return faster

# 3. Test with dependencies
npx playwright test \
  tests/stages/stage02_customers.test.ts:50 \
  tests/stages/stage03_jobs.test.ts:228 \
  --project=chromium --workers=1
```

#### Fix #2: Job ID Generation
```bash
# 1. Check dependency comment
# Found: Line 320 depends on customer existing

# 2. Same fix may resolve both timeout issues

# 3. Test with dependencies
npx playwright test \
  tests/stages/stage02_customers.test.ts:50 \
  tests/stages/stage03_jobs.test.ts:320 \
  --project=chromium --workers=1
```

#### Fix #3: Status Update UI
```bash
# 1. Check dependency comment
# Found: Line 422 depends on customer AND job existing

# 2. Investigate and fix UI component

# 3. Test with ALL dependencies
npx playwright test \
  tests/stages/stage02_customers.test.ts:50 \
  tests/stages/stage03_jobs.test.ts:80 \
  tests/stages/stage03_jobs.test.ts:422 \
  --project=chromium --workers=1
```

#### Fix #4: Visit Display
```bash
# 1. Check dependency comment
# Found: Line 450 depends on customer AND job with visits

# 2. Fix visit rendering

# 3. Test with ALL dependencies
npx playwright test \
  tests/stages/stage02_customers.test.ts:50 \
  tests/stages/stage03_jobs.test.ts:80 \
  tests/stages/stage03_jobs.test.ts:450 \
  --project=chromium --workers=1
```

### Final Verification
```bash
npx playwright test tests/stages/stage03_jobs.test.ts --project=chromium --workers=1
```
Expected: 17/17 passing (100%)

## Time Savings

**Old Approach:**
- Full test run: 2.5 minutes
- 4 fix attempts = 4 × 2.5 = 10 minutes
- Final run: 2.5 minutes
- **Total: 12.5 minutes**

**New Approach:**
- Full test run: 2.5 minutes
- 4 targeted tests: 4 × 20 seconds = 1.3 minutes
- Final run: 2.5 minutes
- **Total: 6.3 minutes**

**Savings: 50% reduction in testing time**

## Best Practices

1. **Always start with full run** - Don't assume you know what's broken
2. **Document line numbers** - Keep track of which tests are failing
3. **Test after each fix** - Don't batch fixes then test
4. **Watch for dependencies** - Some tests need others to run first
5. **Final full run is mandatory** - Never skip this step
6. **Use --headed for debugging** - Visual feedback helps troubleshoot
7. **Check test isolation** - Each test should be independent when possible

## Common Gotchas

### Shared State
If tests share database state, they may pass individually but fail together:
```bash
# This might pass
npx playwright test tests/stages/stage03_jobs.test.ts:422 --workers=1

# But this might fail
npx playwright test tests/stages/stage03_jobs.test.ts --workers=1
```

**Solution:** Always run final full test to catch these issues.

### Test Order Dependencies
Some tests expect a certain database state from previous tests:
```typescript
// Test 1 creates customer C-0001
test('Create customer', async () => { /* ... */ });

// Test 2 expects C-0001 to exist
test('Create job for customer', async () => {
  // Uses C-0001
});
```

**Solution:** Include all dependent tests in the targeted run.

### Flaky Tests
Tests that pass/fail inconsistently need investigation, not just retrying:
```bash
# If this sometimes passes and sometimes fails
npx playwright test tests/stages/stage03_jobs.test.ts:422 --workers=1
```

**Solution:** Fix the underlying timing/race condition issue.

## Integration with Development Workflow

```bash
# 1. Make code changes
vim src/stores/jobStore.ts

# 2. Run only affected tests
npx playwright test tests/stages/stage03_jobs.test.ts:228 --project=chromium --workers=1

# 3. Fix passes? Move to next issue
# Repeat until all issues resolved

# 4. Final verification before committing
npx playwright test tests/stages/stage03_jobs.test.ts --project=chromium --workers=1

# 5. All pass? Commit!
git add .
git commit -m "Fix: Job wizard navigation timeout and UI issues"
```

## Tools and Commands Reference

### Playwright Test Options
```bash
# Run specific test file
npx playwright test path/to/test.ts

# Run specific line number
npx playwright test path/to/test.ts:LINE

# Run with pattern matching
npx playwright test --grep "pattern"

# Run in headed mode (see browser)
npx playwright test --headed

# Run with debugging
npx playwright test --debug

# Run with specific timeout
npx playwright test --timeout=60000

# Run with specific project
npx playwright test --project=chromium

# Run with single worker (sequential)
npx playwright test --workers=1

# Show HTML report
npx playwright show-report
```

### Useful Combinations
```bash
# Debug a specific failing test
npx playwright test tests/stages/stage03_jobs.test.ts:422 --headed --debug

# Run failing tests with extended timeout
npx playwright test tests/stages/stage03_jobs.test.ts:228 --timeout=60000

# Run all critical tests only
npx playwright test --grep "@critical"
```

## Critical Checklist: Before Retesting Any Failed Test

**STOP! Before running any individual test, answer these questions:**

1. ✅ Have I checked the test file for dependency comments?
2. ✅ Have I consulted [TEST_DEPENDENCY_MAP.md](./TEST_DEPENDENCY_MAP.md)?
3. ✅ Do I know what data this test needs (customers, jobs, etc.)?
4. ✅ Have I included ALL prerequisite tests in my command?
5. ✅ Am I using `--workers=1` to ensure sequential execution?

**If you answered NO to any question, DO NOT run the test yet!**

### Quick Dependency Lookup

| If your test involves... | You need to include... |
|-------------------------|------------------------|
| Creating a job | Customer creation test (stage02:~50) |
| Updating a job | Customer + Job creation tests |
| Job wizard | Customer creation test |
| Multiple jobs | Multiple customer + job creation tests |
| Searching/filtering | Tests that create the data being searched |
| Editing a record | Test that creates that record |

## Conclusion

This workflow maximizes efficiency by:
- **Starting comprehensive** (full test run)
- **Checking dependencies** (before retesting)
- **Iterating quickly** (targeted test runs WITH dependencies)
- **Finishing thorough** (final full verification)

This approach reduces testing time by ~50% while maintaining confidence in the codebase.

**Remember: A test that fails due to missing dependencies gives you FALSE information. Always include dependencies!**
