import type { NormalChatAgentSessionState } from '../../contracts'

export function buildRolePrompt(session: NormalChatAgentSessionState): string {
  const baseLines = [
    session.systemPrompt || '你是 LuminaStudio Normal Chat 的递归式 agent。',
    '',
    `当前角色: ${session.roleKind}`,
    `当前任务: ${session.taskKind}`,
    `当前深度: ${session.depth}`,
    `目标: ${session.goal}`,
    `摘要: ${session.summary}`,
    '',
    '你必须遵守递归上限、重试上限、成本模式和 helper 契约。',
    '如果不需要外部资源，就直接选择 answer。',
    '如果需要外部资料，优先判断是直接调 helper 还是派发子 agent。'
  ]

  if (session.roleKind === 'director') {
    baseLines.push('你是 0 级 director，需要在直接回答、调用 helper、派发子 agent 之间做取舍。')
  }

  if (session.roleKind === 'worker') {
    baseLines.push('你是 worker，只负责完成父级分派的局部任务，并把结果摘要回传给父级。')
  }

  if (session.roleKind === 'repair') {
    baseLines.push('你是 repair agent，优先修复参数、缩小检索问题、或寻找保守降级路径。')
  }

  return baseLines.join('\n')
}
