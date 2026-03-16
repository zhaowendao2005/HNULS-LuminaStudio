import type {
  GenerationAnalysisDocument,
  GenerationGlobalSettings,
  GenerationStageConfig,
  GenerationStageKey
} from '@preload/types'

export const DEFAULT_GLOBAL_SETTINGS: GenerationGlobalSettings = {
  persistRawLlmData: false
}

export const DEFAULT_STAGE_CONFIGS: Record<GenerationStageKey, GenerationStageConfig> = {
  analysis: {
    stageKey: 'analysis',
    providerId: 'openai',
    modelId: 'gpt-4.1-mini',
    memoryRounds: 6,
    maxRepairIterations: 1,
    budgetLimitTokens: 12000
  },
  design: {
    stageKey: 'design',
    providerId: 'openai',
    modelId: 'gpt-4.1-mini',
    memoryRounds: 4,
    maxRepairIterations: 4,
    budgetLimitTokens: 20000
  }
}

export function createDefaultAnalysisDocument(): GenerationAnalysisDocument {
  return {
    documentKey: 'analysis',
    title: '需求分析',
    content: '# 需求分析\n\n## 摘要\n\n## 目标\n\n## 约束\n\n## 成功标准\n',
    summary: '尚未生成分析结果。',
    updatedAt: new Date().toISOString()
  }
}
