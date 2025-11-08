# Stage 6: AI Integration - Required Amendments

**Date**: 2025-01-02
**Purpose**: Critical amendments to Stage 6 specification based on testing history
**Reference**: `stage06_ai_integration.claude.md` (original spec)

---

## Amendment Summary

These amendments MUST be applied to the Stage 6 specification before beginning implementation. They prevent test failures and production issues identified during Stages 1-5 testing.

**Impact**: Expected to improve first-run test pass rate from 85% → 95%+

---

## AMENDMENT 1: Database Schema - Add DEFERRABLE Constraints

**Location**: Lines 62-196 in original spec
**Priority**: CRITICAL

### Change Required:

Update ALL foreign key constraints to be `DEFERRABLE INITIALLY DEFERRED`. This prevents transaction isolation issues in tests.

```sql
-- parts_cross_reference
CREATE TABLE parts_cross_reference (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  primary_part VARCHAR(100) NOT NULL,
  alt_part_number VARCHAR(100) NOT NULL,
  brand VARCHAR(100),
  compatibility_level VARCHAR(50) NOT NULL,
  key_specs TEXT,
  installation_differences TEXT,
  ai_source VARCHAR(50) DEFAULT 'Claude',
  date_added TIMESTAMP DEFAULT NOW(),
  verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES auth.users(id) DEFERRABLE INITIALLY DEFERRED,  -- CHANGED
  verified_date TIMESTAMP,
  times_used INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(primary_part, alt_part_number)
);

-- model_compilation_items
CREATE TABLE model_compilation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id VARCHAR(20) UNIQUE NOT NULL,
  compilation_id VARCHAR(20) REFERENCES model_database(compilation_id)
    ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,  -- CHANGED
  item_type VARCHAR(50) NOT NULL,
  resource_url TEXT,
  title TEXT,
  description TEXT,
  tags TEXT[],
  scope VARCHAR(50) NOT NULL,
  part_number VARCHAR(100),
  source VARCHAR(50),
  ai_generated BOOLEAN DEFAULT FALSE,
  verified BOOLEAN DEFAULT FALSE,
  flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  useful_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id) DEFERRABLE INITIALLY DEFERRED  -- CHANGED
);
```

**Reason**: Stage 5 required dropping FK constraints post-implementation due to transaction isolation. This prevents that scenario.

---

## AMENDMENT 2: claude-api.ts - Add Error Handling Helpers

**Location**: After line 228, before `analyzePartWithClaude` function
**Priority**: HIGH

### Add These Helper Functions:

```typescript
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

### Update All Three AI Functions:

Replace the existing `JSON.parse(cleanedResponse)` calls with `parseAIResponse()`:

```typescript
// In analyzePartWithClaude (line 359):
const analysis = parseAIResponse<PartAnalysis>(cleanedResponse, 'part analysis');

// In compileModelResources (line 441):
const compilation = parseAIResponse<ModelCompilation>(cleanedResponse, 'model compilation');
```

Wrap API calls with timeout handling:

```typescript
const message = await callClaudeWithTimeout(async () => {
  return await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  });
}, 30000); // 30 second timeout
```

**Reason**: AI responses are unpredictable. Robust parsing prevents production crashes.

---

## AMENDMENT 3: ai-store.ts - Add In-Flight Request Tracking

**Location**: Lines 538-556 (AIStore interface) and 558-663 (lookupPartCrossReferences)
**Priority**: HIGH

### Update AIStore Interface:

```typescript
interface AIStore {
  crossReferences: Map<string, CrossReference[]>;
  xrefGroups: XRefGroup[];
  loading: boolean;
  error: string | null;
  pendingAnalyses: Map<string, Promise<CrossReference[]>>;  // ADD THIS LINE

  // ... rest of interface unchanged ...
}
```

### Update Store Implementation:

```typescript
export const useAIStore = create<AIStore>((set, get) => ({
  crossReferences: new Map(),
  xrefGroups: [],
  loading: false,
  error: null,
  pendingAnalyses: new Map(),  // ADD THIS LINE

  lookupPartCrossReferences: async (partNumber: string) => {
    // Check cache first
    const cached = get().crossReferences.get(partNumber);
    if (cached) return cached;

    // ADD THIS BLOCK: Check if request already in flight
    const pending = get().pendingAnalyses.get(partNumber);
    if (pending) {
      console.log(`Reusing in-flight analysis for ${partNumber}`);
      return pending;
    }

    // Create new analysis promise
    const analysisPromise = (async () => {
      set({ loading: true, error: null });

      try {
        // ... existing lookup logic (database check, AI call, save) ...
        return xrefs;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        set({ error: message, loading: false });
        throw error;
      } finally {
        // ADD THIS BLOCK: Clean up pending request
        const pending = new Map(get().pendingAnalyses);
        pending.delete(partNumber);
        set({ pendingAnalyses: pending, loading: false });
      }
    })();

    // ADD THIS BLOCK: Track this request
    const pending = new Map(get().pendingAnalyses);
    pending.set(partNumber, analysisPromise);
    set({ pendingAnalyses: pending });

    return analysisPromise;
  },

  // ... rest of store unchanged ...
}));
```

**Reason**: Prevents duplicate AI calls when multiple components request the same part simultaneously.

---

## AMENDMENT 4: Add Testing Considerations Section

**Location**: INSERT AFTER LINE 1700 (after ModelCompilation component, before Testing section)
**Priority**: CRITICAL

### Add New Section:

```markdown
---

## 🧪 Testing Considerations

### ⚠️ CRITICAL: Transaction Isolation Warning

Based on Stage 5 testing results, E2E tests **MUST NOT** mix backend AI operations with frontend UI interactions.

#### ❌ Patterns That WILL FAIL:

```typescript
// Backend AI operation + Frontend UI = FAILS
const xrefs = await aiStore.lookupPartCrossReferences('TEST-001');
await page.goto(`/parts/TEST-001/cross-ref`);
await expect(page.locator('text=OEM Equivalents')).toBeVisible(); // ❌ FAILS

// Backend model compilation + Frontend display = FAILS
await modelStore.compileModelWithAI('Whirlpool', 'TEST-MODEL', 'Refrigerator');
await page.goto(`/models/TEST-MODEL`);
await expect(page.locator('text=Service Manual')).toBeVisible(); // ❌ FAILS
```

**Why This Fails**: Backend Supabase client and frontend browser client operate in different transaction contexts. Data created by backend isn't immediately visible to frontend.

**Documented In**: `docs/testing-limitations.md` (Stage 5)

#### ✅ Patterns That WORK:

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

// Option 3: Mock AI responses for E2E tests
await page.route('**/api/ai/analyze-part', route => {
  route.fulfill({
    status: 200,
    body: JSON.stringify(mockPartAnalysis)
  });
});
```

### Mock AI Responses for Testing

**RECOMMENDATION**: Create fixtures to avoid real API calls during tests.

Create **tests/fixtures/ai-responses.ts**:

```typescript
import { PartAnalysis, ModelCompilation } from '../../src/lib/claude-api';

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

### Testing Strategy:

1. **Unit Tests**: Test AI functions with mocked Anthropic API (use vitest mocks)
2. **Integration Tests**: Test store functions with mocked AI responses (fixtures above)
3. **E2E Tests**: Use mocked AI responses OR test UI-triggered AI flows only
4. **Manual Testing**: Verify actual AI responses work with real API key

**NEVER** mix backend setup with frontend assertions in E2E tests.

---
```

**Reason**: This is THE most important lesson from Stage 5. Must be documented prominently.

---

## AMENDMENT 5: Update Troubleshooting Section

**Location**: After line 1813 (in Troubleshooting section)
**Priority**: MEDIUM

### Add to Troubleshooting:

```markdown
**Transaction isolation in tests:**
- ❌ Do NOT mix backend AI operations with frontend UI tests
- ✅ Use all-backend OR all-frontend approaches
- ✅ Mock AI responses in E2E tests
- ✅ See `docs/testing-limitations.md` for complete details
- ✅ Use `data-testid` attributes for AI-generated content to make testing easier

**Multiple simultaneous AI requests:**
- Store automatically tracks in-flight requests
- Duplicate requests for same part will reuse pending promise
- Check browser console for "Reusing in-flight analysis" logs
- Clear cache if stale: `window.aiStoreDebug = useAIStore.getState(); aiStoreDebug.crossReferences.clear()`

**Test cleanup timeouts:**
- Stage 6 has 6 new tables to clean up
- Use per-table timeouts (5s each) instead of global timeout
- Delete child records before parent records (compilation_items before model_database)
- Log warnings but continue if cleanup fails - don't fail tests

**API rate limiting:**
- Claude API has rate limits (varies by tier)
- Add exponential backoff for 429 errors
- Cache aggressively to minimize API calls
- Consider request queuing for high-traffic scenarios
```

---

## AMENDMENT 6: Update Success Criteria

**Location**: Lines 1745-1785 (Success Criteria section)
**Priority**: LOW

### Add These Items:

```markdown
**Testing:**
- [ ] Mock AI fixtures created for testing
- [ ] E2E tests use consistent client contexts only
- [ ] No backend setup + frontend UI test patterns
- [ ] Transaction isolation documented in test files
- [ ] Test cleanup doesn't timeout (uses per-table timeouts)
- [ ] In-flight request tracking prevents duplicate AI calls
```

---

## Implementation Checklist

When implementing Stage 6, apply amendments in this order:

1. ✅ **Amendment 1**: Update database schema with DEFERRABLE constraints
2. ✅ **Amendment 2**: Add error handling helpers to claude-api.ts
3. ✅ **Amendment 3**: Add in-flight request tracking to ai-store.ts
4. ✅ **Amendment 4**: Create testing fixtures and document patterns
5. ✅ **Amendment 5**: Update troubleshooting guide
6. ✅ **Amendment 6**: Update success criteria

---

## Expected Impact

### Before Amendments:
- Expected first-run pass rate: ~80-85% (based on Stage 5)
- Common failures: Transaction isolation, duplicate AI calls, JSON parsing errors, FK constraints
- Time to 100%: 4-6 test iterations

### After Amendments:
- Expected first-run pass rate: ~95-100%
- Prevented failures: Transaction isolation, duplicate API calls, most parsing errors
- Time to 100%: 1-2 test iterations

---

## References

- `docs/testing-limitations.md` - Stage 5 transaction isolation documentation
- `docs/stage06-preemptive-recommendations.md` - Full analysis and rationale
- `claude.md/stage06_ai_integration.claude.md` - Original specification

---

**IMPORTANT**: Review `docs/stage06-preemptive-recommendations.md` for complete analysis and additional context on each amendment.
