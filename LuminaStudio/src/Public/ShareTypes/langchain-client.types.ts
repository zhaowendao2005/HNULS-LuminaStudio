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
// ==================== Model Config (Model-bound) ====================

export interface KnowledgeQaModelSelectorConfig {
  providerId: string | null
  modelId: string | null
  /** Optional: resolved provider config (filled by Main) */
  provider?: LangchainClientProviderConfig
  /** Optional: custom system prompt instruction part (业务逻辑提示) */
  systemPromptInstruction?: string
  /** Optional: custom system prompt constraint part (JSON 格式约束) */
  systemPromptConstraint?: string
}

export interface KnowledgeQaModelConfig {
  /** 首轮深度规划模型（agent 第一次规划，需用户审批） */
  initialPlanModel: KnowledgeQaModelSelectorConfig
  /** 回环规划模型（summary 打回后直接规划，无需审批） */
  loopPlanModel: KnowledgeQaModelSelectorConfig
  summaryModel: KnowledgeQaModelSelectorConfig
  retrieval: {
    enableRerank: boolean
    rerankModelId: string | null
    topK: number
    rerankTopN?: number
  }
  pubmed?: {
    apiKey?: string
  }
  graph: {
    maxIterations: number
  }
}

export interface LangchainClientAgentCreateConfig {
  provider: LangchainClientProviderConfig
  modelId: string
  systemPrompt?: string
  retrieval?: LangchainClientRetrievalConfig
  /** Model-bound config (handled by Graph, not node/tool coupling) */
  modelConfig?: {
    knowledgeQa?: KnowledgeQaModelConfig
  }
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
/**
 * NodeKind: 语义级节点类型（用于 UI 路由与可视化）
 *
 * 约定：新增节点必须
 * 1) 在这里登记 nodeKind
 * 2) 在 renderer 增加对应渲染组件（或明确复用某个组件）
 */
export type LangchainClientNodeKind =
  | 'knowledge_retrieval'
  | 'pubmed_search'
  | 'retrieval_plan'
  | 'retrieval_summary'
  | 'planning'
  | 'initial_planning'
  | 'summary'
  | 'user_interaction'
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
  /** 节点使用的模型 ID（用于显示，如：规划节点、总结节点） */
  modelId?: string
  /** 节点使用的重排模型 ID（用于显示，如：检索节点） */
  rerankModelId?: string
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

// ==================== Node Outputs (可选强类型) ====================

/**
 * 规划节点输出：检索计划
 * - queries: 需要执行的检索列表（最多 10 条，graph 会二次裁剪）
 * - maxK: 当前系统允许的最大 k（由检索节点硬编码，当前为 3）
 */
export interface LangchainClientRetrievalPlanQuery {
  query: string
  k: number
}

export interface LangchainClientRetrievalPlanOutput {
  queries: LangchainClientRetrievalPlanQuery[]
  maxK: number
  rationale?: string
}

/**
 * 总结与判断节点输出：
 * - shouldLoop: 是否需要回环到规划节点
 * - message:
 *   - shouldLoop=false: 最终答案（给用户）
 *   - shouldLoop=true: 追加问题/澄清点（给规划节点作为下一轮输入）
 */
export interface LangchainClientSummaryDecisionOutput {
  shouldLoop: boolean
  message: string
}

// ==================== User Interaction Types ====================

/**
 * 用户交互选项（LLM 可选生成，供用户选择）
 */
export interface UserInteractionOption {
  id: string
  label: string
  description?: string
}

/**
 * 用户交互请求（Utility → Main → Renderer）
 *
 * 由 graph 中的 user-interaction 节点发出，暂停 graph 执行等待用户响应。
 * - message: LLM 生成的交互消息（支持 markdown）
 * - options: 可选的选项列表（LLM 决定是否生成）
 * - requiresTextInput: 是否需要文本输入（默认 true）
 * - metadata: 节点可附加的额外数据（如规划详情）
 */
export interface UserInteractionRequestPayload {
  interactionId: string
  nodeId: string
  message: string
  options?: UserInteractionOption[]
  requiresTextInput?: boolean
  metadata?: Record<string, unknown>
}

/**
 * 用户交互响应（Renderer → Main → Utility）
 *
 * 用户在 UI 中做出选择/输入后，将响应发回给 graph。
 * - action: 'approve' 批准 | 'reject' 拒绝 | 'modify' 修改后批准
 * - selectedOptionIds: 用户选中的选项 ID 列表
 * - textInput: 用户输入的文本（补充意见等）
 */
export interface UserInteractionResponsePayload {
  interactionId: string
  selectedOptionIds?: string[]
  textInput?: string
  action: 'approve' | 'reject' | 'modify'
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
  | {
      /** 用户交互响应（Main → Utility，用于 resolve 暂停中的 graph） */
      type: 'user-interaction:response'
      requestId: string
      payload: UserInteractionResponsePayload
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
      /** 用户交互请求（Utility → Main，graph 暂停等待用户响应） */
      type: 'invoke:user-interaction-request'
      requestId: string
      payload: UserInteractionRequestPayload
    }
  | {
      type: 'invoke:finish'
      requestId: string
      finishReason: LangchainClientFinishReason
      fullText: string
    }
  | { type: 'invoke:error'; requestId: string; message: string; stack?: string }
