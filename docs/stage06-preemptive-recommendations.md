# Stage 6: AI Integration - Pre-emptive Recommendations

**Date**: 2025-01-02
**Stage**: 6 - AI Integration
**Purpose**: Analyze testing history from Stages 1-5 to prevent common issues in Stage 6

---

## Executive Summary

Based on comprehensive testing of Stages 1-5, we've identified patterns that will help prevent issues in Stage 6 (AI Integration). Stage 6 introduces Claude API integration with complex async operations, database caching, and UI components that display AI-generated data.

**Key Risk Areas for Stage 6:**
1. **Async AI Operations** - Claude API calls are inherently async and slow (5-15s)
2. **External API Dependency** - API failures, timeouts, rate limits
3. **JSON Parsing** - AI responses may include markdown formatting
4. **Database Caching** - Similar patterns to Stage 5 parts system
5. **Cross-Client Data Visibility** - AI data created in tests may not be visible to frontend

---

## Testing History Patterns (Stages 1-5)

### Stage 5: Parts Inventory (Most Recent, 85% Pass Rate)

**Critical Lesson Learned**: Transaction isolation between backend test client and frontend browser client

**Failures**:
1. ❌ "Should add part to job from stock" - Backend setup + Frontend UI interaction
2. ❌ "Should show stats on parts list page" - beforeEach cleanup timeout
3. ❌ "Should assign part to storage location" - beforeEach cleanup timeout

**Root Cause**:
- Tests that mix backend database operations (createPart()) with frontend UI interactions (page.click("Add Part")) fail due to transaction isolation
- Different Supabase client sessions don't share transaction context
- Records created via backend aren't immediately visible to frontend

**Documented in**: `docs/testing-limitations.md`

### Common Patterns Across All Stages

**Patterns That Cause Failures**:
1. **Mixed Client Contexts** - Backend setup + Frontend action = isolation issues
2. **Long-Running Operations** - Timeouts in beforeEach/afterEach hooks
3. **Foreign Key Constraints** - Test data creation order matters
4. **Race Conditions** - Async operations without proper waits
5. **Locator Specificity** - Generic locators like `text=Delete` match multiple elements

**Patterns That Work Well**:
1. **Consistent Client Context** - All-backend OR all-frontend approaches
2. **Direct Database Operations** - For setup and verification
3. **Unique Test Data** - Timestamp-based IDs prevent conflicts
4. **Explicit Waits** - After database writes (2-3 seconds)
5. **Specific Locators** - `data-testid`, `role=button[name="exact text"]`

---

## Stage 6 Specific Risks

### Risk 1: Claude API Async Operations

**Issue**: Claude API calls take 5-15 seconds and can fail/timeout

**Impact on Stage 6**:
- `analyzePartWithClaude()` - Could timeout in tests
- `compileModelResources()` - Even slower, more data
- `getRepairGuidance()` - Variable response time

**Pre-emptive Fixes**:
```typescript
// In claude-api.ts - Add timeout handling
export async function analyzePartWithClaude(
  partNumber: string,
  options: { timeout?: number } = {}
): Promise<PartAnalysis> {
  const timeout = options.timeout || 30000; // 30s default

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
      // Add timeout handling
    });

    clearTimeout(timeoutId);
    return parseResponse(message);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`AI analysis timed out after ${timeout}ms`);
    }
    throw error;
  }
}
```

**Test Strategy**:
- Mock Claude API responses in tests
- Create fixtures for common AI responses
- Test timeout handling separately
- Use shorter timeouts in test environment

### Risk 2: Transaction Isolation (Same as Stage 5)

**Issue**: AI data created via backend may not be visible to frontend

**Stage 6 Scenarios at Risk**:
- Test creates part with backend → Calls AI analysis → Frontend displays cross-refs ❌
- Test looks up model with backend → Frontend displays compilation items ❌

**Pre-emptive Fix**:
Add this warning to Stage 6 spec:

```markdown
## Testing Considerations

### ⚠️ Transaction Isolation Warning

Based on Stage 5 testing, E2E tests MUST NOT mix backend AI operations with frontend UI interactions.

**❌ Don't Do This:**
```typescript
// Backend creates AI data
await aiStore.lookupPartCrossReferences('W10408179');

// Frontend tries to display it
await page.goto(`/parts/${partId}/cross-reference`);
await expect(page.locator('text=OEM Equivalents')).toBeVisible(); // FAILS
```

**✅ Do This Instead:**
```typescript
// Option 1: All backend
const xrefs = await aiStore.lookupPartCrossReferences('W10408179');
expect(xrefs.length).toBeGreaterThan(0); // Direct assertion

// Option 2: All frontend (trigger AI via UI)
await page.goto(`/parts/new`);
await page.fill('[name="part_number"]', 'W10408179');
await page.click('button:has-text("Analyze with AI")'); // UI triggers AI
await expect(page.locator('text=OEM Equivalents')).toBeVisible(); // Works
```
```

### Risk 3: JSON Parsing Failures

**Issue**: AI may return markdown-wrapped JSON despite instructions

**Impact on Stage 6**:
- All three AI functions parse JSON responses
- Malformed JSON will crash the application

**Current Code** (from spec line 353-359):
```typescript
// Strip markdown code blocks if present
let cleanedResponse = responseText
  .replace(/```json\s*/g, '')
  .replace(/```\s*/g, '')
  .trim();

const analysis = JSON.parse(cleanedResponse) as PartAnalysis;
```

**Pre-emptive Enhancement**:
```typescript
// Enhanced JSON parsing with better error handling
function parseAIResponse<T>(responseText: string, context: string): T {
  try {
    // Strip markdown
    let cleaned = responseText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    // Try direct parse
    try {
      return JSON.parse(cleaned) as T;
    } catch (firstError) {
      // Try to extract JSON object from text
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as T;
      }
      throw firstError;
    }
  } catch (error) {
    console.error(`Failed to parse AI response for ${context}:`, {
      raw: responseText,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw new Error(
      `Invalid AI response format for ${context}. ` +
      `Expected JSON, got: ${responseText.substring(0, 100)}...`
    );
  }
}

// Usage
const analysis = parseAIResponse<PartAnalysis>(responseText, 'part analysis');
```

### Risk 4: Database Caching Race Conditions

**Issue**: Similar to Stage 5, AI data caching may have visibility issues

**Stage 6 Code** (ai-store.ts lines 572-577):
```typescript
// Check if already in local cache
const cached = get().crossReferences.get(partNumber);
if (cached) {
  set({ loading: false });
  return cached;
}
```

**Potential Issue**:
- Cache check happens immediately
- Database query happens next
- AI call happens last
- Race condition if multiple components request same part simultaneously

**Pre-emptive Fix**:
```typescript
// Add in-flight request tracking
interface AIStore {
  crossReferences: Map<string, CrossReference[]>;
  pendingRequests: Map<string, Promise<CrossReference[]>>; // NEW
  // ... rest of interface
}

lookupPartCrossReferences: async (partNumber: string) => {
  // Check cache first
  const cached = get().crossReferences.get(partNumber);
  if (cached) return cached;

  // Check if request already in flight
  const pending = get().pendingRequests.get(partNumber);
  if (pending) {
    console.log(`Waiting for in-flight request for ${partNumber}`);
    return pending;
  }

  // Start new request
  const requestPromise = (async () => {
    try {
      // ... existing lookup logic ...
      return xrefs;
    } finally {
      // Clean up pending request
      const pending = new Map(get().pendingRequests);
      pending.delete(partNumber);
      set({ pendingRequests: pending });
    }
  })();

  // Track pending request
  const pending = new Map(get().pendingRequests);
  pending.set(partNumber, requestPromise);
  set({ pendingRequests: pending });

  return requestPromise;
}
```

### Risk 5: Foreign Key Constraints (Stage 5 Issue)

**Issue**: Stage 5 required dropping FK constraints due to test isolation

**Stage 6 Tables with FK Constraints**:
1. `parts_cross_reference.verified_by` → `auth.users(id)`
2. `model_compilation_items.compilation_id` → `model_database(compilation_id)`
3. `model_compilation_items.added_by` → `auth.users(id)`

**Pre-emptive Fix**:
Make FK constraints DEFERRABLE from the start:

```sql
-- In migration file
CREATE TABLE parts_cross_reference (
  -- ... columns ...
  verified_by UUID REFERENCES auth.users(id) DEFERRABLE INITIALLY DEFERRED,
  -- ... rest of table ...
);

CREATE TABLE model_compilation_items (
  -- ... columns ...
  compilation_id VARCHAR(20) REFERENCES model_database(compilation_id)
    DEFERRABLE INITIALLY DEFERRED,
  added_by UUID REFERENCES auth.users(id) DEFERRABLE INITIALLY DEFERRED,
  -- ... rest of table ...
);
```

**Why**: DEFERRABLE constraints are checked at transaction commit, not immediately, reducing race conditions in tests.

### Risk 6: Long-Running Test Cleanup

**Issue**: Stage 5 had 2 tests timeout during `beforeEach` cleanup

**Stage 6 Will Have**:
- More complex data relationships (xref groups, compilation items, common issues)
- More tables to clean up (6 new tables)
- AI-generated data that may be large (JSONB fields)

**Pre-emptive Fix**:
```typescript
// In stage06_ai_integration.test.ts
async function cleanupTestData() {
  const tables = [
    'model_compilation_items',    // Delete child records first
    'common_issues',
    'parts_cross_reference',
    'parts_ai_data',
    'parts_xref_groups',
    'model_database'              // Delete parent records last
  ];

  for (const table of tables) {
    try {
      // Use shorter timeout for each table
      const { error } = await supabase
        .from(table)
        .delete()
        .ilike('created_at', '%')  // Delete all (tests create recent data)
        .abortSignal(AbortSignal.timeout(5000)); // 5s per table max

      if (error && error.code !== '42P01') {  // Ignore "table doesn't exist"
        console.warn(`Cleanup warning for ${table}:`, error);
      }
    } catch (err) {
      console.warn(`Cleanup timeout for ${table}, continuing...`);
    }
  }
}

// Use in beforeEach with global timeout
test.beforeEach(async ({ page }) => {
  test.setTimeout(60000); // 60s total for cleanup + setup
  await cleanupTestData();
  // ... rest of setup ...
});
```

---

## Recommended Changes to Stage 6 Specification

### Change 1: Add Testing Considerations Section

Insert after line 1703 (after ModelCompilation component):

```markdown
---

## 🧪 Testing Considerations

### Transaction Isolation Warning

**CRITICAL**: Based on Stage 5 testing results, E2E tests MUST use consistent client contexts.

#### ❌ Patterns That Will Fail:
```typescript
// Backend AI operation + Frontend UI = FAIL
const xrefs = await aiStore.lookupPartCrossReferences('TEST-001');
await page.goto(`/parts/TEST-001/cross-ref`);
await expect(page.locator('text=OEM Equivalents')).toBeVisible(); // FAILS

// Backend model compilation + Frontend display = FAIL
await modelStore.compileModelWithAI('Whirlpool', 'TEST-MODEL', 'Refrigerator');
await page.goto(`/models/TEST-MODEL`);
await expect(page.locator('text=Service Manual')).toBeVisible(); // FAILS
```

#### ✅ Patterns That Work:
```typescript
// Option 1: All backend (direct assertions)
const xrefs = await aiStore.lookupPartCrossReferences('TEST-001');
expect(xrefs).toHaveLength(5);
expect(xrefs[0].compatibility_level).toBe('Exact');

// Option 2: All frontend (UI triggers AI)
await page.goto('/parts/new');
await page.fill('[name="part_number"]', 'W10408179');
await page.click('button:has-text("Analyze with AI")');
await page.waitForSelector('text=Analyzing with AI...', { state: 'detached' });
await expect(page.locator('text=OEM Equivalents')).toBeVisible();

// Option 3: Mock AI responses for E2E
await page.route('**/api/ai/analyze-part', route => {
  route.fulfill({
    status: 200,
    body: JSON.stringify(mockPartAnalysis)
  });
});
```

### Mock AI Responses for Testing

Create fixtures to avoid real API calls during tests:

**tests/fixtures/ai-responses.ts**:
```typescript
export const mockPartAnalysis: PartAnalysis = {
  keySpecs: "Control board, 120V, 60Hz, compatible with Whirlpool refrigerators",
  oemCrossRefs: [
    {
      partNumber: "W10219462",
      brand: "Whirlpool",
      compatibilityLevel: "Exact",
      keySpecs: "Exact replacement, no modifications",
      installationDifferences: "None"
    }
  ],
  aftermarketAlternatives: [
    {
      partNumber: "ER10408179",
      brand: "ERP",
      compatibilityLevel: "Direct Replacement",
      keySpecs: "Aftermarket equivalent, same specs",
      installationDifferences: "None"
    }
  ],
  universalFit: [],
  testingProcedure: {
    steps: [
      "Disconnect power",
      "Remove control panel",
      "Test with multimeter for continuity"
    ],
    expectedReadings: "Should show continuity across relay contacts",
    commonFailures: [
      "No power to compressor",
      "Intermittent cooling",
      "Error codes F01 or F02"
    ]
  }
};

export const mockModelCompilation: ModelCompilation = {
  brand: "Whirlpool",
  modelNumber: "WRF555SDFZ",
  applianceType: "Refrigerator",
  items: [
    {
      type: "Service Manual",
      title: "WRF555SDFZ Service Manual",
      url: "https://example.com/manual.pdf",
      description: "Complete service and repair manual",
      scope: "Model-Specific"
    }
  ],
  commonIssues: [
    {
      description: "Ice maker not producing ice",
      frequency: "High",
      typicalParts: ["W10408179", "W10190965"],
      diagnosticSteps: "Check water supply, test ice maker module"
    }
  ]
};
```

### Testing Strategy Recommendations:

1. **Unit Tests**: Test AI functions with mocked Anthropic API
2. **Integration Tests**: Test store functions with mocked AI responses
3. **E2E Tests**: Use mocked AI responses OR test UI-triggered AI flows only
4. **Manual Testing**: Verify actual AI responses with real API key

**Documented in**: `docs/testing-limitations.md` (Stage 5)
```

### Change 2: Update Database Migration (Add DEFERRABLE)

Modify all FK constraints in the spec (lines 64-196) to be DEFERRABLE:

```sql
-- parts_cross_reference
CREATE TABLE parts_cross_reference (
  -- ... existing columns ...
  verified_by UUID REFERENCES auth.users(id) DEFERRABLE INITIALLY DEFERRED,
  -- ... rest remains same ...
);

-- model_compilation_items
CREATE TABLE model_compilation_items (
  -- ... existing columns ...
  compilation_id VARCHAR(20) REFERENCES model_database(compilation_id)
    ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  added_by UUID REFERENCES auth.users(id) DEFERRABLE INITIALLY DEFERRED,
  -- ... rest remains same ...
);
```

### Change 3: Enhance Error Handling in claude-api.ts

Update all three AI functions (lines 285-495) with improved error handling:

```typescript
// Add after line 228 (before analyzePartWithClaude function)

/**
 * Helper function to parse AI JSON responses with robust error handling
 */
function parseAIResponse<T>(responseText: string, context: string): T {
  try {
    // Strip markdown code blocks
    let cleaned = responseText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    // Try direct parse first
    try {
      return JSON.parse(cleaned) as T;
    } catch (firstError) {
      // Try to extract JSON object from surrounding text
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as T;
      }
      throw firstError;
    }
  } catch (error) {
    console.error(`Failed to parse AI response for ${context}:`, {
      raw: responseText.substring(0, 200),
      error: error instanceof Error ? error.message : 'Unknown'
    });
    throw new Error(
      `Invalid AI response format for ${context}. ` +
      `Please try again or contact support.`
    );
  }
}

/**
 * Helper to handle API timeouts
 */
async function callClaudeWithTimeout<T>(
  apiCall: () => Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  return Promise.race([
    apiCall(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('AI request timed out')), timeoutMs)
    )
  ]);
}
```

Then update each AI function to use these helpers:

```typescript
export async function analyzePartWithClaude(partNumber: string): Promise<PartAnalysis> {
  // ... existing prompt ...

  try {
    const message = await callClaudeWithTimeout(async () => {
      return await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });
    }, 30000); // 30 second timeout

    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => block.type === 'text' ? block.text : '')
      .join('');

    const analysis = parseAIResponse<PartAnalysis>(responseText, 'part analysis');
    return analysis;

  } catch (error) {
    console.error('Error analyzing part with Claude:', error);

    // Provide user-friendly error messages
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error(`AI analysis timed out. Please try again.`);
      }
      if (error.message.includes('rate limit')) {
        throw new Error(`AI service is busy. Please wait a moment and try again.`);
      }
      if (error.message.includes('Invalid AI response')) {
        throw error; // Already user-friendly
      }
    }

    throw new Error(`Failed to analyze part: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

### Change 4: Add In-Flight Request Tracking to ai-store.ts

Add to the AIStore interface (after line 538):

```typescript
interface AIStore {
  crossReferences: Map<string, CrossReference[]>;
  xrefGroups: XRefGroup[];
  loading: boolean;
  error: string | null;

  // NEW: Track in-flight requests to prevent duplicate AI calls
  pendingAnalyses: Map<string, Promise<CrossReference[]>>;

  // ... rest of interface ...
}

export const useAIStore = create<AIStore>((set, get) => ({
  crossReferences: new Map(),
  xrefGroups: [],
  loading: false,
  error: null,
  pendingAnalyses: new Map(), // NEW

  lookupPartCrossReferences: async (partNumber: string) => {
    // Check cache first
    const cached = get().crossReferences.get(partNumber);
    if (cached) return cached;

    // NEW: Check if request already in flight
    const pending = get().pendingAnalyses.get(partNumber);
    if (pending) {
      console.log(`Reusing in-flight analysis for ${partNumber}`);
      return pending;
    }

    // Create new analysis promise
    const analysisPromise = (async () => {
      set({ loading: true, error: null });

      try {
        // ... existing database check ...

        // Not in database - analyze with AI
        console.log('Analyzing new part with AI:', partNumber);
        const analysis = await analyzePartWithClaude(partNumber);

        // ... existing save logic ...

        return xrefs;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        set({ error: message, loading: false });
        throw error;
      } finally {
        // Clean up pending request
        const pending = new Map(get().pendingAnalyses);
        pending.delete(partNumber);
        set({ pendingAnalyses: pending, loading: false });
      }
    })();

    // Track this request
    const pending = new Map(get().pendingAnalyses);
    pending.set(partNumber, analysisPromise);
    set({ pendingAnalyses: pending });

    return analysisPromise;
  },

  // ... rest of store ...
}));
```

### Change 5: Update Troubleshooting Section

Add to the Troubleshooting section (after line 1813):

```markdown
**Transaction isolation in tests:**
- Do NOT mix backend AI operations with frontend UI tests
- Use all-backend OR all-frontend approaches
- Mock AI responses in E2E tests
- See `docs/testing-limitations.md` for details
- Consider using `data-testid` attributes for AI-generated content

**Multiple simultaneous AI requests:**
- Store tracks in-flight requests
- Duplicate requests for same part will reuse pending promise
- Check browser console for "Reusing in-flight analysis" logs
- Clear cache if stale: `aiStore.crossReferences.clear()`
```

---

## Summary of Recommended Changes

### High Priority (Must Implement):
1. ✅ Add Testing Considerations section with transaction isolation warnings
2. ✅ Update all FK constraints to DEFERRABLE INITIALLY DEFERRED
3. ✅ Add in-flight request tracking to prevent duplicate AI calls
4. ✅ Enhance JSON parsing with better error handling
5. ✅ Add timeout handling for AI API calls

### Medium Priority (Strongly Recommended):
6. ✅ Create AI response fixtures for testing
7. ✅ Add per-table timeouts for test cleanup
8. ✅ Document testing strategy (unit/integration/E2E/manual)

### Low Priority (Nice to Have):
9. Add API rate limiting logic
10. Implement retry logic for transient failures
11. Add telemetry for AI performance monitoring

---

## Testing Process Documentation Updates

For the E2E Stage Testing Skill you're creating, add these guidelines:

### Stage Testing Skill - AI Integration Considerations

**When testing stages with external APIs:**
1. Create mock fixtures for API responses
2. Separate unit tests (with mocks) from integration tests (with real APIs)
3. Use environment flags to control which tests run in CI vs local
4. Document API rate limits and costs
5. Test error scenarios (timeout, rate limit, malformed response)

**When testing stages with complex async operations:**
1. Increase test timeouts appropriately
2. Add loading state assertions
3. Test race conditions (multiple simultaneous requests)
4. Verify caching behavior
5. Test stale cache scenarios

**When testing stages with mixed client contexts:**
1. ALWAYS use consistent client contexts in E2E tests
2. Document which tests use backend-only vs frontend-only vs mocked approaches
3. Add explicit waits after database writes
4. Use specific locators (data-testid, role with exact name)
5. Verify data visibility before assertions

---

## Conclusion

Stage 6 introduces significant complexity with external API integration. By applying lessons learned from Stage 5 and earlier stages, we can prevent the majority of test failures.

**Key Success Factors:**
1. Mock AI responses in tests
2. Use DEFERRABLE FK constraints
3. Avoid mixed client contexts in E2E tests
4. Add robust error handling for AI operations
5. Track in-flight requests to prevent duplicates
6. Document testing strategies clearly

**Expected Test Coverage for Stage 6:**
- Target: 90%+ pass rate on first full test run
- Critical path: AI analysis, cross-reference lookup, model compilation
- Test isolation: Each test should be independent
- Performance: Tests should complete in <5 minutes total

With these pre-emptive fixes, Stage 6 testing should achieve >90% pass rate on the first full test run, compared to Stage 5's initial 85%.

---

**References**:
- `docs/testing-limitations.md` - Stage 5 transaction isolation documentation
- `claude.md/stage06_ai_integration.claude.md` - Original Stage 6 specification
- Test results from Stages 1-5 (conversation history)
