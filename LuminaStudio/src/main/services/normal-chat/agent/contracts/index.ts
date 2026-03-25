import type {
  ModelProviderProtocol,
  NormalChatAgentDecisionAction,
  NormalChatAgentRoleKind,
  NormalChatAgentTaskKind,
  NormalChatAgentExecutionToolCall,
  NormalChatAgentTemplate,
  NormalChatAgentTree,
  NormalChatCallMode,
  NormalChatConversationMessage,
  NormalChatConversationPromptMessage,
  NormalChatCostMode
} from '@preload/types'
import type { AIMessage, HumanMessage, SystemMessage, BaseMessage } from '@langchain/core/messages'
import type {
  NormalChatFunctioncallHelper,
  NormalChatFunctioncallRegistry
} from '../../functioncalls/contracts'

export interface NormalChatAgentTemplateDefinition extends NormalChatAgentTemplate {
  defaultSystemPrompt: string
}

export type { NormalChatAgentExecutionToolCall }

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

export interface NormalChatPlannerDecisionContext {
  session: NormalChatAgentSessionState
  services: NormalChatAgentExecutionServices
  helpers: NormalChatFunctioncallHelper[]
  rolePrompt: string
  callModePrompt: string
  costModePrompt: string
  recursionPrompt: string
  windowMessages: Array<SystemMessage | HumanMessage | AIMessage>
  userTaskPrompt: string
}

export interface NormalChatAnswerBuildContext {
  conversationMessages: NormalChatConversationMessage[]
  synthesisSummary: string
}

export interface NormalChatAgentGraphTemplate {
  decide(session: NormalChatAgentSessionState): Promise<NormalChatPlannerDecision>
  buildAnswerMessages(
    session: NormalChatAgentSessionState,
    context: NormalChatAnswerBuildContext
  ): Promise<BaseMessage[]>
}

export interface NormalChatAgentSuiteContext {
  services: NormalChatAgentExecutionServices
  runtime?: NormalChatAgentGraphRuntimeBridge
  trace?: NormalChatAgentTraceRecorder
  hostDependencies?: Record<string, unknown>
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

export interface NormalChatAgentRunContext {
  requestId: string
  topicId: string
  assistantId: string
  assistantTitle?: string
  topicTitle?: string
  providerId: string
  modelId: string
  systemPrompt: string
  input: string
  signal: AbortSignal
}

export interface NormalChatAgentGraphRuntimeBridge {
  getConversationMessages(topicId: string): NormalChatConversationMessage[]
  createChatModel(providerId: string, modelId: string, signal: AbortSignal): Promise<unknown>
  getProviderProtocol(
    providerId: string,
    signal: AbortSignal
  ): Promise<ModelProviderProtocol | null>
  logger: Pick<Console, 'debug' | 'info' | 'warn' | 'error'>
}

export interface NormalChatAgentGraphRunResult {
  answerMessages: Array<SystemMessage | HumanMessage | AIMessage>
  promptMessages: NormalChatConversationPromptMessage[]
  execution: {
    maxRounds: number
    completed: boolean
    aborted: boolean
    finalMode: 'tool' | 'answer' | 'error'
    rounds: Array<{
      roundIndex: number
      mode: 'tool' | 'answer'
      reason: string | null
      startedAt: string
      completedAt: string | null
      toolCalls: Array<{
        callId: string
        toolName: string
        title: string
        roundIndex: number
        batchIndex: number
        parallelIndex: number
        status: 'running' | 'success' | 'error' | 'aborted'
        input: string
        output: string
        errorMessage: string | null
        startedAt: string
        completedAt: string | null
      }>
    }>
  }
}

export interface NormalChatAgentGraphRunner {
  run(context: NormalChatAgentRunContext): Promise<NormalChatAgentGraphRunResult>
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
  runContext: NormalChatAgentRunContext
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
