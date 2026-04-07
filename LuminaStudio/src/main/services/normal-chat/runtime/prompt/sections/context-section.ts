export function buildContextSection(input: {
  historyMarkdown: string
  userInput: string
  conversationTitle: string
  agentGoal: string
}): string {
  return [
    '## Context',
    `Conversation: ${input.conversationTitle}`,
    `Goal: ${input.agentGoal}`,
    '### History',
    input.historyMarkdown || '(empty)',
    '### Current User Input',
    input.userInput
  ].join('\n\n')
}
