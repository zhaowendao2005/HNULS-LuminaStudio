import type { DesignPlannerContext } from './types'

export function buildDesignPlannerContext(context: DesignPlannerContext): string {
  return [
    'analysis 文档：',
    context.analysisDocument,
    '',
    '当前工作 TOML：',
    context.currentToml,
    '',
    '工作流基础规格：',
    context.workflowSpec,
    '',
    '节点提示压缩：',
    context.nodePrompt,
    '',
    '上轮校验：',
    context.validationReport ? JSON.stringify(context.validationReport, null, 2) : '无'
  ].join('\n')
}
