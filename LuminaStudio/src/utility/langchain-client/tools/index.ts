/**
 * ======================================================================
 * 工具工厂 - 构建 Agent 的所有工具
 * ======================================================================
 *
 * 🎯 职责:
 * 集中管理和创建 Agent 使用的所有工具 (Tool)
 * - 知识搜索工具（必需）
 * - 未来：其他工具（计算器、网页搜索等）
 *
 * 💡 为什么需要工厂？
 * - 集中管理：所有工具在一个地方
 * - 易于扩展：添加新工具只需在这里添加
 * - 解耦：Tool 创建逻辑与 Agent 创建分离
 */
import type { LangchainClientAgentCreateConfig } from '@shared/langchain-client.types'
import { createKnowledgeSearchTool } from './retrieval-tool'

/**
 * 构建 Agent 的工具列表
 *
 * 🎯 作用:
 * 根据配置参数，创建并返回 Agent 所有可用的工具
 *
 * 📌 当前工具:
 * 1. knowledge_search - 从知识库检索相关文档
 *
 * 💡 设计亮点:
 * - 即使没有选择检索范围，工具也会注册
 * - Tool 会向用户提示：未选择范围
 * - 这样设计可以教导用户正确使用
 */
export function buildAgentTools(params: {
  knowledgeApiUrl: string
  getRetrievalConfig: () => LangchainClientAgentCreateConfig['retrieval']
}): any[] {
  const tools: any[] = []

  // 始终注册知识搜索工具
  // 如果用户未选择范围，工具会返回错误提示
  tools.push(
    createKnowledgeSearchTool({
      apiBaseUrl: params.knowledgeApiUrl,
      getRetrievalConfig: params.getRetrievalConfig
    })
  )

  return tools
}
