import type { PaperRetrievalSearchResult } from '@preload/types'

export type NormalChatActionKind = 'system' | 'functioncall' | 'mcp'
export type NormalChatActionMode = 'fast' | 'slow'

export interface NormalChatActionDescriptor {
  key: string
  kind: NormalChatActionKind
  title: string
  description: string
  defaultMode: NormalChatActionMode
}

export interface NormalChatActionDefinition {
  descriptor: NormalChatActionDescriptor
  schema: Record<string, unknown>
  prompt: string
}

export interface NormalChatActionCall {
  actionKey: string
  input: Record<string, unknown>
}

export interface NormalChatGetActionSpecOutput {
  actionKey: string
  definition: NormalChatActionDefinition
}

export interface NormalChatDispatchSubAgentOutput {
  childAgentRunId: string
  summaryMarkdown: string
  finalAnswer: string
}

export interface NormalChatPubmedSearchOutput {
  result: PaperRetrievalSearchResult
}

export type NormalChatActionExecutorOutput =
  | NormalChatGetActionSpecOutput
  | NormalChatDispatchSubAgentOutput
  | NormalChatPubmedSearchOutput

export interface NormalChatResolvedAction {
  actionKey: string
  kind: NormalChatActionKind
  enabled: boolean
  mode: NormalChatActionMode
  definition: NormalChatActionDefinition
}
