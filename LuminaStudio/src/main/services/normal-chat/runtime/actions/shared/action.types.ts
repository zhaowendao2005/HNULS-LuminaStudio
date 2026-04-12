/**
 * Normal Chat 动作（Action）核心类型定义
 */
import type {
  KGRetrievalSearchResult,
  RetrievalHit
} from '@shared/knowledge-database-api.types'
import type { NormalChatTaskExecutionSnapshot, PaperRetrievalSearchResult } from '@preload/types'
import type { z } from 'zod'
import type { NormalChatActionSchemaDebugSnapshot } from './action-runtime.types'

export type NormalChatActionKind = 'system' | 'functioncall' | 'mcp'
export type NormalChatActionMode = 'fast' | 'slow'
export type NormalChatActionTranscriptVisibility = 'inline' | 'hidden'

export interface NormalChatActionDescriptor {
  key: string
  kind: NormalChatActionKind
  title: string
  description: string
  defaultMode: NormalChatActionMode
  transcriptVisibility?: NormalChatActionTranscriptVisibility
}

export type NormalChatActionValidationResult =
  | { ok: true; normalizedInput?: unknown }
  | { ok: false; kind: 'schema' | 'business'; message: string; retryable: boolean }

export type NormalChatActionPermissionResult =
  | { behavior: 'allow'; updatedInput?: unknown }
  | { behavior: 'deny'; message: string; retryable: boolean }

export interface NormalChatActionRuntimeContext {
  taskId: string
  requestId: string
  actionRunId: string
  roundIndex: number
  agentDepth: number
  executionSnapshot: NormalChatTaskExecutionSnapshot
}

export interface NormalChatActionDefinition {
  descriptor: NormalChatActionDescriptor
  schema: Record<string, unknown>
  prompt: string
  inputSchema?: z.ZodType<Record<string, unknown>>
  debugSchemaSnapshot?: NormalChatActionSchemaDebugSnapshot
  alwaysLoaded?: boolean
  isReadOnly?(input: Record<string, unknown>): boolean
  isConcurrencySafe?(input: Record<string, unknown>): boolean
  validateInput?(
    input: Record<string, unknown>,
    context: NormalChatActionRuntimeContext
  ): Promise<NormalChatActionValidationResult>
  checkPermissions?(
    input: Record<string, unknown>,
    context: NormalChatActionRuntimeContext
  ): Promise<NormalChatActionPermissionResult>
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

export interface NormalChatKnowledgeRetrievalOutput {
  hits: RetrievalHit[]
}

export interface NormalChatKgRetrievalOutput {
  result: KGRetrievalSearchResult
}

export type NormalChatActionExecutorOutput =
  | NormalChatGetActionSpecOutput
  | NormalChatDispatchSubAgentOutput
  | NormalChatPubmedSearchOutput
  | NormalChatKnowledgeRetrievalOutput
  | NormalChatKgRetrievalOutput

export interface NormalChatResolvedAction {
  actionKey: string
  kind: NormalChatActionKind
  enabled: boolean
  mode: NormalChatActionMode
  definition: NormalChatActionDefinition
}
