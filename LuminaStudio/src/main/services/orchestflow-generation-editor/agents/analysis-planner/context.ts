import type { AnalysisPlannerContext } from './types'

export function buildAnalysisPlannerContext(context: AnalysisPlannerContext): string {
  return [
    '当前分析文档：',
    context.analysisDocument,
    '',
    '历史记忆：',
    context.memoryWindow.join('\n'),
    '',
    '用户新输入：',
    context.userText,
    '',
    '工作流基础规格：',
    context.workflowSpec
  ].join('\n')
}
