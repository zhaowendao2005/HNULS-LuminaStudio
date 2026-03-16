export function buildPlanningCopilotPrompt(contextText: string): string {
  return [
    '你是 analysis 文档编辑 copilot。',
    '请输出 TOML patch，只允许 action 和 content 两个字段。',
    'action 只能是 replace-analysis 或 append-analysis。',
    '',
    contextText
  ].join('\n')
}
