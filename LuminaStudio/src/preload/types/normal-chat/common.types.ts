export type NormalChatTopicPromptMode = 'inherit' | 'override'

export type NormalChatCallMode = 'fast' | 'slow' | 'auto'

export type NormalChatCostMode = 'per_call' | 'per_token'


export type NormalChatMessagePartKind = 'text' | 'functioncall'

export type NormalChatFunctionCallMessagePartStatus =
  | 'queued'
  | 'running'
  | 'success'
  | 'error'
  | 'aborted'

export type NormalChatConversationMessageRole = 'user' | 'assistant'

export type NormalChatConversationStatusPhase = 'sending' | 'thinking' | 'streaming' | 'done'
