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
// ==================== Node Types ====================

/**
 * NodeKind: 语义级节点类型（用于 UI 路由与可视化）
 *
 * - knowledge_retrieval: 知识库检索节点
 * - tool: 通用工具节点（外部工具执行）
 * - final_answer: 生成最终回答节点
 * - custom: 其他自定义节点
 */
export type LangchainClientNodeKind =
  | 'knowledge_retrieval'
  | 'tool'
  | 'final_answer'
  | 'custom'

/**
 * 可选的 UI 提示，用于 renderer 组件选择
 */
export interface LangchainClientNodeUiHint {
  /** 推荐组件名（kebab-case），如 'knowledge-search' */
  component?: string
  /** UI 标题 */
  title?: string
  /** 图标名或 key */
  icon?: string
}

export interface LangchainClientNodeBasePayload {
  /** 节点唯一 ID（graph 内唯一即可） */
  nodeId: string
  /** 语义类型 */
  nodeKind: LangchainClientNodeKind
  /** 可读名称 */
  label?: string
  /** UI 提示 */
  uiHint?: LangchainClientNodeUiHint
  /** 输入摘要（可序列化） */
  inputs?: Record<string, unknown>
  /** 输出摘要（可序列化） */
  outputs?: Record<string, unknown>
}

export interface LangchainClientNodeStartPayload extends LangchainClientNodeBasePayload {
  startedAt?: string
}

export interface LangchainClientNodeResultPayload extends LangchainClientNodeBasePayload {
  finishedAt?: string
  summary?: string
}

export interface LangchainClientNodeErrorPayload extends LangchainClientNodeBasePayload {
  error: { message: string; code?: string; details?: unknown }
}

// ==================== Tool Types ====================

/**
 * ToolName: 外部工具名（可扩展）
 */
export type LangchainClientToolName = 'knowledge_search' | (string & {})

export interface LangchainClientToolCallPayload {
  toolCallId: string
  toolName: LangchainClientToolName
  toolArgs: unknown
}

export interface LangchainClientToolResultPayload {
  toolCallId: string
  toolName: LangchainClientToolName
  result: unknown
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
      payload: LangchainClientToolCallPayload
    }
  | {
      type: 'invoke:tool-result'
      requestId: string
      payload: LangchainClientToolResultPayload
    }
  | {
      type: 'invoke:node-start'
      requestId: string
      payload: LangchainClientNodeStartPayload
    }
  | {
      type: 'invoke:node-result'
      requestId: string
      payload: LangchainClientNodeResultPayload
    }
  | {
      type: 'invoke:node-error'
      requestId: string
      payload: LangchainClientNodeErrorPayload
    }
  | { type: 'invoke:step-complete'; requestId: string; stepIndex: number; nodeNames?: string[] }
  | {
      type: 'invoke:finish'
      requestId: string
      finishReason: LangchainClientFinishReason
      fullText: string
    }
  | { type: 'invoke:error'; requestId: string; message: string; stack?: string }
