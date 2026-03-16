export const GENERATION_TRACE_STEPS = {
  analysisPlanner: 'analysis-planner',
  planningCopilot: 'planning-copilot',
  designPlanner: 'design-planner'
} as const

export type GenerationTraceStepKey =
  (typeof GENERATION_TRACE_STEPS)[keyof typeof GENERATION_TRACE_STEPS]
