import type { PlanningCopilotContext } from './types'

export function buildPlanningCopilotContext(context: PlanningCopilotContext): string {
  return [
    '当前分析文档：',
    context.analysisDocument,
    '',
    '历史记忆：',
    context.memoryWindow.join('\n'),
    '',
    '用户意图：',
    context.userText
  ].join('\n')
}
