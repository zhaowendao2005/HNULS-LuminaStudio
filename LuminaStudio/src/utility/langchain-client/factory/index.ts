/**
 * LangChain/LangGraph Runtime Factory
 *
 * 该模块负责将配置组装成可运行的 Agent Runtime：
 * - LLM 实例
 * - 工具集合
 * - LangGraph 状态机（未来在 models 中定义）
 */
import { createAgent } from 'langchain'
import type { LangchainClientAgentCreateConfig } from '@shared/langchain-client.types'
import { buildChatModel } from '../model-factory'
import { buildAgentTools } from '../tools'

/**
 * AgentRuntime：模型运行时
 *
 * 设计说明：
 * - agent: 基于 LangChain createAgent 的“工具调用代理”（适合 tool-calls 流程）
 * - model: 原始 ChatModel（适合我们在 graph/node 中直接调用 LLM 输出结构化 JSON）
 *
 * 为什么需要同时暴露 model？
 * - 规划节点 / 总结节点都需要“直接调用 LLM”并解析 JSON
 * - 走 agent 的 tool-calls 流程会让控制流变得不可控（由 LLM 决定是否调用工具）
 */
export interface AgentRuntime {
  agent: any
  model: ReturnType<typeof buildChatModel>
  /** 知识库 API 基础地址（供 graph/node 直接调用） */
  knowledgeApiUrl: string
}

/**
 * 创建最小化 Runtime（当前仍使用 LangChain Agent）
 *
 * 后续会迁移到 LangGraph：
 * - model/graph.ts 返回 CompiledStateGraph
 * - runtime.invoke() 改为 graph.invoke/stream
 */
export function createAgentRuntime(params: {
  config: LangchainClientAgentCreateConfig
  knowledgeApiUrl: string
  getRetrievalConfig: () => LangchainClientAgentCreateConfig['retrieval']
  systemPrompt: string
}): AgentRuntime {
  // 1) 创建原始 ChatModel（OpenAI 兼容）
  const model = buildChatModel(params.config)

  // 2) 创建工具集合（目前含 knowledge_search，未来可扩展）
  const tools = buildAgentTools({
    knowledgeApiUrl: params.knowledgeApiUrl,
    getRetrievalConfig: params.getRetrievalConfig
  })

  // 3) 创建 agent（LangChain 内置工具调用代理）
  const agent = createAgent({
    model,
    tools,
    systemPrompt: params.systemPrompt
  })

  return {
    agent,
    model,
    knowledgeApiUrl: params.knowledgeApiUrl
  }
}
