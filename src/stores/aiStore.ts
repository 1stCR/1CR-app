import { create } from 'zustand'
import type { Job } from './jobStore'
import type { Part } from './partsStore'

// AI Suggestion Types
export interface DiagnosisSuggestion {
  appliance_type: string
  brand?: string
  common_issues: string[]
  recommended_checks: string[]
  typical_parts: string[]
  avg_repair_time_minutes: number
  confidence_score: number
}

export interface PartsSuggestion {
  part_number: string
  description: string
  reason: string
  likelihood: 'High' | 'Medium' | 'Low'
  in_stock: number
  avg_cost?: number
  alternatives?: string[]
}

export interface SimilarJob {
  job_id: string
  similarity_score: number
  appliance_type: string
  brand?: string
  issue_description: string
  resolution?: string
  parts_used?: string[]
  repair_time_minutes?: number
  completed_at?: string
}

export interface PriceEstimate {
  parts_cost_estimate: number
  labor_cost_estimate: number
  total_estimate: number
  confidence: 'High' | 'Medium' | 'Low'
  factors: string[]
}

export interface TimeEstimate {
  diagnosis_time_minutes: number
  repair_time_minutes: number
  total_time_minutes: number
  confidence: 'High' | 'Medium' | 'Low'
  factors: string[]
}

export interface CallbackRiskAnalysis {
  risk_level: 'Low' | 'Medium' | 'High'
  risk_factors: string[]
  recommendations: string[]
  similar_jobs_callback_rate: number
}

export interface AIInsight {
  type: 'tip' | 'warning' | 'recommendation' | 'pattern'
  title: string
  message: string
  priority: 'high' | 'medium' | 'low'
  action?: string
  created_at: string
}

// AI Store State
interface AIStore {
  // Suggestions cache
  diagnosisSuggestions: Map<string, DiagnosisSuggestion>
  partsSuggestions: Map<string, PartsSuggestion[]>
  similarJobs: Map<string, SimilarJob[]>
  priceEstimates: Map<string, PriceEstimate>
  timeEstimates: Map<string, TimeEstimate>
  callbackRisk: Map<string, CallbackRiskAnalysis>
  insights: AIInsight[]

  // State
  loading: boolean
  error: string | null

  // Diagnosis suggestions
  getDiagnosisSuggestions: (applianceType: string, brand?: string, issueDescription?: string) => Promise<DiagnosisSuggestion | null>

  // Parts suggestions
  suggestPartsForJob: (job: Job) => Promise<PartsSuggestion[]>

  // Similar jobs
  findSimilarJobs: (job: Job, limit?: number) => Promise<SimilarJob[]>

  // Price estimation
  estimateJobPrice: (job: Job) => Promise<PriceEstimate>

  // Time estimation
  estimateJobTime: (job: Job) => Promise<TimeEstimate>

  // Callback risk analysis
  analyzeCallbackRisk: (job: Job) => Promise<CallbackRiskAnalysis>

  // AI Insights
  generateInsightsForJob: (job: Job) => Promise<AIInsight[]>
  clearInsights: () => void

  // Learning functions (future enhancement)
  recordJobOutcome: (jobId: string, outcome: string) => Promise<void>

  // Cache management
  clearCache: () => void
}

export const useAIStore = create<AIStore>((set, get) => ({
  diagnosisSuggestions: new Map(),
  partsSuggestions: new Map(),
  similarJobs: new Map(),
  priceEstimates: new Map(),
  timeEstimates: new Map(),
  callbackRisk: new Map(),
  insights: [],
  loading: false,
  error: null,

  getDiagnosisSuggestions: async (applianceType, brand, issueDescription) => {
    const cacheKey = `${applianceType}:${brand || 'any'}`

    // Check cache first
    const cached = get().diagnosisSuggestions.get(cacheKey)
    if (cached) return cached

    set({ loading: true, error: null })
    try {
      // Simulate AI analysis (in production, this would call an ML model or knowledge base)
      const suggestion = await simulateDiagnosisAI(applianceType, brand, issueDescription)

      // Cache the result
      set(state => ({
        diagnosisSuggestions: new Map(state.diagnosisSuggestions).set(cacheKey, suggestion),
        loading: false
      }))

      return suggestion
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      return null
    }
  },

  suggestPartsForJob: async (job) => {
    const cacheKey = job.id

    // Check cache first
    const cached = get().partsSuggestions.get(cacheKey)
    if (cached) return cached

    set({ loading: true, error: null })
    try {
      // Simulate AI parts suggestion (in production, this would analyze historical data)
      const suggestions = await simulatePartsSuggestionAI(job)

      // Cache the result
      set(state => ({
        partsSuggestions: new Map(state.partsSuggestions).set(cacheKey, suggestions),
        loading: false
      }))

      return suggestions
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      return []
    }
  },

  findSimilarJobs: async (job, limit = 5) => {
    const cacheKey = job.id

    // Check cache first
    const cached = get().similarJobs.get(cacheKey)
    if (cached) return cached

    set({ loading: true, error: null })
    try {
      // Simulate AI similarity search (in production, this would use vector embeddings)
      const similar = await simulateSimilarJobsAI(job, limit)

      // Cache the result
      set(state => ({
        similarJobs: new Map(state.similarJobs).set(cacheKey, similar),
        loading: false
      }))

      return similar
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      return []
    }
  },

  estimateJobPrice: async (job) => {
    const cacheKey = job.id

    // Check cache first
    const cached = get().priceEstimates.get(cacheKey)
    if (cached) return cached

    set({ loading: true, error: null })
    try {
      // Simulate AI price estimation (in production, this would use regression models)
      const estimate = await simulatePriceEstimationAI(job)

      // Cache the result
      set(state => ({
        priceEstimates: new Map(state.priceEstimates).set(cacheKey, estimate),
        loading: false
      }))

      return estimate
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      return {
        parts_cost_estimate: 0,
        labor_cost_estimate: 0,
        total_estimate: 0,
        confidence: 'Low' as const,
        factors: ['Error estimating price']
      }
    }
  },

  estimateJobTime: async (job) => {
    const cacheKey = job.id

    // Check cache first
    const cached = get().timeEstimates.get(cacheKey)
    if (cached) return cached

    set({ loading: true, error: null })
    try {
      // Simulate AI time estimation (in production, this would analyze historical data)
      const estimate = await simulateTimeEstimationAI(job)

      // Cache the result
      set(state => ({
        timeEstimates: new Map(state.timeEstimates).set(cacheKey, estimate),
        loading: false
      }))

      return estimate
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      return {
        diagnosis_time_minutes: 60,
        repair_time_minutes: 120,
        total_time_minutes: 180,
        confidence: 'Low' as const,
        factors: ['Error estimating time']
      }
    }
  },

  analyzeCallbackRisk: async (job) => {
    const cacheKey = job.id

    // Check cache first
    const cached = get().callbackRisk.get(cacheKey)
    if (cached) return cached

    set({ loading: true, error: null })
    try {
      // Simulate AI callback risk analysis
      const analysis = await simulateCallbackRiskAI(job)

      // Cache the result
      set(state => ({
        callbackRisk: new Map(state.callbackRisk).set(cacheKey, analysis),
        loading: false
      }))

      return analysis
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      return {
        risk_level: 'Low' as const,
        risk_factors: [],
        recommendations: [],
        similar_jobs_callback_rate: 0
      }
    }
  },

  generateInsightsForJob: async (job) => {
    set({ loading: true, error: null })
    try {
      // Generate multiple AI insights
      const insights: AIInsight[] = []

      // Get diagnosis suggestions
      const diagnosis = await get().getDiagnosisSuggestions(
        job.appliance_type,
        job.brand,
        job.issue_description
      )

      if (diagnosis && diagnosis.confidence_score > 0.7) {
        insights.push({
          type: 'recommendation',
          title: 'Common Issues Detected',
          message: `Based on ${job.appliance_type} history, check: ${diagnosis.common_issues.slice(0, 2).join(', ')}`,
          priority: 'high',
          action: 'View diagnosis guide',
          created_at: new Date().toISOString()
        })
      }

      // Get parts suggestions
      const parts = await get().suggestPartsForJob(job)
      const highLikelihoodParts = parts.filter(p => p.likelihood === 'High')

      if (highLikelihoodParts.length > 0) {
        const lowStockParts = highLikelihoodParts.filter(p => p.in_stock < 2)
        if (lowStockParts.length > 0) {
          insights.push({
            type: 'warning',
            title: 'Low Stock Alert',
            message: `Likely needed parts are low in stock: ${lowStockParts.map(p => p.part_number).join(', ')}`,
            priority: 'high',
            action: 'Order parts',
            created_at: new Date().toISOString()
          })
        }
      }

      // Get callback risk
      const risk = await get().analyzeCallbackRisk(job)

      if (risk.risk_level === 'High') {
        insights.push({
          type: 'warning',
          title: 'High Callback Risk',
          message: risk.risk_factors[0] || 'This job type has high callback rate',
          priority: 'high',
          action: 'Review risk factors',
          created_at: new Date().toISOString()
        })
      }

      // Get similar jobs
      const similar = await get().findSimilarJobs(job, 3)

      if (similar.length > 0 && similar[0].similarity_score > 0.8) {
        insights.push({
          type: 'tip',
          title: 'Similar Job Found',
          message: `Similar job ${similar[0].job_id} completed in ${similar[0].repair_time_minutes || 'unknown'} minutes`,
          priority: 'medium',
          action: 'View similar jobs',
          created_at: new Date().toISOString()
        })
      }

      set({ insights, loading: false })
      return insights
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      return []
    }
  },

  clearInsights: () => {
    set({ insights: [] })
  },

  recordJobOutcome: async (jobId, outcome) => {
    // Placeholder for future ML training
    // In production, this would record outcomes for model improvement
    console.log('Recording job outcome for ML:', jobId, outcome)
  },

  clearCache: () => {
    set({
      diagnosisSuggestions: new Map(),
      partsSuggestions: new Map(),
      similarJobs: new Map(),
      priceEstimates: new Map(),
      timeEstimates: new Map(),
      callbackRisk: new Map(),
      insights: []
    })
  }
}))

// ============================================================================
// AI Simulation Functions
// These simulate AI/ML models. In production, these would be replaced with
// actual ML models, knowledge bases, or API calls to AI services
// ============================================================================

async function simulateDiagnosisAI(
  applianceType: string,
  brand?: string,
  issueDescription?: string
): Promise<DiagnosisSuggestion> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500))

  // Mock knowledge base
  const knowledgeBase: Record<string, DiagnosisSuggestion> = {
    'Refrigerator': {
      appliance_type: 'Refrigerator',
      brand: brand,
      common_issues: [
        'Defrost system failure',
        'Evaporator fan not working',
        'Compressor issues',
        'Temperature control malfunction',
        'Door seal problems'
      ],
      recommended_checks: [
        'Check defrost timer/control',
        'Test evaporator fan',
        'Inspect door seals',
        'Verify compressor operation',
        'Check temperature sensors'
      ],
      typical_parts: ['Defrost Timer', 'Evaporator Fan Motor', 'Door Gasket', 'Temperature Sensor'],
      avg_repair_time_minutes: 90,
      confidence_score: 0.85
    },
    'Dishwasher': {
      appliance_type: 'Dishwasher',
      brand: brand,
      common_issues: [
        'Not draining properly',
        'Not cleaning dishes',
        'Door latch problems',
        'Water inlet valve failure',
        'Heating element issues'
      ],
      recommended_checks: [
        'Check drain pump and filter',
        'Inspect spray arms',
        'Test door latch',
        'Verify water inlet valve',
        'Check heating element'
      ],
      typical_parts: ['Drain Pump', 'Spray Arm', 'Water Inlet Valve', 'Heating Element'],
      avg_repair_time_minutes: 75,
      confidence_score: 0.80
    },
    'Washing Machine': {
      appliance_type: 'Washing Machine',
      brand: brand,
      common_issues: [
        'Not spinning',
        'Leaking water',
        'Not draining',
        'Excessive vibration',
        'Door/lid won\'t lock'
      ],
      recommended_checks: [
        'Check drive belt',
        'Inspect door seal',
        'Test drain pump',
        'Verify shock absorbers',
        'Check door lock mechanism'
      ],
      typical_parts: ['Drive Belt', 'Door Seal', 'Drain Pump', 'Shock Absorber', 'Door Lock'],
      avg_repair_time_minutes: 85,
      confidence_score: 0.82
    },
    'Dryer': {
      appliance_type: 'Dryer',
      brand: brand,
      common_issues: [
        'Not heating',
        'Taking too long to dry',
        'Not spinning',
        'Excessive noise',
        'Won\'t start'
      ],
      recommended_checks: [
        'Check heating element',
        'Clean lint filter and vent',
        'Inspect drive belt',
        'Test thermal fuse',
        'Verify door switch'
      ],
      typical_parts: ['Heating Element', 'Thermal Fuse', 'Drive Belt', 'Drum Roller', 'Door Switch'],
      avg_repair_time_minutes: 70,
      confidence_score: 0.88
    }
  }

  return knowledgeBase[applianceType] || {
    appliance_type: applianceType,
    brand: brand,
    common_issues: ['General troubleshooting needed'],
    recommended_checks: ['Perform standard diagnostics'],
    typical_parts: [],
    avg_repair_time_minutes: 120,
    confidence_score: 0.50
  }
}

async function simulatePartsSuggestionAI(job: Job): Promise<PartsSuggestion[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300))

  // Mock parts database based on appliance type
  const partsDatabase: Record<string, PartsSuggestion[]> = {
    'Refrigerator': [
      {
        part_number: 'DEF-TIMER-001',
        description: 'Defrost Timer Assembly',
        reason: 'Common failure point for cooling issues',
        likelihood: 'High',
        in_stock: 3,
        avg_cost: 45.50,
        alternatives: ['DEF-TIMER-002']
      },
      {
        part_number: 'EVAP-FAN-001',
        description: 'Evaporator Fan Motor',
        reason: 'Frequently needed for airflow problems',
        likelihood: 'Medium',
        in_stock: 1,
        avg_cost: 78.00,
        alternatives: []
      }
    ],
    'Dishwasher': [
      {
        part_number: 'DRAIN-PUMP-001',
        description: 'Drain Pump Motor',
        reason: 'Most common cause of drainage issues',
        likelihood: 'High',
        in_stock: 2,
        avg_cost: 65.00,
        alternatives: ['DRAIN-PUMP-002']
      },
      {
        part_number: 'INLET-VALVE-001',
        description: 'Water Inlet Valve',
        reason: 'May be needed if water flow is affected',
        likelihood: 'Low',
        in_stock: 5,
        avg_cost: 35.00
      }
    ],
    'Washing Machine': [
      {
        part_number: 'DRIVE-BELT-001',
        description: 'Drive Belt',
        reason: 'Common wear item causing spin issues',
        likelihood: 'High',
        in_stock: 4,
        avg_cost: 25.00
      }
    ]
  }

  return partsDatabase[job.appliance_type] || []
}

async function simulateSimilarJobsAI(job: Job, limit: number): Promise<SimilarJob[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 400))

  // Mock similar jobs (in production, this would use vector similarity search)
  const mockSimilar: SimilarJob[] = [
    {
      job_id: 'J-0042',
      similarity_score: 0.92,
      appliance_type: job.appliance_type,
      brand: job.brand,
      issue_description: 'Similar issue with cooling',
      resolution: 'Replaced defrost timer',
      parts_used: ['DEF-TIMER-001'],
      repair_time_minutes: 75,
      completed_at: '2024-01-15T10:30:00Z'
    },
    {
      job_id: 'J-0038',
      similarity_score: 0.85,
      appliance_type: job.appliance_type,
      brand: job.brand,
      issue_description: 'Not cooling properly',
      resolution: 'Cleaned condenser coils, replaced fan',
      parts_used: ['EVAP-FAN-001'],
      repair_time_minutes: 90,
      completed_at: '2024-01-10T14:20:00Z'
    }
  ]

  return mockSimilar.slice(0, limit)
}

async function simulatePriceEstimationAI(job: Job): Promise<PriceEstimate> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 350))

  // Simple estimation based on appliance type and stage
  const baseRates: Record<string, { parts: number, labor: number }> = {
    'Refrigerator': { parts: 150, labor: 120 },
    'Dishwasher': { parts: 100, labor: 100 },
    'Washing Machine': { parts: 120, labor: 110 },
    'Dryer': { parts: 90, labor: 90 },
    'Oven': { parts: 140, labor: 130 },
    'Range': { parts: 110, labor: 100 }
  }

  const rates = baseRates[job.appliance_type] || { parts: 100, labor: 100 }

  // Adjust for priority
  const priorityMultiplier = job.priority === 'Urgent' ? 1.3 : job.priority === 'High' ? 1.15 : 1.0

  const parts_cost = rates.parts * priorityMultiplier
  const labor_cost = rates.labor * priorityMultiplier

  return {
    parts_cost_estimate: Math.round(parts_cost),
    labor_cost_estimate: Math.round(labor_cost),
    total_estimate: Math.round(parts_cost + labor_cost),
    confidence: 'Medium',
    factors: [
      `Based on ${job.appliance_type} averages`,
      job.priority !== 'Normal' ? 'Adjusted for priority' : 'Standard priority',
      'Historical data from similar jobs'
    ]
  }
}

async function simulateTimeEstimationAI(job: Job): Promise<TimeEstimate> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300))

  // Time estimates based on appliance type and stage
  const baseTimes: Record<string, { diagnosis: number, repair: number }> = {
    'Refrigerator': { diagnosis: 45, repair: 90 },
    'Dishwasher': { diagnosis: 35, repair: 75 },
    'Washing Machine': { diagnosis: 40, repair: 85 },
    'Dryer': { diagnosis: 30, repair: 70 },
    'Oven': { diagnosis: 50, repair: 100 },
    'Range': { diagnosis: 40, repair: 80 }
  }

  const times = baseTimes[job.appliance_type] || { diagnosis: 60, repair: 120 }

  // Adjust for callback
  const callbackMultiplier = job.is_callback ? 0.8 : 1.0 // Callbacks are often faster

  const diagnosis = Math.round(times.diagnosis * callbackMultiplier)
  const repair = Math.round(times.repair * callbackMultiplier)

  return {
    diagnosis_time_minutes: diagnosis,
    repair_time_minutes: repair,
    total_time_minutes: diagnosis + repair,
    confidence: 'Medium',
    factors: [
      `Based on ${job.appliance_type} averages`,
      job.is_callback ? 'Adjusted for callback visit' : 'First visit',
      'Historical time data'
    ]
  }
}

async function simulateCallbackRiskAI(job: Job): Promise<CallbackRiskAnalysis> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 350))

  const riskFactors: string[] = []
  let riskScore = 0

  // Analyze various risk factors
  if (job.visit_count > 1) {
    riskFactors.push('Multiple visits already scheduled')
    riskScore += 30
  }

  if (job.priority === 'Urgent') {
    riskFactors.push('Urgent priority may indicate complex issue')
    riskScore += 20
  }

  if (!job.brand || !job.model_number) {
    riskFactors.push('Missing appliance details may complicate diagnosis')
    riskScore += 15
  }

  if (job.parts_status === 'Not Needed') {
    riskScore -= 10 // Lower risk if no parts needed
  }

  // Determine risk level
  let risk_level: 'Low' | 'Medium' | 'High'
  if (riskScore < 20) risk_level = 'Low'
  else if (riskScore < 40) risk_level = 'Medium'
  else risk_level = 'High'

  const recommendations: string[] = []
  if (risk_level === 'High') {
    recommendations.push('Schedule extra time for thorough diagnosis')
    recommendations.push('Consider bringing common parts for this appliance type')
    recommendations.push('Document all work thoroughly')
  } else if (risk_level === 'Medium') {
    recommendations.push('Verify appliance model before visit')
    recommendations.push('Check parts availability')
  } else {
    recommendations.push('Standard procedure recommended')
  }

  return {
    risk_level,
    risk_factors: riskFactors.length > 0 ? riskFactors : ['No significant risk factors identified'],
    recommendations,
    similar_jobs_callback_rate: 0.12 // 12% callback rate for similar jobs
  }
}
