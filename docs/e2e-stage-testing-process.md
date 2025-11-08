# E2E Stage Testing Process Documentation

**Version**: 1.0
**Date**: 2025-01-02
**Purpose**: Comprehensive documentation for E2E Stage Testing Skill creation
**Project**: Appliance Manager - Multi-Stage Development with E2E Testing

---

## Overview

This document defines the complete E2E Stage Testing process used in the Appliance Manager project. It is designed to be converted into a reusable Claude Skill that can be applied to future multi-stage projects.

---

## Process Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Stage N Development Complete                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ SKILL ACTIVATED: E2E Stage Testing                          │
│ Prompt: "Stage N is complete, ready for testing"            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Pre-Test Analysis                                  │
│ ├─ Read stage specification (stageN_*.claude.md)            │
│ ├─ Review testing history (previous stage results)          │
│ ├─ Analyze amendments/recommendations for current stage     │
│ └─ Identify potential issues based on patterns              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: Test Plan Creation                                 │
│ ├─ Create comprehensive test scenarios                      │
│ ├─ Map test dependencies (which tests depend on others)     │
│ ├─ Define critical vs non-critical tests                    │
│ ├─ Create test data requirements                            │
│ └─ Document expected behavior                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 3: Initial Full Test Run                              │
│ ├─ Run ALL tests in stage                                   │
│ ├─ Record pass/fail for each test                           │
│ ├─ Capture error messages and logs                          │
│ └─ Calculate initial success rate                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 4: Failure Analysis & Iteration                       │
│ ┌─────────────────────────────────┐                         │
│ │ For Each Failed Test:           │                         │
│ │ ├─ Analyze error message        │                         │
│ │ ├─ Check test dependencies      │                         │
│ │ ├─ Identify root cause:         │                         │
│ │ │  ├─ Production bug             │                         │
│ │ │  ├─ Test environment issue     │                         │
│ │ │  ├─ Transaction isolation      │                         │
│ │ │  ├─ Race condition             │                         │
│ │ │  ├─ Bad test logic             │                         │
│ │ │  └─ Infrastructure problem     │                         │
│ │ └─ Determine fix strategy        │                         │
│ └─────────────────────────────────┘                         │
│                       │                                       │
│                       ▼                                       │
│ ┌─────────────────────────────────┐                         │
│ │ Implement Fixes                 │                         │
│ │ (Production bugs only)          │                         │
│ └─────────────────────────────────┘                         │
│                       │                                       │
│                       ▼                                       │
│ ┌─────────────────────────────────┐                         │
│ │ Re-run Failed Tests + Deps      │                         │
│ │ (Not full suite)                │                         │
│ └─────────────────────────────────┘                         │
│                       │                                       │
│                       ▼                                       │
│            ┌─────────────────────┐                           │
│            │ Tests Pass?         │                           │
│            └──────┬──────────────┘                           │
│                   │                                           │
│         ┌─────────┴──────────┐                               │
│         ▼                    ▼                                │
│       YES                   NO                                │
│         │                    │                                │
│         │              ┌─────┴─────────┐                     │
│         │              │ More fixes?   │                     │
│         │              └─────┬─────────┘                     │
│         │                    │                                │
│         │          ┌─────────┴──────────┐                    │
│         │          ▼                    ▼                     │
│         │        YES                   NO                     │
│         │          │                    │                     │
│         │          └──► Loop back       │                     │
│         │                               │                     │
│         └───────────────────────────────┘                     │
│                       │                                       │
└───────────────────────┼───────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 5: Improvement Assessment                             │
│ ├─ Document what was fixed                                  │
│ ├─ Record remaining failures                                │
│ ├─ Classify failures (bug vs test issue vs acceptable)      │
│ └─ Decide: Continue fixing or accept current state?         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 6: Final Verification                                 │
│ ├─ Run FULL test suite one final time                       │
│ ├─ Confirm final success rate                               │
│ ├─ Verify no regressions in previously passing tests        │
│ └─ Record final results                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 7: Documentation & Next Stage Prep                    │
│ ├─ Record failure analysis in docs/testing-history.md       │
│ ├─ Update docs/testing-limitations.md with new patterns     │
│ ├─ Analyze next stage spec for preventable issues           │
│ ├─ Create/update docs/stageN+1-amendments.md                │
│ └─ Document lessons learned                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ SKILL PAUSES: User builds next stage                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase Details

### Phase 1: Pre-Test Analysis

**Objective**: Understand what's being tested and identify potential issues before running tests.

**Actions**:
1. Read the stage specification file (`claude.md/stageN_*.claude.md`)
2. Review previous stage test results and failure patterns
3. Check for amendments file (`docs/stageN-amendments.md`)
4. Check testing limitations document (`docs/testing-limitations.md`)
5. Identify high-risk areas based on:
   - External dependencies (APIs, databases)
   - Async operations
   - Complex state management
   - Multi-client interactions (backend + frontend)
   - Foreign key constraints
   - Transaction isolation scenarios

**Outputs**:
- Understanding of stage scope and features
- List of potential risk areas
- Reference to any pre-emptive fixes already documented

**Time**: 5-10 minutes

---

### Phase 2: Test Plan Creation

**Objective**: Create comprehensive E2E test coverage for the stage.

**Test Plan Structure**:

```typescript
// Example test plan structure
export const testPlan = {
  stage: 5,
  name: "Parts Inventory Core",
  testGroups: [
    {
      name: "Part CRUD Operations",
      critical: true,
      tests: [
        {
          name: "Should create a new part",
          dependencies: [],
          approach: "frontend-only",  // All UI actions
          riskLevel: "low"
        },
        {
          name: "Should update part details",
          dependencies: ["Should create a new part"],
          approach: "frontend-only",
          riskLevel: "low"
        }
      ]
    },
    {
      name: "Inventory Transactions",
      critical: true,
      tests: [
        {
          name: "Should add inventory via Purchase",
          dependencies: ["Should create a new part"],
          approach: "backend-only",  // All store operations
          riskLevel: "medium"
        },
        {
          name: "Should calculate FIFO cost",
          dependencies: ["Should add inventory via Purchase"],
          approach: "backend-only",
          riskLevel: "high"
        }
      ]
    },
    {
      name: "Integration Tests",
      critical: true,
      tests: [
        {
          name: "Should add part to job from stock",
          dependencies: [
            "Should create a new part",
            "Should add inventory via Purchase",
            "Should create a job"
          ],
          approach: "mixed",  // ⚠️ HIGH RISK
          riskLevel: "critical",
          notes: "Mixed approach - likely to fail due to transaction isolation"
        }
      ]
    }
  ]
};
```

**Test Categorization**:

1. **Critical Tests** (`@critical` tag):
   - Core functionality that must work
   - Tests that other tests depend on
   - User-facing workflows

2. **Non-Critical Tests**:
   - Edge cases
   - UI cosmetic features
   - Nice-to-have functionality

3. **Test Approaches**:
   - `frontend-only`: All actions through page interactions
   - `backend-only`: All actions through store/API calls
   - `mixed`: ⚠️ Backend setup + Frontend interaction (HIGH RISK)

4. **Test Dependencies**:
   - Explicit list of which tests must pass before this test
   - Used to determine re-run strategy

**Test Scenarios to Cover**:
- Happy path (everything works)
- Error handling (invalid inputs, missing data)
- Edge cases (empty lists, zero values, nulls)
- Concurrent operations (multiple users/actions)
- State persistence (refresh page, navigate away and back)
- Data validation (form validation, business rules)
- UI feedback (loading states, error messages, success notifications)

**Outputs**:
- Complete test file (`tests/stages/stageN_*.test.ts`)
- Test plan document
- Dependency map

**Time**: 30-60 minutes

---

### Phase 3: Initial Full Test Run

**Objective**: Get baseline metrics and identify all failures.

**Actions**:
1. Ensure dev server is running (`npm run dev`)
2. Run full test suite: `npx playwright test tests/stages/stageN_*.test.ts --project=chromium --workers=1`
3. Record results:
   - Total tests
   - Passed tests
   - Failed tests
   - Success rate %

4. For each failure, capture:
   - Test name
   - Error message
   - Stack trace
   - Browser console errors (if applicable)
   - Screenshots (Playwright auto-captures on failure)

**Example Output**:
```
Stage 5: Parts Inventory Core - Initial Run
Date: 2025-01-02
Total: 20 tests
Passed: 17 tests (85%)
Failed: 3 tests (15%)

Failures:
1. "Should show stats on parts list page"
   - Error: Test timeout in beforeEach (30000ms)
   - Location: Cleanup function

2. "Should assign part to storage location"
   - Error: Test timeout in beforeEach (30000ms)
   - Location: Cleanup function

3. "@critical Should add part to job from stock"
   - Error: FK constraint violation
   - Code: 23503
   - Details: Key not present in parts_master
```

**Outputs**:
- Initial test results
- Failure details for analysis
- Screenshots/logs for debugging

**Time**: 5-15 minutes (depends on test count)

---

### Phase 4: Failure Analysis & Iteration

**Objective**: Fix production bugs; document or work around test environment issues.

**Failure Classification**:

```typescript
enum FailureType {
  PRODUCTION_BUG = "production_bug",              // Fix immediately
  TEST_ENVIRONMENT = "test_environment",           // Document, may workaround
  TRANSACTION_ISOLATION = "transaction_isolation", // Redesign test
  RACE_CONDITION = "race_condition",              // Add waits
  BAD_TEST_LOGIC = "bad_test_logic",              // Fix test
  INFRASTRUCTURE = "infrastructure",              // External issue
  ACCEPTABLE = "acceptable"                       // Document and move on
}
```

**Analysis Process**:

1. **Read Error Message Carefully**
   - Exact error code/message
   - Where it occurred (beforeEach, test body, afterEach)
   - Stack trace location

2. **Check Test Dependencies**
   - Did a prerequisite test fail?
   - Are multiple tests failing with same root cause?
   - Is this a cascade failure?

3. **Identify Root Cause**

   **Production Bug Indicators**:
   - ✅ Error occurs in application code (not test setup)
   - ✅ Error is reproducible in manual testing
   - ✅ Error breaks actual user workflow
   - ✅ Error relates to business logic

   **Test Environment Issue Indicators**:
   - ✅ Error occurs in beforeEach/afterEach
   - ✅ Error relates to test data cleanup
   - ✅ Manual testing works fine
   - ✅ Error is about transaction visibility

   **Transaction Isolation Indicators**:
   - ✅ Test mixes backend setup + frontend action
   - ✅ Error: "Key not present" or 406/400 status
   - ✅ Backend can query data, frontend cannot
   - ✅ Similar to documented Stage 5 issue

4. **Determine Fix Strategy**

   **For Production Bugs**:
   ```
   FIX CODE → Re-run failed test + dependencies → Verify fix
   ```

   **For Test Environment Issues**:
   ```
   DOCUMENT → Workaround OR Accept → Continue
   ```

   **For Transaction Isolation**:
   ```
   REDESIGN TEST → Use consistent client context → Re-run
   ```

**Iteration Strategy**:

```typescript
// Pseudo-code for iteration logic
while (hasFailures && canImprove) {
  const failures = analyzeFailures(testResults);

  for (const failure of failures) {
    const rootCause = identifyRootCause(failure);

    if (rootCause === FailureType.PRODUCTION_BUG) {
      fixProductionCode(failure);
      const deps = getTestDependencies(failure.testName);
      rerunTests([failure.testName, ...deps]);
    }
    else if (rootCause === FailureType.TRANSACTION_ISOLATION) {
      redesignTest(failure, 'consistent-client-context');
      rerunTests([failure.testName]);
    }
    else if (rootCause === FailureType.TEST_ENVIRONMENT) {
      documentLimitation(failure);
      if (isWorkaroundPossible(failure)) {
        implementWorkaround(failure);
        rerunTests([failure.testName]);
      } else {
        markAsAcceptable(failure, "Test environment limitation");
      }
    }
  }

  // Avoid infinite loops
  if (noImprovementThisIteration()) break;
}
```

**Re-Run Strategy**:

**DON'T** re-run full suite after every fix. **DO** run targeted tests:

```bash
# Run only failed test + dependencies
npx playwright test tests/stages/stage05_parts_inventory.test.ts:523 \
  tests/stages/stage05_parts_inventory.test.ts:100 \
  tests/stages/stage05_parts_inventory.test.ts:150 \
  --project=chromium --workers=1
```

**Outputs**:
- Fixed production bugs (code changes)
- Updated tests (redesigned for consistency)
- Documentation of limitations
- Iteration results log

**Time**: 1-4 hours (varies by failure count and complexity)

---

### Phase 5: Improvement Assessment

**Objective**: Decide whether to continue fixing or accept current state.

**Decision Criteria**:

```typescript
interface ImprovementAssessment {
  currentSuccessRate: number;
  previousSuccessRate: number;
  improvement: number;
  remainingFailures: Array<{
    testName: string;
    classification: FailureType;
    impact: 'critical' | 'high' | 'medium' | 'low';
    effortToFix: 'low' | 'medium' | 'high' | 'unknown';
  }>;
}

function shouldContinueFixing(assessment: ImprovementAssessment): boolean {
  // Continue if:
  // 1. Any critical failures remain that are production bugs
  if (assessment.remainingFailures.some(f =>
    f.impact === 'critical' &&
    f.classification === FailureType.PRODUCTION_BUG
  )) {
    return true;
  }

  // 2. Success rate < 80% and low-effort fixes available
  if (assessment.currentSuccessRate < 80 &&
      assessment.remainingFailures.some(f => f.effortToFix === 'low')) {
    return true;
  }

  // 3. Made significant improvement last iteration (> 10%)
  if (assessment.improvement > 10) {
    return true;
  }

  // Otherwise, accept current state
  return false;
}
```

**Document Remaining Failures**:

For each remaining failure, document:
- Test name and purpose
- Why it's failing
- Why we're not fixing it
- Impact on users (none, low, medium, high)
- Workarounds (if any)
- Future improvements (if planned)

**Example**:
```markdown
## Remaining Failures - Stage 5

### "Should add part to job from stock" (1 failure)
- **Classification**: Transaction Isolation (Test Environment)
- **Impact**: None - Production functionality works correctly
- **Reason Not Fixed**: Would require redesigning test framework to use consistent client context
- **Evidence Not a Bug**:
  - Manual testing passes
  - Other tests with consistent contexts pass
  - No user reports of similar issues
- **Workaround**: Test uses direct database insert instead of UI flow
- **Future**: Consider mocking Supabase client in tests
- **Documented In**: `docs/testing-limitations.md`

### "Should show stats on parts list page" (2 failures)
- **Classification**: Test Environment (Infrastructure)
- **Impact**: None - Cleanup timeout, doesn't affect test validity
- **Reason Not Fixed**: beforeEach cleanup timing out due to test data volume
- **Workaround**: Tests pass when run individually
- **Future**: Implement per-table cleanup timeouts
```

**Outputs**:
- Decision: Continue or Accept
- Documentation of remaining failures
- Justification for acceptance (if applicable)

**Time**: 15-30 minutes

---

### Phase 6: Final Verification

**Objective**: Confirm final state and ensure no regressions.

**Actions**:
1. Run FULL test suite one final time:
   ```bash
   npx playwright test tests/stages/stageN_*.test.ts --project=chromium --workers=1
   ```

2. Verify results:
   - Success rate matches expectation
   - Previously passing tests still pass (no regressions)
   - Fixed tests now pass
   - Accepted failures still fail as expected

3. Record final metrics:
   ```
   Stage N: [Name] - Final Results
   Date: YYYY-MM-DD
   Total: X tests
   Passed: Y tests (Z%)
   Failed: N tests (M%)

   Improvements from initial run:
   - Fixed: [list of fixed tests]
   - Documented: [list of accepted failures]
   - Success rate improved: X% → Y% (+Z%)
   ```

**Outputs**:
- Final test results
- Confirmation of no regressions
- Final metrics

**Time**: 5-15 minutes

---

### Phase 7: Documentation & Next Stage Prep

**Objective**: Record lessons learned and prepare for next stage.

**Documentation Tasks**:

1. **Update Testing History** (`docs/testing-history.md`):
   ```markdown
   ## Stage N: [Name]

   **Date**: YYYY-MM-DD
   **Initial Success Rate**: X%
   **Final Success Rate**: Y%
   **Iterations**: N
   **Time to Complete**: ~X hours

   ### What We Built:
   - Feature 1
   - Feature 2
   - Feature 3

   ### Test Results:
   - Total: 20 tests
   - Passed: 18 tests (90%)
   - Failed: 2 tests (10%)

   ### Issues Encountered:
   1. **Issue Name**
      - Type: Production Bug / Test Environment
      - Resolution: Fixed / Documented / Accepted
      - Time: ~X hours

   ### Lessons Learned:
   - Lesson 1
   - Lesson 2

   ### Patterns Identified:
   - Pattern 1: Description
   - Pattern 2: Description
   ```

2. **Update Testing Limitations** (`docs/testing-limitations.md`):
   - Add new patterns discovered
   - Update existing patterns with new examples
   - Add workarounds that worked

3. **Analyze Next Stage** (`claude.md/stageN+1_*.claude.md`):
   - Read next stage specification
   - Identify potential issues based on current stage learnings
   - Look for:
     - Similar patterns to current stage
     - External dependencies
     - Async operations
     - Database relationships
     - Multi-client scenarios

4. **Create Pre-emptive Recommendations** (`docs/stageN+1-amendments.md`):
   ```markdown
   # Stage N+1: [Name] - Pre-emptive Recommendations

   Based on Stage N testing, recommend:

   ## Amendment 1: [Title]
   **Priority**: Critical/High/Medium/Low
   **Issue Prevented**: [Description]
   **Implementation**: [Code/config changes]
   **Reason**: [Why this prevents issues]
   ```

5. **Update Test Process** (this document):
   - Add new patterns to watch for
   - Update decision criteria if needed
   - Document new workarounds

**Outputs**:
- Updated `docs/testing-history.md`
- Updated `docs/testing-limitations.md`
- Created `docs/stageN+1-amendments.md`
- Stage N marked complete

**Time**: 30-60 minutes

---

## Key Principles

### 1. Consistent Client Contexts

**CRITICAL**: E2E tests MUST use consistent client contexts.

```typescript
// ❌ WRONG - Mixed context
await aiStore.lookupPartCrossReferences('TEST-001');  // Backend
await page.goto(`/parts/TEST-001`);  // Frontend
await expect(page.locator('text=OEM')).toBeVisible(); // FAILS

// ✅ RIGHT - Consistent context (Backend only)
const xrefs = await aiStore.lookupPartCrossReferences('TEST-001');
expect(xrefs.length).toBeGreaterThan(0);

// ✅ RIGHT - Consistent context (Frontend only)
await page.goto('/parts/new');
await page.fill('[name="part_number"]', 'TEST-001');
await page.click('button:has-text("Analyze")');  // Triggers backend internally
await expect(page.locator('text=OEM')).toBeVisible();  // Works
```

**Why**: Backend Supabase client and frontend browser client operate in different transaction contexts. Data created by one may not be visible to the other.

### 2. Test Independence

Each test should be fully independent:
- Use unique test data (timestamp-based IDs)
- Clean up after itself
- Not depend on order of execution
- Reset state in beforeEach

```typescript
test.beforeEach(async ({ page }) => {
  // Clean slate for every test
  await cleanupTestData();
  await page.goto('/');
});

test('Should create customer', async ({ page }) => {
  const uniqueId = `TEST-${Date.now()}`;
  // ... test with uniqueId ...
});
```

### 3. Explicit Waits

Don't rely on implicit waits. Be explicit:

```typescript
// ❌ WRONG
await supabase.from('parts').insert(data);
await page.goto('/parts');
await expect(page.locator(`text=${data.part_number}`)).toBeVisible(); // May fail

// ✅ RIGHT
await supabase.from('parts').insert(data);
await page.waitForTimeout(2000);  // Explicit wait
await page.goto('/parts');
await page.waitForSelector(`text=${data.part_number}`);  // Wait for element
await expect(page.locator(`text=${data.part_number}`)).toBeVisible();
```

### 4. Specific Locators

Use the most specific locator possible:

```typescript
// ❌ WRONG - Ambiguous
await page.click('text=Delete');  // Which delete button?

// ✅ RIGHT - Specific
await page.click('[data-testid="delete-customer-123"]');
await page.click('role=button[name="Delete Customer TEST-001"]');
await page.locator('table').locator('tr', { hasText: 'TEST-001' }).locator('button', { hasText: 'Delete' }).click();
```

### 5. Error Handling

Test both success and failure cases:

```typescript
test('Should create customer with valid data', async () => {
  // Happy path
});

test('Should show error for duplicate customer', async () => {
  // Error handling
  await expect(page.locator('.error')).toContainText('already exists');
});

test('Should validate required fields', async () => {
  // Validation
  await page.click('button:has-text("Save")');
  await expect(page.locator('.error')).toContainText('required');
});
```

### 6. Test Classification

Tag tests appropriately:

```typescript
test('@critical Should complete checkout flow', async () => {
  // Critical path - must work
});

test('Should display helpful error messages', async () => {
  // Non-critical - nice to have
});
```

### 7. Mocking External Dependencies

Mock external APIs/services when possible:

```typescript
// Mock Claude API in tests
test.beforeEach(async ({ page }) => {
  await page.route('**/api.anthropic.com/**', route => {
    route.fulfill({
      status: 200,
      body: JSON.stringify(mockAIResponse)
    });
  });
});
```

---

## Common Patterns & Solutions

### Pattern 1: Transaction Isolation

**Symptom**: Backend creates data, frontend can't see it
**Solution**: Use consistent client context (all backend OR all frontend)
**Reference**: `docs/testing-limitations.md`

### Pattern 2: beforeEach Timeout

**Symptom**: Test times out during cleanup
**Solution**: Per-table timeouts, continue on error
```typescript
async function cleanupTestData() {
  for (const table of tables) {
    try {
      await supabase.from(table).delete()
        .gte('created_at', testStartTime)
        .abortSignal(AbortSignal.timeout(5000));
    } catch (err) {
      console.warn(`Cleanup timeout for ${table}, continuing...`);
    }
  }
}
```

### Pattern 3: Foreign Key Violations

**Symptom**: FK constraint error during test
**Solution**: Use DEFERRABLE INITIALLY DEFERRED constraints
```sql
CREATE TABLE child (
  parent_id UUID REFERENCES parent(id) DEFERRABLE INITIALLY DEFERRED
);
```

### Pattern 4: Race Conditions

**Symptom**: Intermittent failures
**Solution**: Explicit waits, in-flight request tracking
```typescript
// Add waits
await page.waitForLoadState('networkidle');
await page.waitForTimeout(1000);

// Track in-flight requests (in stores)
if (pendingRequests.has(key)) {
  return pendingRequests.get(key);
}
```

### Pattern 5: Non-Unique Locators

**Symptom**: "Multiple elements match locator"
**Solution**: Use data-testid or more specific selectors
```typescript
// Add data-testid to components
<button data-testid={`delete-${item.id}`}>Delete</button>

// Use in tests
await page.click(`[data-testid="delete-${testId}"]`);
```

---

## Skill Implementation Notes

When converting this process to a Claude Skill:

### Skill Activation Trigger

User says: "Stage N is complete, ready for testing" OR "/test-stage N"

### Skill Context Requirements

The skill needs access to:
- Stage specification file (`claude.md/stageN_*.claude.md`)
- Previous testing history (`docs/testing-history.md`)
- Testing limitations (`docs/testing-limitations.md`)
- Amendment files (`docs/stageN-amendments.md` if exists)

### Skill Workflow

```
1. Prompt: "Beginning E2E testing for Stage N. First, I'll analyze the stage specification and review testing history."

2. [Automatically performs Phase 1: Pre-Test Analysis]

3. Prompt: "I've identified [X] potential risk areas. Now creating comprehensive test plan..."

4. [Automatically performs Phase 2: Test Plan Creation]

5. Prompt: "Test plan ready with [Y] test scenarios. Running initial full test suite..."

6. [Automatically performs Phase 3: Initial Full Test Run]

7. Prompt: "Initial results: [X/Y] tests passing ([Z]%). Analyzing [N] failures..."

8. [Automatically performs Phase 4: Failure Analysis]

9. For each failure, prompt: "Failure '[test name]' classified as [type]. Recommended action: [action]. Proceed? (yes/no/skip)"

10. [User confirms each fix]

11. [Iteration loop until no more improvements or user stops]

12. Prompt: "Current success rate: [X]%. [Y] failures remaining. These are [classification]. Continue fixing or accept? (continue/accept)"

13. [If accept, perform Phase 6 & 7, then end]

14. Prompt: "Stage N testing complete. Final results: [X]% success rate. I've documented all findings and analyzed Stage N+1 for preventable issues. Review docs/stageN+1-amendments.md before beginning Stage N+1."
```

### Skill Parameters

```typescript
interface StageTestingSkillParams {
  stageNumber: number;
  stageName?: string;  // Auto-detect from spec file
  maxIterations?: number;  // Default: 5
  minSuccessRate?: number;  // Default: 85%
  autofix?: boolean;  // Default: false (prompt for each fix)
  createAmendments?: boolean;  // Default: true
}
```

### Skill Outputs

- Test results document
- Failure analysis document
- Updated testing history
- Updated testing limitations
- Next stage amendments (if applicable)

---

## Success Metrics

### Stage-Level Metrics

- **Initial Success Rate**: Percentage of tests passing on first full run
- **Final Success Rate**: Percentage after all iterations
- **Improvement**: Δ from initial to final
- **Time to Complete**: Total time from start to finish
- **Iterations**: Number of fix cycles

### Project-Level Metrics

- **Average Success Rate**: Across all stages
- **Common Failure Types**: Most frequent issues
- **Fix Efficiency**: % of failures fixed vs accepted
- **Testing ROI**: Bugs caught by tests vs production

### Target Metrics

- Initial Success Rate: >80%
- Final Success Rate: >90%
- Critical Bug Escapes: 0
- Time per Stage: <8 hours
- Iterations: <5

---

## Version History

- **v1.0** (2025-01-02): Initial documentation based on Stages 1-5
- Updates will be made as new patterns emerge

---

## References

- [Testing Limitations](testing-limitations.md) - Known test environment issues
- [Testing History](testing-history.md) - Per-stage results (to be created)
- [Stage Amendments](stage06-amendments.md) - Example amendments document
- [Pre-emptive Recommendations](stage06-preemptive-recommendations.md) - Example analysis

---

**This document is the foundation for the E2E Stage Testing Skill. All sections should be included in the skill prompt.**
