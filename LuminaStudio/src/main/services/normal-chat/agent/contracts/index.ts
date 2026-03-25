import type {
  ModelProviderProtocol,
  NormalChatAgentDecisionAction,
  NormalChatAgentRoleKind,
  NormalChatAgentTaskKind,
  NormalChatAgentTemplate,
  NormalChatAgentTree,
  NormalChatCallMode,
  NormalChatConversationMessage,
  NormalChatConversationPromptMessage,
  NormalChatCostMode
} from '@preload/types'
import type { BaseMessage } from '@langchain/core/messages'
import type { z } from 'zod'
import type {
  NormalChatFunctioncallHelper,
  NormalChatFunctioncallRegistry
} from '../../functioncalls/contracts'

export interface NormalChatAgentTemplateDefinition extends NormalChatAgentTemplate {
  defaultSystemPrompt: string
}

export interface NormalChatChildTaskPayload {
  roleKind: Extract<NormalChatAgentRoleKind, 'worker' | 'repair'>
  taskKind: Extract<
    NormalChatAgentTaskKind,
    'tool-research' | 'repair' | 'synthesis' | 'direct-answer'
  >
  goal: string
  summary: string
}

export interface NormalChatPlannerDecision {
  action: NormalChatAgentDecisionAction
  reasoning: string
  helperId: string | null
  helperArgs: Record<string, unknown> | null
  childTask: NormalChatChildTaskPayload | null
  finalAnswerHint: string | null
  rawText: string
  parsedJson: string | null
  repairAttempted: boolean
  validationError: string | null
}

export interface NormalChatAgentSessionState {
  requestId: string
  topicId: string
  assistantId: string
  assistantTitle: string
  topicTitle: string
  providerId: string
  modelId: string
  providerProtocol: ModelProviderProtocol | null
  systemPrompt: string
  input: string
  signal: AbortSignal
  agentId: string
  parentAgentId: string | null
  depth: number
  roleKind: NormalChatAgentRoleKind
  taskKind: NormalChatAgentTaskKind
  goal: string
  summary: string
  callMode: NormalChatCallMode
  costMode: NormalChatCostMode
  retryCount: number
  maxRetries: number
  maxRecursionDepth: number
  conversationWindow: NormalChatConversationPromptMessage[]
}

export interface NormalChatAgentExecutionServices {
  getConversationMessages(topicId: string): NormalChatConversationMessage[]
  createChatModel(
    providerId: string,
    modelId: string,
    signal: AbortSignal
  ): Promise<{
    invoke(messages: BaseMessage[], options: { signal: AbortSignal }): Promise<{ content: unknown }>
    stream(
      messages: BaseMessage[],
      options: { signal: AbortSignal }
    ): Promise<AsyncIterable<unknown>>
  }>
  getProviderProtocol(
    providerId: string,
    signal: AbortSignal
  ): Promise<ModelProviderProtocol | null>
  functioncallRegistry: NormalChatFunctioncallRegistry
  logger: Pick<Console, 'debug' | 'info' | 'warn' | 'error'>
}

export interface NormalChatGraphHelperOverlay {
  descriptionOverlay?: string
  schemaOverlay?: string
  progressiveOverlay?: string
  overlayMode?: 'append' | 'replace'
}

export interface NormalChatGraphHelperBinding {
  helperId: string
  descriptionOverlay?: string
  schemaOverlay?: string
  progressiveOverlay?: string
  overlayMode?: 'append' | 'replace'
}

export interface NormalChatFrameworkHelperResult {
  helper: NormalChatFunctioncallHelper
  callId: string
  outputJson: string
  summary: string
}

export interface NormalChatGraphFramework {
  readonly services: NormalChatAgentExecutionServices
  beginAgent(session: NormalChatAgentSessionState): void
  syncAgent(
    session: NormalChatAgentSessionState,
    patch: {
      retryCount?: number
      summary?: string
      conversationWindow?: NormalChatConversationPromptMessage[]
    }
  ): void
  recordDecision(
    session: NormalChatAgentSessionState,
    stepIndex: number,
    decision: NormalChatPlannerDecision
  ): void
  executeHelper(
    session: NormalChatAgentSessionState,
    helperId: string,
    helperArgs: Record<string, unknown>,
    decisionReason: string | null
  ): Promise<NormalChatFrameworkHelperResult>
  dispatchChild(
    parentSession: NormalChatAgentSessionState,
    task: NormalChatChildTaskPayload,
    overrideCallMode?: NormalChatCallMode
  ): Promise<{ summary: string }>
  completeAgent(
    session: NormalChatAgentSessionState,
    status: 'completed' | 'fallback' | 'failed',
    finalResult: string | null,
    errorMessage: string | null
  ): void
  markFallback(): void
  getStepLimit(session: NormalChatAgentSessionState): number
}

export interface NormalChatAnswerBuildContext {
  conversationMessages: NormalChatConversationMessage[]
  synthesisSummary: string
}

export interface NormalChatAgentGraphTemplate {
  run(
    session: NormalChatAgentSessionState,
    framework: NormalChatGraphFramework
  ): Promise<{ summary: string }>
  buildAnswerMessages(
    session: NormalChatAgentSessionState,
    context: NormalChatAnswerBuildContext
  ): Promise<BaseMessage[]>
}

export interface NormalChatAgentSuiteContext {
  services: NormalChatAgentExecutionServices
}

export interface NormalChatAgentSuite {
  template: NormalChatAgentTemplateDefinition
  createGraph(context: NormalChatAgentSuiteContext): NormalChatAgentGraphTemplate
}

export interface NormalChatAgentRunResult {
  rootSession: NormalChatAgentSessionState
  synthesisSummary: string
  agentTree: NormalChatAgentTree
  answerMessages: BaseMessage[]
}

export interface NormalChatAgentTraceRecorder {
  record(_event: unknown): void
  snapshot(): unknown[]
  subscribe(listener: (event: unknown) => void): () => void
}

export interface NormalChatAgentToolExecuteContext {
  signal: AbortSignal
  logger: Pick<Console, 'debug' | 'info' | 'warn' | 'error'>
  trace: NormalChatAgentTraceRecorder
  runContext: {
    requestId: string
    topicId: string
    assistantId: string
    providerId: string
    modelId: string
    systemPrompt: string
    input: string
    signal: AbortSignal
  }
  modelContext: {
    providerId: string
    modelId: string
    providerProtocol?: string
  }
  callId: string
  roundIndex: number
  batchIndex: number
  parallelIndex: number
  depth: number
  decisionReason: string | null
}

export interface NormalChatAgentToolExecuteResult {
  output: string
}

export interface NormalChatJsonContractResult<T> {
  rawText: string
  parsedJson: T | null
  parsedJsonText: string | null
  repairAttempted: boolean
  validationError: string | null
}

export type NormalChatJsonSchema<T> = z.ZodType<T>
