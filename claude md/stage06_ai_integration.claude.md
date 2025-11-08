# Stage 6: AI Integration

## 🎯 Objective
Integrate Claude API to provide intelligent parts cross-referencing, model-specific repair aids compilation, testing procedures, and smart part recommendations.

## ✅ Prerequisites
- Stages 1-5 completed
- Parts inventory system functional
- Job management working
- Claude API access (Anthropic API key)
- Environment variables configured

## 🛠️ What We're Building

### Core Features:
1. **Parts Cross-Reference System**
   - Automatic compatibility lookup via Claude API
   - OEM equivalents identification
   - Aftermarket alternatives
   - Universal fit parts
   - Installation differences notes
   - Testing procedures for parts

2. **Model Compilation Database**
   - Auto-search for service manuals
   - Parts diagrams collection
   - Diagnostic mode guides
   - Troubleshooting procedures
   - Common issues database
   - Repair tips and videos

3. **AI-Powered Testing Procedures**
   - Part-specific testing steps
   - Expected readings and values
   - Common failure modes
   - Diagnostic procedures

4. **Smart Recommendations**
   - Alternative parts suggestions
   - Best value recommendations
   - Installation tips
   - Compatibility warnings

5. **Cross-Reference Groups**
   - Group compatible parts together
   - Unified stock tracking
   - Group-based reordering
   - Combined usage statistics

6. **AI Data Verification System**
   - User verification of AI responses
   - Flagging incorrect data
   - Manual override capability
   - Learning from corrections

---

## 📊 Database Schema

### New Tables

**parts_cross_reference**
```sql
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
  verified_by UUID REFERENCES auth.users(id),
  verified_date TIMESTAMP,
  times_used INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(primary_part, alt_part_number)
);

CREATE INDEX idx_parts_xref_primary ON parts_cross_reference(primary_part);
CREATE INDEX idx_parts_xref_alt ON parts_cross_reference(alt_part_number);
CREATE INDEX idx_parts_xref_verified ON parts_cross_reference(verified);
```

**parts_xref_groups**
```sql
CREATE TABLE parts_xref_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id VARCHAR(20) UNIQUE NOT NULL,
  part_numbers TEXT[] NOT NULL,
  description TEXT,
  total_uses INTEGER DEFAULT 0,
  combined_stock INTEGER DEFAULT 0,
  auto_replenish BOOLEAN DEFAULT TRUE,
  min_stock INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_xref_groups_part_numbers ON parts_xref_groups USING GIN(part_numbers);
```

**parts_ai_data**
```sql
CREATE TABLE parts_ai_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_number VARCHAR(100) UNIQUE NOT NULL,
  ai_response_full JSONB,
  key_specs TEXT,
  testing_guide TEXT,
  common_failures TEXT,
  date_generated TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_parts_ai_part ON parts_ai_data(part_number);
```

**model_database**
```sql
CREATE TABLE model_database (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  compilation_id VARCHAR(20) UNIQUE NOT NULL,
  brand VARCHAR(100) NOT NULL,
  model_number VARCHAR(100) NOT NULL,
  model_family VARCHAR(100),
  aliases TEXT[],
  appliance_type VARCHAR(50),
  verified BOOLEAN DEFAULT FALSE,
  last_verified_date TIMESTAMP,
  times_used INTEGER DEFAULT 0,
  last_used TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX idx_model_db_model ON model_database(model_number);
CREATE INDEX idx_model_db_brand ON model_database(brand);
CREATE INDEX idx_model_db_type ON model_database(appliance_type);
```

**model_compilation_items**
```sql
CREATE TABLE model_compilation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id VARCHAR(20) UNIQUE NOT NULL,
  compilation_id VARCHAR(20) REFERENCES model_database(compilation_id),
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
  added_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_model_items_compilation ON model_compilation_items(compilation_id);
CREATE INDEX idx_model_items_type ON model_compilation_items(item_type);
CREATE INDEX idx_model_items_part ON model_compilation_items(part_number);
```

**common_issues**
```sql
CREATE TABLE common_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id VARCHAR(20) UNIQUE NOT NULL,
  model_number VARCHAR(100) NOT NULL,
  issue_description TEXT NOT NULL,
  frequency VARCHAR(20),
  frequency_count INTEGER DEFAULT 0,
  typical_parts TEXT[],
  diagnostic_steps TEXT,
  resolution_notes TEXT,
  success_rate DECIMAL(5,2),
  source VARCHAR(50),
  source_details TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_occurrence TIMESTAMP,
  active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_common_issues_model ON common_issues(model_number);
CREATE INDEX idx_common_issues_active ON common_issues(active);
```

---

## 📁 File Structure

Create these new files:

```
src/
├── lib/
│   └── claude-api.ts          # Claude API integration
├── stores/
│   ├── ai-store.ts            # AI data store
│   └── model-store.ts         # Model compilation store
└── components/
    ├── parts/
    │   ├── PartCrossReference.tsx
    │   ├── XRefGroupManager.tsx
    │   └── AIDataVerification.tsx
    └── models/
        ├── ModelCompilation.tsx
        ├── CompilationItemList.tsx
        └── CommonIssuesList.tsx
```

---

## 💻 Implementation

### Step 1: Claude API Integration

**src/lib/claude-api.ts**
```typescript
import Anthropic from '@anthropic-ai/sdk';

// Initialize Claude client
// Note: In production, route through backend to protect API key
const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true // Only for development
});

export interface PartCrossReference {
  partNumber: string;
  brand: string;
  compatibilityLevel: 'Exact' | 'Direct Replacement' | 'Universal' | 'Requires Modification' | 'Not Compatible';
  keySpecs: string;
  installationDifferences?: string;
}

export interface PartAnalysis {
  keySpecs: string;
  oemCrossRefs: PartCrossReference[];
  aftermarketAlternatives: PartCrossReference[];
  universalFit: PartCrossReference[];
  testingProcedure: {
    steps: string[];
    expectedReadings: string;
    commonFailures: string[];
  };
}

export interface ModelCompilationItem {
  type: 'Owner\'s Manual' | 'Service Manual' | 'Parts Diagram' | 'Diagnostic Mode Guide' | 
        'Teardown Video' | 'Testing Guide' | 'Installation Guide' | 'Troubleshooting Doc' | 
        'Common Issues List' | 'Repair Tip' | 'Recall Notice';
  title: string;
  url: string;
  description: string;
  scope: 'Model-Specific' | 'Part-Specific' | 'Universal' | 'Brand-Wide' | 'Category-Wide';
}

export interface ModelCompilation {
  brand: string;
  modelNumber: string;
  applianceType: string;
  items: ModelCompilationItem[];
  commonIssues: {
    description: string;
    frequency: string;
    typicalParts: string[];
    diagnosticSteps: string;
  }[];
}

/**
 * Analyze a part and get cross-references using Claude
 */
export async function analyzePartWithClaude(partNumber: string): Promise<PartAnalysis> {
  const prompt = `Part Number: ${partNumber}

Please provide comprehensive cross-reference information in valid JSON format.

Return ONLY a JSON object with this exact structure (no markdown, no code blocks):
{
  "keySpecs": "Brief description including type, voltage, dimensions, compatibility",
  "oemCrossRefs": [
    {
      "partNumber": "exact part number",
      "brand": "manufacturer name",
      "compatibilityLevel": "Exact",
      "keySpecs": "specifications",
      "installationDifferences": "any differences or None"
    }
  ],
  "aftermarketAlternatives": [
    {
      "partNumber": "part number",
      "brand": "brand name",
      "compatibilityLevel": "Direct Replacement",
      "keySpecs": "specifications",
      "installationDifferences": "differences or None"
    }
  ],
  "universalFit": [
    {
      "partNumber": "universal part number",
      "brand": "brand name",
      "compatibilityLevel": "Universal",
      "keySpecs": "specifications",
      "installationDifferences": "any modifications needed"
    }
  ],
  "testingProcedure": {
    "steps": ["step 1", "step 2", "step 3"],
    "expectedReadings": "what readings should be normal",
    "commonFailures": ["failure mode 1", "failure mode 2"]
  }
}

Focus on:
1. Exact OEM equivalents (same manufacturer, different part numbers)
2. Aftermarket direct replacements (different manufacturers, same specs)
3. Universal fit options (fits many models)
4. Clear testing procedures
5. Common failure modes

Return ONLY valid JSON. Do not include markdown formatting, code blocks, or explanatory text.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    // Extract text content
    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => block.type === 'text' ? block.text : '')
      .join('');

    // Strip markdown code blocks if present
    let cleanedResponse = responseText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    // Parse JSON
    const analysis = JSON.parse(cleanedResponse) as PartAnalysis;

    return analysis;
  } catch (error) {
    console.error('Error analyzing part with Claude:', error);
    throw new Error(`Failed to analyze part: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get model-specific repair aids compilation
 */
export async function compileModelResources(
  brand: string,
  modelNumber: string,
  applianceType: string
): Promise<ModelCompilation> {
  const prompt = `Brand: ${brand}
Model: ${modelNumber}
Appliance Type: ${applianceType}

Please compile repair resources for this appliance model. Return ONLY a JSON object with this exact structure (no markdown, no code blocks):
{
  "brand": "${brand}",
  "modelNumber": "${modelNumber}",
  "applianceType": "${applianceType}",
  "items": [
    {
      "type": "Service Manual",
      "title": "descriptive title",
      "url": "actual URL if available or empty string",
      "description": "what this resource contains",
      "scope": "Model-Specific"
    }
  ],
  "commonIssues": [
    {
      "description": "specific problem description",
      "frequency": "High/Medium/Low",
      "typicalParts": ["part number 1", "part number 2"],
      "diagnosticSteps": "how to diagnose this issue"
    }
  ]
}

Include these resource types if available:
- Service Manual
- Parts Diagram
- Diagnostic Mode Guide
- Owner's Manual
- Common troubleshooting procedures

Focus on:
1. Known common failures for this model
2. Diagnostic procedures
3. Repair difficulty level
4. Critical replacement parts
5. Safety warnings

Return ONLY valid JSON without markdown formatting.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    // Extract and clean response
    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => block.type === 'text' ? block.text : '')
      .join('');

    let cleanedResponse = responseText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    const compilation = JSON.parse(cleanedResponse) as ModelCompilation;

    return compilation;
  } catch (error) {
    console.error('Error compiling model resources:', error);
    throw new Error(`Failed to compile model resources: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get specific repair guidance for a problem
 */
export async function getRepairGuidance(
  applianceType: string,
  brand: string,
  modelNumber: string,
  issue: string
): Promise<string> {
  const prompt = `I need repair guidance for:
Appliance: ${applianceType}
Brand: ${brand}
Model: ${modelNumber}
Issue: ${issue}

Please provide:
1. Most likely causes (in order of probability)
2. Diagnostic steps to confirm each cause
3. Required parts with part numbers if known
4. Repair difficulty (1-5 scale)
5. Safety warnings
6. Estimated repair time

Be specific and practical for a field technician.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => block.type === 'text' ? block.text : '')
      .join('');

    return responseText;
  } catch (error) {
    console.error('Error getting repair guidance:', error);
    throw new Error(`Failed to get repair guidance: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

---

### Step 2: AI Data Store

**src/stores/ai-store.ts**
```typescript
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { analyzePartWithClaude, PartAnalysis } from '../lib/claude-api';

interface CrossReference {
  id: string;
  primary_part: string;
  alt_part_number: string;
  brand: string;
  compatibility_level: string;
  key_specs: string;
  installation_differences?: string;
  ai_source: string;
  date_added: string;
  verified: boolean;
  verified_by?: string;
  verified_date?: string;
  times_used: number;
  notes?: string;
}

interface XRefGroup {
  id: string;
  group_id: string;
  part_numbers: string[];
  description: string;
  total_uses: number;
  combined_stock: number;
  auto_replenish: boolean;
  min_stock: number;
  created_at: string;
  updated_at: string;
}

interface AIStore {
  crossReferences: Map<string, CrossReference[]>;
  xrefGroups: XRefGroup[];
  loading: boolean;
  error: string | null;

  // Cross-reference operations
  lookupPartCrossReferences: (partNumber: string) => Promise<CrossReference[]>;
  verifyXRef: (id: string, verified: boolean) => Promise<void>;
  incrementXRefUsage: (id: string) => Promise<void>;

  // XRef group operations
  fetchXRefGroups: () => Promise<void>;
  createXRefGroup: (partNumbers: string[], description: string) => Promise<string>;
  getGroupForPart: (partNumber: string) => XRefGroup | undefined;

  // AI analysis
  analyzeNewPart: (partNumber: string) => Promise<PartAnalysis>;
}

export const useAIStore = create<AIStore>((set, get) => ({
  crossReferences: new Map(),
  xrefGroups: [],
  loading: false,
  error: null,

  /**
   * Look up cross-references for a part
   * First checks database, then calls AI if not found
   */
  lookupPartCrossReferences: async (partNumber: string) => {
    set({ loading: true, error: null });

    try {
      // Check if already in local cache
      const cached = get().crossReferences.get(partNumber);
      if (cached) {
        set({ loading: false });
        return cached;
      }

      // Check database
      const { data: existing, error: fetchError } = await supabase
        .from('parts_cross_reference')
        .select('*')
        .or(`primary_part.eq.${partNumber},alt_part_number.eq.${partNumber}`);

      if (fetchError) throw fetchError;

      if (existing && existing.length > 0) {
        // Found in database
        const xrefs = existing as CrossReference[];
        
        // Cache it
        const cache = new Map(get().crossReferences);
        cache.set(partNumber, xrefs);
        set({ crossReferences: cache, loading: false });

        return xrefs;
      }

      // Not in database - analyze with AI
      console.log('Analyzing new part with AI:', partNumber);
      const analysis = await analyzePartWithClaude(partNumber);

      // Save AI response
      const { error: aiDataError } = await supabase
        .from('parts_ai_data')
        .insert({
          part_number: partNumber,
          ai_response_full: analysis,
          key_specs: analysis.keySpecs,
          testing_guide: JSON.stringify(analysis.testingProcedure)
        });

      if (aiDataError) console.error('Error saving AI data:', aiDataError);

      // Save cross-references
      const allXRefs = [
        ...analysis.oemCrossRefs,
        ...analysis.aftermarketAlternatives,
        ...analysis.universalFit
      ];

      const xrefRecords = allXRefs.map(xref => ({
        primary_part: partNumber,
        alt_part_number: xref.partNumber,
        brand: xref.brand,
        compatibility_level: xref.compatibilityLevel,
        key_specs: xref.keySpecs,
        installation_differences: xref.installationDifferences || 'None',
        ai_source: 'Claude',
        verified: false
      }));

      const { data: savedXRefs, error: xrefError } = await supabase
        .from('parts_cross_reference')
        .insert(xrefRecords)
        .select();

      if (xrefError) throw xrefError;

      // Create cross-reference group
      const allPartNumbers = [
        partNumber,
        ...allXRefs
          .filter(x => x.compatibilityLevel === 'Exact' || x.compatibilityLevel === 'Direct Replacement')
          .map(x => x.partNumber)
      ];

      if (allPartNumbers.length > 1) {
        await get().createXRefGroup(allPartNumbers, `${partNumber} Compatible Group`);
      }

      // Cache and return
      const xrefs = savedXRefs as CrossReference[];
      const cache = new Map(get().crossReferences);
      cache.set(partNumber, xrefs);
      set({ crossReferences: cache, loading: false });

      return xrefs;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message, loading: false });
      throw error;
    }
  },

  /**
   * Verify or flag a cross-reference
   */
  verifyXRef: async (id: string, verified: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('parts_cross_reference')
        .update({
          verified,
          verified_by: user.id,
          verified_date: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Update cache
      const cache = new Map(get().crossReferences);
      for (const [key, xrefs] of cache.entries()) {
        const updated = xrefs.map(xref => 
          xref.id === id ? { ...xref, verified, verified_by: user.id } : xref
        );
        cache.set(key, updated);
      }
      set({ crossReferences: cache });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message });
      throw error;
    }
  },

  /**
   * Increment times used counter
   */
  incrementXRefUsage: async (id: string) => {
    try {
      const { error } = await supabase.rpc('increment_xref_usage', { xref_id: id });
      if (error) throw error;
    } catch (error) {
      console.error('Error incrementing xref usage:', error);
    }
  },

  /**
   * Fetch all cross-reference groups
   */
  fetchXRefGroups: async () => {
    try {
      const { data, error } = await supabase
        .from('parts_xref_groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ xrefGroups: data as XRefGroup[] });
    } catch (error) {
      console.error('Error fetching xref groups:', error);
    }
  },

  /**
   * Create a new cross-reference group
   */
  createXRefGroup: async (partNumbers: string[], description: string) => {
    try {
      // Generate group ID
      const { data: existing } = await supabase
        .from('parts_xref_groups')
        .select('group_id')
        .order('created_at', { ascending: false })
        .limit(1);

      let nextNum = 1;
      if (existing && existing.length > 0) {
        const lastId = existing[0].group_id;
        const match = lastId.match(/GRP-(\d+)/);
        if (match) {
          nextNum = parseInt(match[1]) + 1;
        }
      }

      const groupId = `GRP-${String(nextNum).padStart(3, '0')}`;

      const { data, error } = await supabase
        .from('parts_xref_groups')
        .insert({
          group_id: groupId,
          part_numbers: partNumbers,
          description,
          min_stock: 1
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      set(state => ({
        xrefGroups: [data as XRefGroup, ...state.xrefGroups]
      }));

      return groupId;
    } catch (error) {
      console.error('Error creating xref group:', error);
      throw error;
    }
  },

  /**
   * Get the cross-reference group for a specific part
   */
  getGroupForPart: (partNumber: string) => {
    return get().xrefGroups.find(group => 
      group.part_numbers.includes(partNumber)
    );
  },

  /**
   * Analyze a new part with AI
   */
  analyzeNewPart: async (partNumber: string) => {
    set({ loading: true, error: null });

    try {
      const analysis = await analyzePartWithClaude(partNumber);
      set({ loading: false });
      return analysis;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message, loading: false });
      throw error;
    }
  }
}));

// Create RPC function for incrementing usage
// Run this in Supabase SQL editor:
/*
CREATE OR REPLACE FUNCTION increment_xref_usage(xref_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE parts_cross_reference
  SET times_used = times_used + 1
  WHERE id = xref_id;
END;
$$ LANGUAGE plpgsql;
*/
```

---

### Step 3: Model Compilation Store

**src/stores/model-store.ts**
```typescript
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { compileModelResources, ModelCompilation as AIModelCompilation } from '../lib/claude-api';

interface ModelRecord {
  id: string;
  compilation_id: string;
  brand: string;
  model_number: string;
  model_family?: string;
  aliases: string[];
  appliance_type: string;
  verified: boolean;
  last_verified_date?: string;
  times_used: number;
  last_used?: string;
  created_at: string;
  notes?: string;
}

interface CompilationItem {
  id: string;
  item_id: string;
  compilation_id: string;
  item_type: string;
  resource_url?: string;
  title: string;
  description?: string;
  tags: string[];
  scope: string;
  part_number?: string;
  source: string;
  ai_generated: boolean;
  verified: boolean;
  flagged: boolean;
  flag_reason?: string;
  useful_count: number;
  view_count: number;
  created_at: string;
  added_by?: string;
}

interface CommonIssue {
  id: string;
  issue_id: string;
  model_number: string;
  issue_description: string;
  frequency: string;
  frequency_count: number;
  typical_parts: string[];
  diagnostic_steps?: string;
  resolution_notes?: string;
  success_rate?: number;
  source: string;
  source_details?: string;
  created_at: string;
  last_occurrence?: string;
  active: boolean;
}

interface ModelStore {
  models: Map<string, ModelRecord>;
  compilationItems: Map<string, CompilationItem[]>;
  commonIssues: Map<string, CommonIssue[]>;
  loading: boolean;
  error: string | null;

  // Model operations
  lookupModel: (modelNumber: string, brand: string, applianceType: string) => Promise<ModelRecord>;
  incrementModelUsage: (compilationId: string) => Promise<void>;

  // Compilation item operations
  fetchCompilationItems: (compilationId: string) => Promise<CompilationItem[]>;
  markItemAsViewed: (itemId: string) => Promise<void>;
  markItemAsUseful: (itemId: string) => Promise<void>;
  flagItem: (itemId: string, reason: string) => Promise<void>;
  verifyItem: (itemId: string) => Promise<void>;

  // Common issues
  fetchCommonIssues: (modelNumber: string) => Promise<CommonIssue[]>;

  // AI compilation
  compileModelWithAI: (brand: string, modelNumber: string, applianceType: string) => Promise<void>;
}

export const useModelStore = create<ModelStore>((set, get) => ({
  models: new Map(),
  compilationItems: new Map(),
  commonIssues: new Map(),
  loading: false,
  error: null,

  /**
   * Look up a model compilation (database first, then AI)
   */
  lookupModel: async (modelNumber: string, brand: string, applianceType: string) => {
    set({ loading: true, error: null });

    try {
      // Check cache
      const cacheKey = `${brand}-${modelNumber}`;
      const cached = get().models.get(cacheKey);
      if (cached) {
        set({ loading: false });
        return cached;
      }

      // Check database
      const { data: existing, error: fetchError } = await supabase
        .from('model_database')
        .select('*')
        .eq('model_number', modelNumber)
        .eq('brand', brand)
        .single();

      if (existing && !fetchError) {
        const model = existing as ModelRecord;
        
        // Cache it
        const cache = new Map(get().models);
        cache.set(cacheKey, model);
        set({ models: cache, loading: false });

        return model;
      }

      // Not found - compile with AI
      await get().compileModelWithAI(brand, modelNumber, applianceType);

      // Fetch the newly created record
      const { data: newModel, error: newError } = await supabase
        .from('model_database')
        .select('*')
        .eq('model_number', modelNumber)
        .eq('brand', brand)
        .single();

      if (newError) throw newError;

      const model = newModel as ModelRecord;
      const cache = new Map(get().models);
      cache.set(cacheKey, model);
      set({ models: cache, loading: false });

      return model;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message, loading: false });
      throw error;
    }
  },

  /**
   * Increment model usage counter
   */
  incrementModelUsage: async (compilationId: string) => {
    try {
      const { error } = await supabase.rpc('increment_model_usage', { comp_id: compilationId });
      if (error) throw error;
    } catch (error) {
      console.error('Error incrementing model usage:', error);
    }
  },

  /**
   * Fetch compilation items for a model
   */
  fetchCompilationItems: async (compilationId: string) => {
    try {
      // Check cache
      const cached = get().compilationItems.get(compilationId);
      if (cached) return cached;

      const { data, error } = await supabase
        .from('model_compilation_items')
        .select('*')
        .eq('compilation_id', compilationId)
        .order('item_type', { ascending: true });

      if (error) throw error;

      const items = data as CompilationItem[];
      const cache = new Map(get().compilationItems);
      cache.set(compilationId, items);
      set({ compilationItems: cache });

      return items;
    } catch (error) {
      console.error('Error fetching compilation items:', error);
      return [];
    }
  },

  /**
   * Mark item as viewed
   */
  markItemAsViewed: async (itemId: string) => {
    try {
      const { error } = await supabase.rpc('increment_item_views', { item_id: itemId });
      if (error) throw error;
    } catch (error) {
      console.error('Error marking item as viewed:', error);
    }
  },

  /**
   * Mark item as useful
   */
  markItemAsUseful: async (itemId: string) => {
    try {
      const { error } = await supabase.rpc('increment_item_useful', { item_id: itemId });
      if (error) throw error;
    } catch (error) {
      console.error('Error marking item as useful:', error);
    }
  },

  /**
   * Flag an item as incorrect
   */
  flagItem: async (itemId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('model_compilation_items')
        .update({
          flagged: true,
          flag_reason: reason
        })
        .eq('item_id', itemId);

      if (error) throw error;
    } catch (error) {
      console.error('Error flagging item:', error);
      throw error;
    }
  },

  /**
   * Verify an item
   */
  verifyItem: async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('model_compilation_items')
        .update({ verified: true })
        .eq('item_id', itemId);

      if (error) throw error;
    } catch (error) {
      console.error('Error verifying item:', error);
      throw error;
    }
  },

  /**
   * Fetch common issues for a model
   */
  fetchCommonIssues: async (modelNumber: string) => {
    try {
      // Check cache
      const cached = get().commonIssues.get(modelNumber);
      if (cached) return cached;

      const { data, error } = await supabase
        .from('common_issues')
        .select('*')
        .eq('model_number', modelNumber)
        .eq('active', true)
        .order('frequency_count', { ascending: false });

      if (error) throw error;

      const issues = data as CommonIssue[];
      const cache = new Map(get().commonIssues);
      cache.set(modelNumber, issues);
      set({ commonIssues: cache });

      return issues;
    } catch (error) {
      console.error('Error fetching common issues:', error);
      return [];
    }
  },

  /**
   * Compile model resources with AI
   */
  compileModelWithAI: async (brand: string, modelNumber: string, applianceType: string) => {
    set({ loading: true, error: null });

    try {
      console.log('Compiling model with AI:', brand, modelNumber);
      const compilation = await compileModelResources(brand, modelNumber, applianceType);

      // Generate compilation ID
      const { data: existing } = await supabase
        .from('model_database')
        .select('compilation_id')
        .order('created_at', { ascending: false })
        .limit(1);

      let nextNum = 1;
      if (existing && existing.length > 0) {
        const lastId = existing[0].compilation_id;
        const match = lastId.match(/COMP-(\d+)/);
        if (match) {
          nextNum = parseInt(match[1]) + 1;
        }
      }

      const compilationId = `COMP-${String(nextNum).padStart(4, '0')}`;

      // Save model record
      const { error: modelError } = await supabase
        .from('model_database')
        .insert({
          compilation_id: compilationId,
          brand: compilation.brand,
          model_number: compilation.modelNumber,
          appliance_type: compilation.applianceType,
          verified: false
        });

      if (modelError) throw modelError;

      // Get user ID
      const { data: { user } } = await supabase.auth.getUser();

      // Save compilation items
      const items = compilation.items.map((item, index) => ({
        item_id: `ITEM-${String(index + 1).padStart(4, '0')}`,
        compilation_id: compilationId,
        item_type: item.type,
        resource_url: item.url || null,
        title: item.title,
        description: item.description,
        tags: [],
        scope: item.scope,
        source: 'AI Search',
        ai_generated: true,
        verified: false,
        added_by: user?.id
      }));

      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from('model_compilation_items')
          .insert(items);

        if (itemsError) throw itemsError;
      }

      // Save common issues
      const issues = compilation.commonIssues.map((issue, index) => ({
        issue_id: `ISS-${String(index + 1).padStart(4, '0')}`,
        model_number: compilation.modelNumber,
        issue_description: issue.description,
        frequency: issue.frequency,
        typical_parts: issue.typicalParts,
        diagnostic_steps: issue.diagnosticSteps,
        source: 'AI Research'
      }));

      if (issues.length > 0) {
        const { error: issuesError } = await supabase
          .from('common_issues')
          .insert(issues);

        if (issuesError) throw issuesError;
      }

      set({ loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message, loading: false });
      throw error;
    }
  }
}));

// Create RPC functions in Supabase
/*
CREATE OR REPLACE FUNCTION increment_model_usage(comp_id VARCHAR)
RETURNS VOID AS $$
BEGIN
  UPDATE model_database
  SET times_used = times_used + 1,
      last_used = NOW()
  WHERE compilation_id = comp_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_item_views(item_id VARCHAR)
RETURNS VOID AS $$
BEGIN
  UPDATE model_compilation_items
  SET view_count = view_count + 1
  WHERE item_id = item_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_item_useful(item_id VARCHAR)
RETURNS VOID AS $$
BEGIN
  UPDATE model_compilation_items
  SET useful_count = useful_count + 1
  WHERE item_id = item_id;
END;
$$ LANGUAGE plpgsql;
*/
```

---

### Step 4: Part Cross-Reference Component

**src/components/parts/PartCrossReference.tsx**
```typescript
import { useState, useEffect } from 'react';
import { useAIStore } from '../../stores/ai-store';

interface Props {
  partNumber: string;
  onSelectPart?: (partNumber: string) => void;
}

export default function PartCrossReference({ partNumber, onSelectPart }: Props) {
  const { lookupPartCrossReferences, verifyXRef, getGroupForPart, loading, error } = useAIStore();
  const [xrefs, setXRefs] = useState<any[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadCrossReferences();
  }, [partNumber]);

  const loadCrossReferences = async () => {
    try {
      const refs = await lookupPartCrossReferences(partNumber);
      setXRefs(refs);
    } catch (err) {
      console.error('Error loading cross-references:', err);
    }
  };

  const handleVerify = async (id: string, verified: boolean) => {
    try {
      await verifyXRef(id, verified);
      await loadCrossReferences();
    } catch (err) {
      console.error('Error verifying xref:', err);
    }
  };

  const group = getGroupForPart(partNumber);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Analyzing part with AI...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  if (xrefs.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-gray-600">No cross-references found for this part.</p>
      </div>
    );
  }

  const oemRefs = xrefs.filter(x => x.compatibility_level === 'Exact');
  const aftermarket = xrefs.filter(x => x.compatibility_level === 'Direct Replacement');
  const universal = xrefs.filter(x => x.compatibility_level === 'Universal');

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Cross-References for {partNumber}
        </h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          {showDetails ? 'Hide' : 'Show'} Details
        </button>
      </div>

      {group && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-800">
            <strong>Group:</strong> {group.group_id} - {group.description}
          </p>
          <p className="text-sm text-blue-700 mt-1">
            Combined stock: {group.combined_stock} | Total uses: {group.total_uses}
          </p>
        </div>
      )}

      {/* OEM Equivalents */}
      {oemRefs.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            OEM Equivalents ({oemRefs.length})
          </h4>
          <div className="space-y-3">
            {oemRefs.map(ref => (
              <XRefCard
                key={ref.id}
                xref={ref}
                showDetails={showDetails}
                onVerify={handleVerify}
                onSelect={onSelectPart}
              />
            ))}
          </div>
        </div>
      )}

      {/* Aftermarket */}
      {aftermarket.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            Aftermarket Alternatives ({aftermarket.length})
          </h4>
          <div className="space-y-3">
            {aftermarket.map(ref => (
              <XRefCard
                key={ref.id}
                xref={ref}
                showDetails={showDetails}
                onVerify={handleVerify}
                onSelect={onSelectPart}
              />
            ))}
          </div>
        </div>
      )}

      {/* Universal Fit */}
      {universal.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
            Universal Fit ({universal.length})
          </h4>
          <div className="space-y-3">
            {universal.map(ref => (
              <XRefCard
                key={ref.id}
                xref={ref}
                showDetails={showDetails}
                onVerify={handleVerify}
                onSelect={onSelectPart}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          ⚠️ This cross-reference data was AI-generated. Please verify compatibility before use.
        </p>
      </div>
    </div>
  );
}

interface XRefCardProps {
  xref: any;
  showDetails: boolean;
  onVerify: (id: string, verified: boolean) => void;
  onSelect?: (partNumber: string) => void;
}

function XRefCard({ xref, showDetails, onVerify, onSelect }: XRefCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-gray-900">
              {xref.alt_part_number}
            </span>
            <span className="text-sm text-gray-600">({xref.brand})</span>
            {xref.verified && (
              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                ✓ Verified
              </span>
            )}
          </div>
          {showDetails && (
            <div className="mt-2 text-sm text-gray-600 space-y-1">
              <p><strong>Specs:</strong> {xref.key_specs}</p>
              {xref.installation_differences && xref.installation_differences !== 'None' && (
                <p><strong>Installation:</strong> {xref.installation_differences}</p>
              )}
              <p className="text-xs text-gray-500">
                Used {xref.times_used} times • Added {new Date(xref.date_added).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {onSelect && (
            <button
              onClick={() => onSelect(xref.alt_part_number)}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Use This
            </button>
          )}
          {!xref.verified && (
            <button
              onClick={() => onVerify(xref.id, true)}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              ✓ Verify
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

### Step 5: Model Compilation Component

**src/components/models/ModelCompilation.tsx**
```typescript
import { useState, useEffect } from 'react';
import { useModelStore } from '../../stores/model-store';

interface Props {
  brand: string;
  modelNumber: string;
  applianceType: string;
}

export default function ModelCompilation({ brand, modelNumber, applianceType }: Props) {
  const { 
    lookupModel, 
    fetchCompilationItems, 
    fetchCommonIssues,
    markItemAsViewed,
    markItemAsUseful,
    loading 
  } = useModelStore();

  const [model, setModel] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'items' | 'issues'>('items');

  useEffect(() => {
    loadModel();
  }, [brand, modelNumber, applianceType]);

  const loadModel = async () => {
    try {
      const modelData = await lookupModel(modelNumber, brand, applianceType);
      setModel(modelData);

      const itemsData = await fetchCompilationItems(modelData.compilation_id);
      setItems(itemsData);

      const issuesData = await fetchCommonIssues(modelNumber);
      setIssues(issuesData);
    } catch (err) {
      console.error('Error loading model:', err);
    }
  };

  const handleViewItem = async (itemId: string, url?: string) => {
    await markItemAsViewed(itemId);
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleMarkUseful = async (itemId: string) => {
    await markItemAsUseful(itemId);
    await loadModel(); // Refresh to show updated count
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Compiling model resources with AI...</span>
        </div>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-gray-600">No model data available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">{brand} {modelNumber}</h2>
        <p className="text-gray-600 mt-1">{applianceType}</p>
        {!model.verified && (
          <p className="text-yellow-600 text-sm mt-2">
            ⚠️ AI-generated compilation - Please verify accuracy
          </p>
        )}
      </div>

      <div className="border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('items')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'items'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Resources ({items.length})
          </button>
          <button
            onClick={() => setActiveTab('issues')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'issues'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Common Issues ({issues.length})
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'items' && (
          <div className="space-y-4">
            {items.length === 0 ? (
              <p className="text-gray-600">No resources available for this model.</p>
            ) : (
              items.map(item => (
                <div key={item.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                          {item.item_type}
                        </span>
                        {item.verified && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                            ✓ Verified
                          </span>
                        )}
                        {item.flagged && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                            ⚠ Flagged
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-gray-900 mt-2">{item.title}</h4>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>👁️ {item.view_count} views</span>
                        <span>👍 {item.useful_count} helpful</span>
                        <span>Scope: {item.scope}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      {item.resource_url && (
                        <button
                          onClick={() => handleViewItem(item.item_id, item.resource_url)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          View
                        </button>
                      )}
                      <button
                        onClick={() => handleMarkUseful(item.item_id)}
                        className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                      >
                        👍 Helpful
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'issues' && (
          <div className="space-y-4">
            {issues.length === 0 ? (
              <p className="text-gray-600">No common issues documented for this model.</p>
            ) : (
              issues.map(issue => (
                <div key={issue.id} className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          issue.frequency === 'High' ? 'bg-red-100 text-red-800' :
                          issue.frequency === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {issue.frequency} Frequency
                        </span>
                        {issue.frequency_count > 0 && (
                          <span className="text-xs text-gray-600">
                            ({issue.frequency_count} reported cases)
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-gray-900">{issue.issue_description}</h4>
                      {issue.typical_parts && issue.typical_parts.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-700">Typical Parts:</p>
                          <p className="text-sm text-gray-600">{issue.typical_parts.join(', ')}</p>
                        </div>
                      )}
                      {issue.diagnostic_steps && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-700">Diagnostic Steps:</p>
                          <p className="text-sm text-gray-600">{issue.diagnostic_steps}</p>
                        </div>
                      )}
                      {issue.resolution_notes && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-700">Resolution:</p>
                          <p className="text-sm text-gray-600">{issue.resolution_notes}</p>
                        </div>
                      )}
                      {issue.success_rate && (
                        <p className="text-sm text-gray-600 mt-2">
                          Success Rate: {issue.success_rate}%
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 🧪 Testing

### Test the AI Integration:

1. **Test Part Analysis:**
```typescript
// In browser console or test file
import { analyzePartWithClaude } from './lib/claude-api';

const analysis = await analyzePartWithClaude('W10408179');
console.log('Analysis:', analysis);
```

2. **Test Model Compilation:**
```typescript
import { compileModelResources } from './lib/claude-api';

const compilation = await compileModelResources('Whirlpool', 'WRF555SDFZ', 'Refrigerator');
console.log('Compilation:', compilation);
```

3. **Test Cross-Reference Lookup:**
- Add a part to a job
- Enter a new part number
- Verify AI lookup triggers
- Check that cross-references save to database
- Verify group creation

4. **Test Model Compilation:**
- Create a job with brand/model
- Trigger model compilation
- Verify resources populate
- Check common issues display

5. **Test Verification System:**
- Mark a cross-reference as verified
- Flag an incorrect item
- Verify database updates

---

## ✅ Success Criteria

Stage 6 is complete when:

- [ ] Claude API key configured in .env
- [ ] Can analyze new parts successfully
- [ ] Cross-references save to database
- [ ] XRef groups create automatically
- [ ] Model compilations generate resources
- [ ] Common issues populate correctly
- [ ] Testing procedures display
- [ ] Verification system works
- [ ] AI data caches properly
- [ ] Error handling works (API failures)
- [ ] Loading states display correctly
- [ ] Can mark items as verified
- [ ] Can flag incorrect data
- [ ] Usage counters increment
- [ ] All AI-generated data marked as such

**Database:**
- [ ] All 6 new tables created
- [ ] Indexes in place
- [ ] RPC functions created
- [ ] No foreign key errors

**AI Responses:**
- [ ] Parts analysis returns valid JSON
- [ ] Model compilation returns resources
- [ ] Cross-references have correct format
- [ ] Testing procedures are detailed
- [ ] Common issues are relevant

**User Experience:**
- [ ] AI lookups happen automatically
- [ ] Loading indicators show during AI calls
- [ ] Results display clearly
- [ ] Users can verify/flag data
- [ ] Alternative parts are clickable
- [ ] Model resources are accessible

---

## 🔧 Troubleshooting

**API key errors:**
- Ensure VITE_ANTHROPIC_API_KEY in .env
- Check key is valid in Anthropic console
- Restart dev server after adding .env
- Check Anthropic console for API limits

**JSON parsing errors:**
- AI responses may include markdown formatting
- Strip ```json and ``` markers
- Handle malformed JSON gracefully
- Log raw response for debugging

**Cross-references not creating:**
- Check parts_cross_reference table exists
- Verify unique constraints
- Check AI response format
- Test with simple part number first

**Model compilation slow:**
- AI calls take 5-15 seconds
- Show loading states to user
- Cache results to avoid repeat calls
- Consider background processing

**Groups not forming:**
- Check xref_groups table
- Verify compatibility levels
- Test group creation separately
- Check part_numbers array format

---

## 📝 Notes for Next Stage

Stage 7 will build upon this AI foundation to add:
- Quote generation with parts and labor
- Invoice creation and PDF generation
- Payment tracking and methods
- Discount management
- Tax calculations
- Customer payment history

---

## 🎯 Summary

You now have:
- Claude API integration for intelligent assistance
- Automatic parts cross-reference lookup
- OEM and aftermarket alternatives identification
- Testing procedures for parts
- Model-specific repair aids compilation
- Common issues database
- Diagnostic guidance system
- Smart part recommendations
- Cross-reference groups for unified stock
- AI response caching
- Verification system for AI data

This AI integration provides intelligent, context-aware assistance throughout the repair process!

---

## 💡 Tips for Success

1. **Test API key**: Start with a simple part analysis to verify API connection
2. **Monitor API usage**: Claude API has rate limits and costs per call
3. **Cache aggressively**: Store AI responses to avoid repeat calls
4. **Verify AI data**: Always allow users to verify/flag AI-generated content
5. **Handle errors gracefully**: API may fail, timeout, or return malformed data
6. **Start with known parts**: Test with common parts that have many cross-references
7. **Review JSON responses**: Check that AI returns valid, parseable JSON

**Production Note**: The current setup uses dangerouslyAllowBrowser for demo purposes. In production, route all AI calls through your backend to protect the API key.

Stage 6 adds powerful AI capabilities - test thoroughly before moving to Stage 7!
