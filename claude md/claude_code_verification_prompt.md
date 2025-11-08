# Claude Code Testing Verification Prompt

## Copy this exact prompt into Claude Code:

---

I need you to verify that my staged testing setup is working correctly for my Appliance Business Management System. I'm NOT asking you to fix failing tests yet - I just want to confirm that the testing infrastructure is properly set up and that you understand the testing strategy.

## What I've Implemented:
1. Installed Playwright using `npm init playwright@latest`
2. Created the test folder structure as directed
3. Placed test files in the correct locations
4. Ran the Stage 1 tests and got 80+ failures (which might be expected!)

## Testing Strategy Documentation:
I have these files in my project that explain the testing approach:
- `/tests/staged_testing_plan.md` - Full 12-stage testing specifications
- `/tests/test_automation_setup.md` - Playwright setup guide
- `/tests/testing_strategy_summary.md` - Strategy overview
- `/tests/stages/stage01_foundation.test.ts` - Stage 1 test file

## The Staged Testing Philosophy:
We're using a **staged testing approach** where:
- Stage 1: Only test Foundation & Auth (20 tests)
- Stage 2: Test Foundation + Customers (45 tests total)
- Stage 3: Test Foundation + Customers + Jobs (75 tests total)
- And so on through 12 stages...

**Key Principle:** We only test features that actually exist at each stage. If I'm at Stage 1, I should NOT be testing Customers, Jobs, Parts, etc.

## Please Verify:

### 1. Check Testing Infrastructure ✅
```bash
# Confirm Playwright is installed
npm list @playwright/test

# Verify folder structure exists
ls -la tests/
ls -la tests/stages/
ls -la tests/helpers/
ls -la tests/fixtures/
ls -la tests/reports/

# Check test files are in place
ls -la tests/stages/stage01_foundation.test.ts

# Verify configuration files
cat playwright.config.ts
cat .env.test 2>/dev/null || echo "No .env.test file"
```

### 2. Understand What Ran 📊
```bash
# Show me what tests were attempted
npx playwright test tests/stages/stage01_foundation.test.ts --list

# Check if reports were generated
ls -la playwright-report/ 2>/dev/null
ls -la test-results/ 2>/dev/null
```

### 3. Analyze the Test Results 🔍
- How many tests were attempted?
- How many failed vs passed vs skipped?
- Are the failures because features don't exist (expected)?
- Or are they infrastructure failures (unexpected)?

### 4. Confirm Understanding of Strategy 📚
After reading the documentation files, confirm you understand:
- Why we use staged testing (avoid testing unbuilt features)
- What Stage 1 should test (only auth & foundation)
- Why 80+ failures might be EXPECTED if the test file includes tests for unbuilt features
- How we'll proceed (fix only Stage 1 relevant tests, skip others)

### 5. Determine My Actual Development Stage 🎯
Based on what you can see in my codebase:
- What features are actually implemented?
- Am I at Stage 1 (just auth), Stage 2 (auth + customers), or further?
- Should I be running Stage 1 tests or different stage tests?

## Output I Need:

Please provide a verification report like this:

```
TESTING INFRASTRUCTURE VERIFICATION
====================================

✅ SETUP VERIFICATION:
- Playwright: [Installed/Not Installed]
- Test folders: [Correct/Issues found]
- Test files: [In place/Missing]
- Config files: [Found/Missing]

📊 TEST EXECUTION ANALYSIS:
- Total tests attempted: [number]
- Tests passed: [number]
- Tests failed: [number] 
- Tests skipped: [number]

🎯 FAILURE ANALYSIS:
- Infrastructure failures: [none/list any]
- Expected failures (unbuilt features): [list]
- Unexpected failures (should work): [list]

📚 STRATEGY UNDERSTANDING:
✅ Staged approach understood
✅ Stage 1 should only test: Auth & Foundation
✅ Other stages should be skipped until built

🔍 CURRENT DEVELOPMENT STAGE:
Based on codebase analysis:
- Auth/Login: [Implemented/Not found]
- Customer Management: [Implemented/Not found]
- Job Management: [Implemented/Not found]
- Recommended test stage: [Stage X]

📋 NEXT STEPS:
1. [Your recommendation]
2. [Your recommendation]
3. [Your recommendation]
```

## Important Notes:
- **DO NOT fix any tests yet** - Just verify the setup
- **DO NOT modify any code** - Just analyze and report
- **80+ failures might be CORRECT** if I'm testing unbuilt features
- Focus on understanding if the testing framework itself is working

After you provide this verification report, I'll know whether:
1. The testing infrastructure is working correctly
2. You understand the staged testing approach
3. We need to fix infrastructure issues or just adapt tests to my current stage
4. I should proceed with fixing Stage 1 tests or skip to appropriate stage

---

## This prompt will help Claude Code:
1. ✅ Verify your testing setup is correct
2. 📊 Understand what the test run actually did
3. 🎯 Determine if failures are expected or problematic
4. 📚 Grasp the staged testing strategy
5. 🔍 Identify what stage you're actually at

This way you'll know if the testing framework is working properly before trying to fix any tests!
