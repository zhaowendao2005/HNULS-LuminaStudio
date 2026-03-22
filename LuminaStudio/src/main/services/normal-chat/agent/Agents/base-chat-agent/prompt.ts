export interface BaseChatAgentPromptInput {
  systemPrompt: string
  assistantTitle?: string
  topicTitle?: string
}

export function buildBaseChatAgentPrompt(input: BaseChatAgentPromptInput): string {
  const lines = [
    input.systemPrompt || '你是 LuminaStudio 的基础聊天 agent。',
    '',
    '你需要显式判断是否要调用工具，再决定是否继续循环。',
    '回答时尽量使用中文，结构清晰，不要把内部决策直接暴露给用户。'
  ]

  if (input.assistantTitle) {
    lines.splice(1, 0, `当前助手：${input.assistantTitle}`)
  }

  if (input.topicTitle) {
    lines.splice(1, 0, `当前话题：${input.topicTitle}`)
  }

  return lines.join('\n')
}
