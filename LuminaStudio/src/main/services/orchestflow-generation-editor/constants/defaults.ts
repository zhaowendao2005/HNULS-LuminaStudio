import type { GenerationDocument, GenerationStageConfig, GenerationStageKey } from '@preload/types'

export const DEFAULT_STAGE_CONFIGS: Record<
  GenerationStageKey,
  Omit<GenerationStageConfig, 'providerId' | 'modelId' | 'sdkVendor'>
> = {
  analysis: {
    stageKey: 'analysis',
    memoryRounds: 6,
    copilotMemoryRounds: 5,
    autoApproved: true,
    activePlanningDocumentId: null
  },
  design: {
    stageKey: 'design',
    memoryRounds: 6,
    copilotMemoryRounds: 5,
    autoApproved: true,
    activePlanningDocumentId: null
  },
  verify: {
    stageKey: 'verify',
    memoryRounds: 5,
    copilotMemoryRounds: 4,
    autoApproved: true,
    activePlanningDocumentId: null
  }
}

export const DEFAULT_DOCUMENTS: Record<
  GenerationStageKey,
  Omit<GenerationDocument, 'summary' | 'content'>
> = {
  analysis: { documentKey: 'analysis', title: '需求分析', fileName: 'requirement_analysis.md' },
  design: { documentKey: 'design', title: '规划设计', fileName: 'planning_design.md' },
  verify: { documentKey: 'verify', title: '校验', fileName: 'verify_checklist.md' }
}
