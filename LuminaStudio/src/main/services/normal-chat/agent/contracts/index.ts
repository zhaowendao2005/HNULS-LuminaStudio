import type {
  ModelProviderProtocol,
  NormalChatAgentDecisionRecord,
  NormalChatAgentRoleKind,
  NormalChatAgentTaskKind,
  NormalChatAgentTree,
  NormalChatCallMode,
  NormalChatConversationMessage,
  NormalChatConversationPromptMessage,
  NormalChatCostMode
} from '@preload/types'
import type { BaseMessage } from '@langchain/core/messages'
import type {
  NormalChatFunctioncallHelper,
  NormalChatFunctioncallRegistry,
  NormalChatFunctioncallResultAssessment
} from '../../functioncalls/contracts'

/**
 * child-task 仍然是 graph/framework 边界上的最小桥接类型。
 * 当前它只表达“要派发什么任务”，不再承担模板或策略语义。
 */
export interface NormalChatChildTaskPayload {
  roleKind: Extract<NormalChatAgentRoleKind, 'worker' | 'repair'>
  taskKind: Extract<
    NormalChatAgentTaskKind,
    'tool-research' | 'repair' | 'synthesis' | 'direct-answer'
  >
  goal: string
  summary: string
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
  fingerprint: string
  outputJson: string
  summary: string
  assessment: NormalChatFunctioncallResultAssessment
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
  recordDecision(session: NormalChatAgentSessionState, record: NormalChatAgentDecisionRecord): void
  executeHelper(
    session: NormalChatAgentSessionState,
    helperId: string,
    helperArgs: Record<string, unknown>,
    decisionReason: string | null,
    executionMeta?: {
      stepIndex: number
      batchIndex: number
      parallelIndex: number
    }
  ): Promise<NormalChatFrameworkHelperResult>
  emitProgress(session: NormalChatAgentSessionState, text: string): void
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
  createGraph(context: NormalChatAgentSuiteContext): NormalChatAgentGraphTemplate
}

export interface NormalChatAgentRunResult {
  rootSession: NormalChatAgentSessionState
  synthesisSummary: string
  agentTree: NormalChatAgentTree
  answerMessages: BaseMessage[]
}
