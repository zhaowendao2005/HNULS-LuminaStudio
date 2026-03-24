import type {
  ModelProviderProtocol,
  NormalChatAgentTemplate,
  NormalChatConversationMessage,
  NormalChatConversationPromptMessage
} from '@preload/types'
import type { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'

export interface NormalChatAgentTemplateDefinition extends NormalChatAgentTemplate {
  // 这里只保存模板的默认 system prompt，方便后面把模板和运行时逻辑拆开。
  defaultSystemPrompt: string
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
  getProviderProtocol(providerId: string, signal: AbortSignal): Promise<ModelProviderProtocol | null>
  invokeStructuredOutput(params: {
    providerId: string
    modelId: string
    schema: unknown
    schemaName: string
    messages: Array<{ content?: unknown }>
    signal: AbortSignal
  }): Promise<unknown>
  logger: Pick<Console, 'debug' | 'info' | 'warn' | 'error'>
}

export interface NormalChatAgentGraphRunResult {
  answerMessages: Array<SystemMessage | HumanMessage | AIMessage>
  promptMessages: NormalChatConversationPromptMessage[]
}

export interface NormalChatAgentGraphRunner {
  run(context: NormalChatAgentRunContext): Promise<NormalChatAgentGraphRunResult>
}

export interface NormalChatAgentSuiteContext<
  THostDependencies extends object = Record<string, never>
> {
  runtime: NormalChatAgentGraphRuntimeBridge
  trace?: NormalChatAgentTraceRecorder
  hostDependencies: THostDependencies
}

export interface NormalChatAgentSuite<THostDependencies extends object = Record<string, never>> {
  template: NormalChatAgentTemplateDefinition
  createGraph(context: NormalChatAgentSuiteContext<THostDependencies>): NormalChatAgentGraphRunner
}

export interface NormalChatAgentModelContext {
  providerId: string
  modelId: string
  providerProtocol?: string
}

export interface NormalChatAgentTraceEventBase {
  requestId: string
  topicId: string
}

export type NormalChatAgentTraceEvent =
  | (NormalChatAgentTraceEventBase & {
      type: 'run-start'
      assistantId: string
      modelId: string
      message: string
    })
  | (NormalChatAgentTraceEventBase & {
      type: 'decision'
      step: string
      message: string
    })
  | (NormalChatAgentTraceEventBase & {
      type: 'tool-selected'
      toolName: string
      message: string
    })
  | (NormalChatAgentTraceEventBase & {
      type: 'tool-start'
      toolName: string
      message: string
    })
  | (NormalChatAgentTraceEventBase & {
      type: 'tool-result'
      toolName: string
      output: string
      message: string
    })
  | (NormalChatAgentTraceEventBase & {
      type: 'functioncall-start'
      callId: string
      functionCallName: string
      title: string
      message: string
    })
  | (NormalChatAgentTraceEventBase & {
      type: 'functioncall-input'
      callId: string
      functionCallName: string
      title: string
      input: string
      message: string
    })
  | (NormalChatAgentTraceEventBase & {
      type: 'functioncall-output'
      callId: string
      functionCallName: string
      title: string
      output: string
      message: string
    })
  | (NormalChatAgentTraceEventBase & {
      type: 'functioncall-finish'
      callId: string
      functionCallName: string
      title: string
      status: 'success' | 'aborted'
      message: string
    })
  | (NormalChatAgentTraceEventBase & {
      type: 'functioncall-error'
      callId: string
      functionCallName: string
      title: string
      error: string
      message: string
    })
  | (NormalChatAgentTraceEventBase & {
      type: 'loop-next'
      nextStep: string
      message: string
    })
  | (NormalChatAgentTraceEventBase & {
      type: 'answer-start'
      message: string
    })
  | (NormalChatAgentTraceEventBase & {
      type: 'answer-delta'
      delta: string
    })
  | (NormalChatAgentTraceEventBase & {
      type: 'run-finish'
      output: string
      message: string
    })
  | (NormalChatAgentTraceEventBase & {
      type: 'run-error'
      error: string
      message: string
    })

export interface NormalChatAgentTraceRecorder {
  record(event: NormalChatAgentTraceEvent): void
  snapshot(): NormalChatAgentTraceEvent[]
  subscribe(listener: (event: NormalChatAgentTraceEvent) => void): () => void
}

export interface NormalChatAgentToolExecuteContext {
  signal: AbortSignal
  // 工具执行阶段只需要最小日志面，避免把主进程 logger 细节散到各个工具里。
  logger: Pick<Console, 'debug' | 'info' | 'warn' | 'error'>
  trace: NormalChatAgentTraceRecorder
  runContext: NormalChatAgentRunContext
  modelContext: NormalChatAgentModelContext
  callId: string
}

export interface NormalChatAgentToolExecuteResult {
  output: string
}
