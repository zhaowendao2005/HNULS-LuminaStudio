import type { OFNodeAuthoringDescription } from '../../node-definition'

export const variableAssignNodeDescription: OFNodeAuthoringDescription = {
  summary: '把变量或常量映射成新的变量输出。',
  capabilitySummary: '负责变量清洗、重命名、常量注入和中间结果整理。',
  boundariesZh: ['不直接调用模型。', '规则必须显式声明 source 与 target。', '输出变量由规则自动派生。'],
  inputDependencies: ['rules'],
  outputArtifacts: ['target 变量集合'],
  compositionHints: ['适合在 llm 后做字段整理。', '常与 end 配合把输出收口。'],
  notes: ['source_mode 推荐统一使用 value_source。']
}
