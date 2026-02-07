/**
 * Langchain Client (Utility Process) IPC types
 *
 * 说明：
 * - 该文件用于 Main 进程 ↔ UtilityProcess(langchain-client) 的消息协议。
 * - 注意：config 中可能包含敏感信息（如 apiKey），日志中必须脱敏。
 */

// ==================== Config Types ====================

export interface LangchainClientLangsmithConfig {
  /** LangSmith API Key (ls-xxx) */
  apiKey: string
  /** 可选：项目名（用于 LangSmith 面板筛选） */
  project?: string
}

export interface LangchainClientProviderConfig {
  /** OpenAI-compatible base URL (推荐填写 host；工具侧会 normalize 到 /v1) */
  baseUrl: string
  /** Provider API Key */
  apiKey: string
  /** 可选：默认 headers */
  defaultHeaders?: Record<string, string>
}

export interface LangchainClientRetrievalScope {
  knowledgeBaseId: number
  tableName: string
  fileKeys?: string[]
}

export interface LangchainClientRetrievalConfig {
  /** Allow multi-scope retrieval (multiple embedding spaces) */
  scopes: LangchainClientRetrievalScope[]
  /** Total topK budget across scopes */
  k?: number
  ef?: number
  rerankModelId?: string
  rerankTopN?: number
}

export interface LangchainClientAgentCreateConfig {
  provider: LangchainClientProviderConfig
  modelId: string
  systemPrompt?: string
  retrieval?: LangchainClientRetrievalConfig
}

export type LangchainClientChatRole = 'system' | 'user' | 'assistant'

export interface LangchainClientChatMessage {
  role: LangchainClientChatRole
  content: string
}

// ==================== Main -> Utility ====================

export type MainToLangchainClientMessage =
  | {
      type: 'process:init'
      knowledgeApiUrl: string
      langsmith?: LangchainClientLangsmithConfig
    }
  | {
      type: 'process:shutdown'
    }
  | {
      type: 'agent:create'
      agentId: string
      config: LangchainClientAgentCreateConfig
    }
  | {
      type: 'agent:destroy'
      agentId: string
    }
  | {
      type: 'agent:invoke'
      agentId: string
      requestId: string
      input: string
      history?: LangchainClientChatMessage[]
      /** Per-invoke retrieval config snapshot (scopes + fileKeys) */
      retrieval?: LangchainClientRetrievalConfig
    }
  | {
      type: 'agent:abort'
      requestId: string
    }

// ==================== Utility -> Main ====================

export type LangchainClientFinishReason = 'stop' | 'aborted' | 'error'

export type LangchainClientToMainMessage =
  | { type: 'process:ready' }
  | { type: 'process:error'; message: string; details?: string }
  | { type: 'agent:created'; agentId: string }
  | { type: 'agent:create-failed'; agentId: string; error: string }
  | { type: 'agent:destroyed'; agentId: string }
  | { type: 'invoke:start'; requestId: string; agentId: string }
  | { type: 'invoke:text-delta'; requestId: string; delta: string }
  | {
      type: 'invoke:tool-start'
      requestId: string
      toolCallId: string
      toolName: string
      toolArgs: unknown
    }
  | {
      type: 'invoke:tool-result'
      requestId: string
      toolCallId: string
      toolName: string
      result: unknown
    }
  | { type: 'invoke:step-complete'; requestId: string; stepIndex: number; nodeNames?: string[] }
  | {
      type: 'invoke:finish'
      requestId: string
      finishReason: LangchainClientFinishReason
      fullText: string
    }
  | { type: 'invoke:error'; requestId: string; message: string; stack?: string }
