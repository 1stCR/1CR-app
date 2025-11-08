import Anthropic from '@anthropic-ai/sdk'

// Initialize Claude client
// Note: In production, route through backend to protect API key
const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true // Only for development
})

export interface PartCrossReference {
  partNumber: string
  brand: string
  compatibilityLevel: 'Exact' | 'Direct Replacement' | 'Universal' | 'Requires Modification' | 'Not Compatible'
  keySpecs: string
  installationDifferences?: string
}

export interface PartAnalysis {
  keySpecs: string
  oemCrossRefs: PartCrossReference[]
  aftermarketAlternatives: PartCrossReference[]
  universalFit: PartCrossReference[]
  testingProcedure: {
    steps: string[]
    expectedReadings: string
    commonFailures: string[]
  }
}

export interface ModelCompilationItem {
  type: 'Owner\'s Manual' | 'Service Manual' | 'Parts Diagram' | 'Diagnostic Mode Guide' |
        'Teardown Video' | 'Testing Guide' | 'Installation Guide' | 'Troubleshooting Doc' |
        'Common Issues List' | 'Repair Tip' | 'Recall Notice'
  title: string
  url: string
  description: string
  scope: 'Model-Specific' | 'Part-Specific' | 'Universal' | 'Brand-Wide' | 'Category-Wide'
}

export interface ModelCompilation {
  brand: string
  modelNumber: string
  applianceType: string
  items: ModelCompilationItem[]
  commonIssues: {
    description: string
    frequency: string
    typicalParts: string[]
    diagnosticSteps: string
  }[]
}

/**
 * Helper function to parse AI JSON responses with robust error handling
 * AMENDMENT 2: Enhanced JSON parsing prevents production crashes
 */
function parseAIResponse<T>(responseText: string, context: string): T {
  try {
    // Strip markdown code blocks
    let cleaned = responseText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()

    // Try direct parse first
    try {
      return JSON.parse(cleaned) as T
    } catch (firstError) {
      // Try to extract JSON object from surrounding text
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as T
      }
      throw firstError
    }
  } catch (error) {
    console.error(`Failed to parse AI response for ${context}:`, {
      raw: responseText.substring(0, 200),
      error: error instanceof Error ? error.message : 'Unknown'
    })
    throw new Error(
      `Invalid AI response format for ${context}. ` +
      `Please try again or contact support.`
    )
  }
}

/**
 * Helper to handle API timeouts
 * AMENDMENT 2: Prevents hung requests
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
  ])
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

Return ONLY valid JSON. Do not include markdown formatting, code blocks, or explanatory text.`

  try {
    const message = await callClaudeWithTimeout(async () => {
      return await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    }, 30000) // 30 second timeout

    // Extract text content
    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => block.type === 'text' ? block.text : '')
      .join('')

    // Parse JSON with robust error handling
    const analysis = parseAIResponse<PartAnalysis>(responseText, 'part analysis')

    return analysis
  } catch (error) {
    console.error('Error analyzing part with Claude:', error)

    // Provide user-friendly error messages
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error(`AI analysis timed out. Please try again.`)
      }
      if (error.message.includes('rate limit')) {
        throw new Error(`AI service is busy. Please wait a moment and try again.`)
      }
      if (error.message.includes('Invalid AI response')) {
        throw error // Already user-friendly
      }
    }

    throw new Error(`Failed to analyze part: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

Return ONLY valid JSON without markdown formatting.`

  try {
    const message = await callClaudeWithTimeout(async () => {
      return await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    }, 30000) // 30 second timeout

    // Extract and clean response
    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => block.type === 'text' ? block.text : '')
      .join('')

    const compilation = parseAIResponse<ModelCompilation>(responseText, 'model compilation')

    return compilation
  } catch (error) {
    console.error('Error compiling model resources:', error)

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error(`AI compilation timed out. Please try again.`)
      }
      if (error.message.includes('rate limit')) {
        throw new Error(`AI service is busy. Please wait a moment and try again.`)
      }
      if (error.message.includes('Invalid AI response')) {
        throw error
      }
    }

    throw new Error(`Failed to compile model resources: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

Be specific and practical for a field technician.`

  try {
    const message = await callClaudeWithTimeout(async () => {
      return await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    }, 30000)

    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => block.type === 'text' ? block.text : '')
      .join('')

    return responseText
  } catch (error) {
    console.error('Error getting repair guidance:', error)

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error(`AI guidance request timed out. Please try again.`)
      }
      if (error.message.includes('rate limit')) {
        throw new Error(`AI service is busy. Please wait a moment and try again.`)
      }
    }

    throw new Error(`Failed to get repair guidance: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
