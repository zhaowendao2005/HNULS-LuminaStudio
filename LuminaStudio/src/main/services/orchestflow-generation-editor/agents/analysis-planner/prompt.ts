export function buildAnalysisPlannerPrompt(contextText: string): string {
  return [
    '你是 OrchestraFlow 需求分析规划器。',
    '请输出 markdown，至少包含：摘要、目标、约束、成功标准。',
    '不要输出 verify，不要输出 legacy DSL。',
    '',
    contextText
  ].join('\n')
}
