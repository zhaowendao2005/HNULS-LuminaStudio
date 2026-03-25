export type NormalChatTopicPromptMode = 'inherit' | 'override'

export type NormalChatCallMode = 'fast' | 'slow' | 'auto'

export type NormalChatCostMode = 'per_call' | 'per_token'

export type NormalChatAgentRoleKind = 'director' | 'worker' | 'repair'

export type NormalChatAgentTaskKind =
  | 'user-request'
  | 'tool-research'
  | 'repair'
  | 'synthesis'
  | 'direct-answer'

export type NormalChatAgentStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'aborted'
  | 'fallback'

export type NormalChatAgentDecisionAction = 'answer' | 'call-helper' | 'dispatch-child' | 'fallback'

export type NormalChatAgentToolName = 'pubmed-search'

export type NormalChatMessagePartKind = 'text' | 'functioncall'

export type NormalChatFunctionCallMessagePartStatus =
  | 'queued'
  | 'running'
  | 'success'
  | 'error'
  | 'aborted'

export type NormalChatConversationMessageRole = 'user' | 'assistant'

export type NormalChatConversationStatusPhase = 'sending' | 'thinking' | 'streaming' | 'done'
