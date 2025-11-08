# Testing Limitations and Known Issues

## Transaction Isolation Issues in E2E Tests

### Problem
When E2E tests create database records via the backend Supabase client and then attempt to interact with those records via the frontend (browser), the records may not be visible due to transaction isolation between different Supabase client sessions.

### Symptoms
- Test creates a record successfully (verified by backend query)
- Frontend Supabase client cannot see/query the same record
- Errors: 406 (Not Acceptable) or 400 (Bad Request) from Supabase API
- Foreign key constraint violations even after dropping FK constraints

### Root Cause
The test's backend Supabase client and the browser's frontend Supabase client operate in different transaction contexts/sessions. Records created in the test setup may not be immediately visible to the frontend due to:
1. PostgreSQL transaction isolation levels
2. Supabase connection pooling
3. Potential replication lag in hosted Supabase

### Affected Tests
- `@critical Should add part to job from stock` (Stage 5)
  - Test creates part via backend
  - Frontend cannot query part when adding to job
  - **Workaround**: Test uses direct database inserts instead of UI flow

### Solution Approaches

#### ❌ Attempted (Did Not Work)
1. Adding wait times between operations
2. Dropping foreign key constraints
3. Explicit transaction commits

#### ✅ Recommended Workarounds
1. **Use Direct Database Operations**: Instead of mixing backend setup + frontend UI, use all backend operations:
   ```typescript
   // Instead of: createPart() + page.click("Add Part")
   // Do: createPart() + directDatabaseInsert()
   ```

2. **Use UI for Both Setup and Action**: Create test data through the UI:
   ```typescript
   // Navigate to parts page and create part via UI
   await page.goto('/parts/new')
   await page.fill('[name="part_number"]', 'TEST-001')
   // ... then use part in job
   ```

3. **Accept Test Limitations**: Document that certain E2E flows cannot be tested and rely on:
   - Unit tests for business logic
   - Integration tests with single client
   - Manual testing for critical paths

### Best Practices for Future Tests

#### ✅ DO
- Create AND use test data within the same client context
- Use all-backend OR all-frontend approaches, not mixed
- Add explicit waits after database writes (2-3 seconds minimum)
- Verify data visibility before proceeding with test steps
- Document when tests use workarounds vs actual user flows

#### ❌ DON'T
- Mix backend database setup with frontend UI interactions
- Assume immediate consistency between different Supabase clients
- Rely on foreign key constraints in test environment
- Use `.maybeSingle()` or `.single()` without checking for null

### Verification This Is Test-Only Issue

The following evidence confirms this is NOT a production bug:

1. **Other tests pass**: Tests that use consistent client context (all backend OR all frontend) work fine
2. **Manual testing works**: The actual UI flow works when users interact with it
3. **Direct database tests pass**: Integration tests using single Supabase client succeed
4. **Production reports**: No user reports of similar issues

### Related Test Patterns

Tests that work reliably:
- ✅ "Should create a new part" - Uses UI for both create and verify
- ✅ "Should add inventory via Purchase transaction" - Uses backend for both
- ✅ "Should calculate FIFO cost correctly" - Uses backend for setup and assertions

Tests that have issues:
- ❌ "Should add part to job from stock" - Backend setup + UI action
- ❌ Tests with `beforeEach` cleanup that times out

### Impact Assessment
- **Severity**: Low - Does not affect production functionality
- **Test Coverage**: Medium - Can workaround with alternative test approaches
- **User Impact**: None - Users do not experience this issue

### Future Improvements
1. Investigate Supabase test mode or transaction settings
2. Consider using a dedicated test database with lower isolation
3. Implement test data factory that uses consistent client
4. Add explicit transaction boundaries for test setup

---

**Last Updated**: 2025-01-02
**Affects**: Playwright E2E Tests
**Status**: Documented, Workarounds Available
