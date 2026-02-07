/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Chat Message 类型定义 - Block 架构设计
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * 💡 核心设计理念：
 * 一条消息 = 角色(role) + 多个块(blocks)
 *
 * 🧱 为什么要用 Block 架构？
 * - AI 的回答不是纯文本，还包括：推理过程、工具调用、节点执行等
 * - 每种内容都是一个独立的 "Block"，有自己的数据结构
 * - 流式输出时，后端不断发送事件，前端动态增加/更新 Block
 *
 * 📚 Block 类型：
 * 1. TextBlock      - 普通文本内容
 * 2. ThinkingBlock  - AI 的推理思考过程
 * 3. ToolBlock      - 工具调用（比如计算器、搜索等）
 * 4. NodeBlock      - 节点执行（比如知识检索节点）
 * 5. MetaBlock      - 元信息（比如 Token 使用量）
 */

import type {
  LangchainClientNodeErrorPayload,
  LangchainClientNodeResultPayload,
  LangchainClientNodeStartPayload,
  LangchainClientToolCallPayload
} from '@shared/langchain-client.types'

// 推理步骤：每一步思考都有独立的 ID 和内容
export interface ThinkingStep {
  id: string // 步骤的唯一 ID
  content: string // 该步骤的思考内容
}

// Token 使用量统计
export interface TokenUsage {
  inputTokens: number // 输入的 token 数量
  outputTokens: number // 输出的 token 数量
  reasoningTokens?: number // 推理过程使用的 token（可选）
  totalTokens: number // 总 token 数量
}

// ==================== 块（Block）类型定义 ====================

export type MessageBlockType = 'text' | 'thinking' | 'tool' | 'node' | 'meta'

/**
 * 📝 TextBlock - 文本块
 * 用途：AI 生成的普通文本内容
 * 示例：“你好！我是 AI 助手...”
 */
export interface TextBlock {
  type: 'text'
  content: string // 文本内容，流式输出时会逐渐追加
}

/**
 * 🧠 ThinkingBlock - 推理思考块
 * 用途：AI 的内部推理过程（类似 o1 模型的 reasoning）
 * 示例：“步骤 1: 分析问题...” “步骤 2: 考虑解决方案...”
 */
export interface ThinkingBlock {
  type: 'thinking'
  steps: ThinkingStep[] // 推理步骤列表
  isThinking: boolean // 是否还在推理中（流式输出时用）
}

/**
 * 🛠️ ToolBlock - 工具调用块
 * 用途：AI 调用外部工具（比如计算器、网页搜索等）
 * 流程：
 *   1. tool-call 事件 → 创建 ToolBlock，只有 call 信息
 *   2. tool-result 事件 → 填充 result 字段
 */
export interface ToolBlock {
  type: 'tool'
  call: LangchainClientToolCallPayload // 工具调用信息（工具名、参数等）
  argsText?: string // 参数的流式文本（流式输出时用）
  result?: unknown // 工具返回的结果（调用完成后填充）
}

/**
 * 🔹 NodeBlock - 节点执行块
 * 用途：LangGraph 节点的执行过程（比如知识检索节点）
 * 流程：
 *   1. node-start 事件 → 创建 NodeBlock，只有 start 信息
 *   2. node-result 事件 → 填充 result 字段
 *   3. node-error 事件 → 填充 error 字段
 */
export interface NodeBlock {
  type: 'node'
  start: LangchainClientNodeStartPayload // 节点开始信息（nodeId, nodeKind, inputs 等）
  result?: LangchainClientNodeResultPayload // 节点执行结果（outputs 等）
  error?: LangchainClientNodeErrorPayload // 节点执行错误
}

/**
 * 📊 MetaBlock - 元信息块
 * 用途：存储消息的元数据（比如 Token 使用情况）
 * 位置：通常在消息最后，用于统计和展示
 */
export interface MetaBlock {
  type: 'meta'
  usage?: TokenUsage // Token 使用量
}

// 所有 Block 类型的联合类型
export type MessageBlock = TextBlock | ThinkingBlock | ToolBlock | NodeBlock | MetaBlock

// ==================== 消息（Message）类型定义 ====================

/**
 * 💬 ChatMessage - 聊天消息
 * 核心结构：一条消息 = 角色 + 多个 Block
 *
 * 示例流程：
 * 1. 用户发送："Python 是什么？"
 *    → ChatMessage { role: 'user', blocks: [TextBlock] }
 *
 * 2. AI 回答：
 *    → 初始状态：ChatMessage { role: 'assistant', blocks: [] }
 *    → 流式输出：不断添加/更新 Block
 *      - 添加 TextBlock: "让我搜索一下..."
 *      - 添加 NodeBlock: 知识检索节点执行
 *      - 更新 TextBlock: "根据搜索结果，Python 是..."
 *      - 添加 MetaBlock: Token 使用量
 */
export interface ChatMessage {
  id: string // 消息唯一 ID
  role: 'user' | 'assistant' | 'test' // 角色：用户/AI/测试
  blocks: MessageBlock[] // 消息的所有 Block（按顺序排列）
  isStreaming?: boolean // 是否正在流式输出
  createdAt?: string // 创建时间
  status?: 'final' | 'streaming' | 'aborted' | 'error' // 消息状态
  rawData?: any // 原始数据（仅用于测试消息）
}
