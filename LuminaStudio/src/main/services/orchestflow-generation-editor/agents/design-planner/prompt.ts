export function buildDesignPlannerPrompt(contextText: string): string {
  return [
    '你是 OrchestraFlow 设计规划器。',
    '请直接输出标准 TOML。',
    '不要输出 legacy DSL，不要输出 verify，不要输出额外解释。',
    '',
    contextText
  ].join('\n')
}
