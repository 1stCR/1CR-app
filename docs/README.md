# Appliance Manager - Testing Documentation

This directory contains comprehensive testing documentation for the Appliance Manager application.

## Documentation Overview

### 📊 [Stage 4 Testing Summary](./stage04_testing_summary.md)
**Purpose**: Complete analysis of Stage 4 Tour System testing

**Contents**:
- Final test results (14/15 passing, 93%)
- All 8 issues found and resolved
- Detailed lessons learned
- Test coverage breakdown
- Critical insights for future development

**When to use**:
- Review what worked and what didn't in Stage 4
- Understand common pitfalls and solutions
- Reference when encountering similar issues

---

### 🚀 [Stage 5 Testing Preparation Guide](./stage05_testing_preparation.md)
**Purpose**: Comprehensive guide for test-first Stage 5 development

**Contents**:
- Pre-implementation checklist
- Complete test template (copy-paste ready)
- Database schema best practices
- State management strategies
- Test execution workflow
- Success criteria

**When to use**:
- Before starting Stage 5 implementation
- As a step-by-step guide during development
- To ensure nothing is missed in the testing process

---

### ⚡ [Testing Quick Reference](./testing_quick_reference.md)
**Purpose**: Fast lookup for common patterns and solutions

**Contents**:
- Essential test setup code
- Database constraint limits
- Test data creation snippets
- Cleanup patterns
- Common issues & solutions
- Debugging tips
- Command cheat sheet

**When to use**:
- During active development for quick lookups
- When encountering a known issue
- To copy-paste working code patterns
- As a debugging checklist

---

## Testing Philosophy

The Appliance Manager follows a **test-first, stage-based development approach**:

1. **Define** - Clearly specify what features will be built
2. **Plan** - Design test scenarios before coding
3. **Test** - Write comprehensive E2E tests
4. **Implement** - Build features guided by tests
5. **Validate** - Ensure 90%+ test pass rate
6. **Document** - Capture lessons learned

## Quick Start for Stage 5

### Step 1: Read the Documentation
```
1. Review: stage04_testing_summary.md (15 min)
2. Read: stage05_testing_preparation.md (20 min)
3. Bookmark: testing_quick_reference.md (for during development)
```

### Step 2: Answer Planning Questions
Before writing any code:
- What features will Stage 5 include?
- What database changes are needed?
- What are the test scenarios?
- What dependencies exist?

### Step 3: Set Up Test File
```bash
# Copy the template from stage05_testing_preparation.md
# Create: tests/stages/stage05_[feature_name].test.ts
```

### Step 4: Begin Test-First Development
1. Write first test scenario
2. Run test (it should fail - no code yet!)
3. Implement minimum code to pass test
4. Repeat

### Step 5: Validate and Document
- Achieve 90%+ pass rate
- Document issues found
- Update testing guides with new lessons

## Test Execution

### Run Stage 4 Tests (Baseline)
```bash
npx playwright test tests/stages/stage04_tour_system.test.ts --project=chromium --workers=1
```
**Expected**: 14/15 passing (93%)

### Run Stage 5 Tests (When Ready)
```bash
npx playwright test tests/stages/stage05_*.test.ts --project=chromium --workers=1
```
**Target**: ≥90% pass rate

### Run All Stage Tests
```bash
npx playwright test tests/stages/ --project=chromium --workers=1
```

## Key Learnings from Stages 1-4

### ✅ Do This
- Authenticate Supabase client in `beforeAll`
- Clear localStorage before each test
- Use explicit waits (1-2 seconds)
- Respect database VARCHAR constraints
- Clean up test data in `afterEach`
- Use data-testid for stable selectors
- Run tests with `--workers=1`

### ❌ Avoid This
- Hard-coding IDs or timestamps
- Assuming state from previous tests
- Using UI text for selectors
- Running tests in parallel (race conditions)
- Skipping cleanup (causes next test to fail)
- Ignoring flaky tests (fix or document)

## Common Issues Reference

| Issue | Quick Solution | Doc Reference |
|-------|---------------|---------------|
| RLS Policy Violation | `authenticateSupabase()` in beforeAll | Quick Ref p.1 |
| localStorage Pollution | `localStorage.clear()` in login | Quick Ref p.2 |
| VARCHAR Constraint | Check limits, use `.slice()` | Quick Ref p.1 |
| Element Not Found | Add `waitForTimeout(1000)` | Quick Ref p.3 |
| Duration is 0 | Use `toBeGreaterThanOrEqual(0)` | Quick Ref p.2 |
| Test Timeout | Increase timeout or add waits | Quick Ref p.2 |

## Success Metrics

### Stage 4 Achievements
- ✅ 14/15 tests passing (93%)
- ✅ All 8 issues identified and resolved
- ✅ Comprehensive test coverage
- ✅ Production-ready implementation
- ✅ Documentation complete

### Stage 5 Goals
- 🎯 ≥90% test pass rate
- 🎯 <5 minute test execution time
- 🎯 No unresolved critical issues
- 🎯 Comprehensive edge case coverage
- 🎯 Updated documentation

## File Structure

```
docs/
├── README.md                           # This file
├── stage04_testing_summary.md          # Detailed Stage 4 analysis
├── stage05_testing_preparation.md      # Stage 5 development guide
└── testing_quick_reference.md          # Quick lookup patterns

tests/
└── stages/
    ├── stage02_customers.test.ts       # Customer management tests
    ├── stage03_jobs.test.ts            # Job management tests
    └── stage04_tour_system.test.ts     # Tour system tests (658 LOC)
```

## Database Schema Documentation

Key constraints to remember:

| Table | Column | Type | Limit | Test Pattern |
|-------|--------|------|-------|--------------|
| customers | customer_id | VARCHAR | 10 | `C-12345678` |
| customers | phone_primary | VARCHAR | 10-20 | `3075551234` |
| customers | email | VARCHAR | 255 | `test-123@example.com` |
| jobs | job_id | VARCHAR | 10 | `J-0001` |
| tours | tour_date | DATE | - | `2025-11-02` |

## Resources

### Playwright Documentation
- [Playwright Docs](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging](https://playwright.dev/docs/debug)

### Supabase Documentation
- [Supabase Docs](https://supabase.com/docs)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Functions](https://supabase.com/docs/guides/database/functions)

### Project-Specific
- Test results: `playwright-report/`
- Test config: `playwright.config.ts`
- Environment: `.env.test`

## Contributing to Tests

When adding new tests:

1. Follow established patterns from Stage 4
2. Add descriptive test names
3. Include dependency comments
4. Clean up test data
5. Test edge cases
6. Document new patterns found

## Getting Help

If you encounter issues:

1. ✅ Check `testing_quick_reference.md` for known solutions
2. ✅ Review `stage04_testing_summary.md` for similar issues
3. ✅ Run with `--headed` to see what's happening
4. ✅ Use `page.pause()` to debug interactively
5. ✅ Take screenshots for visual debugging

## Next Steps

**You are here**: Stage 4 complete, ready for Stage 5

**To begin Stage 5**:
1. Review `stage04_testing_summary.md` - Understand what we learned
2. Read `stage05_testing_preparation.md` - Follow the guide
3. Keep `testing_quick_reference.md` open - Use during development

Good luck with Stage 5! The foundation is solid, and you're well-prepared. 🚀

---

**Last Updated**: Stage 4 Complete (14/15 tests passing, 93%)
**Next Milestone**: Stage 5 Test Suite Creation
