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

export interface AgentRuntime {
  agent: any
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
  const model = buildChatModel(params.config)
  const tools = buildAgentTools({
    knowledgeApiUrl: params.knowledgeApiUrl,
    getRetrievalConfig: params.getRetrievalConfig
  })
  const agent = createAgent({
    model,
    tools,
    systemPrompt: params.systemPrompt
  })
  return { agent }
}
