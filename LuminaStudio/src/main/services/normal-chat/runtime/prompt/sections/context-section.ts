export function buildContextSection(input: {
  systemPrompt: string
  historyMarkdown: string
  userInput: string
  conversationTitle: string
  agentGoal: string
}): string {
  return [
    '## Context',
    `Conversation: ${input.conversationTitle}`,
    `Goal: ${input.agentGoal}`,
    '### System Prompt',
    input.systemPrompt,
    '### History',
    input.historyMarkdown || '(empty)',
    '### Current User Input',
    input.userInput
  ].join('\n\n')
}
