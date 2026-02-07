/**
 * @file Agent 模型定义 —— LangGraph 版本类型声明
 *
 * 说明：
 * - 模型定义 = “提示词 + 状态机（graph）”
 * - 每个模型都必须能明确展示它的状态机与节点逻辑
 */

import type { CompiledStateGraph } from '@langchain/langgraph'
import type {
  KnowledgeQaModelConfig,
  LangchainClientToMainMessage
} from '@shared/langchain-client.types'
import type { AgentRuntime } from '../factory'

export interface AgentModelGraphContext {
  /**
   * 已创建的 runtime（包含 LLM + tools）
   */
  runtime: AgentRuntime

  /**
   * 事件发送器（模型/节点通过它向 Main 发 IPC 消息）
   */
  emit: (msg: LangchainClientToMainMessage) => void

  /**
   * 模型绑定配置（由 Main 解析并下发）
   */
  modelConfig?: {
    knowledgeQa?: KnowledgeQaModelConfig
  }
}

export interface AgentModelDefinition {
  /** 唯一 ID */
  id: string
  /** 显示名称 */
  name: string
  /** 描述 */
  description: string
  /** 默认系统提示词 */
  systemPrompt: string
  /** 构建 LangGraph 状态机 */
  buildGraph: (ctx: AgentModelGraphContext) => CompiledStateGraph<any, any, any>
}
