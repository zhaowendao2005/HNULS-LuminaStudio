/**
 * ======================================================================
 * 知识搜索工具 - LangChain Tool 层
 * ======================================================================
 *
 * 🎯 职责:
 * 将知识检索节点包装成 LangChain 能理解的 Tool 对象
 * - Tool 是 LLM 可以调用的指令
 * - 描述了工具的捕熙、参数等
 *
 * 🏗️ 架构:
 * 1. 定义 Tool 常严
 *    - name: 'knowledge_search' - LLM 调用时使用的名称
 *    - description: 描述此工具的作用
 *    - schema: 参数描述 (Zod schema)
 *
 * 2. 实现执行函数
 *    - 接收 LLM 发来的序列化参数
 *    - 执行实际的业务逻辑 (runKnowledgeRetrieval)
 *    - 返回结果
 *
 * 📡 为什么要有 Tool 层？
 * - 解耦：node 含有业务逻辑，tool 只是 LangChain 的布缆
 * - 易于扩展：未来可为不同模型添加炸器/验证器
 * - 易于维护：node 与node 不交叉依赖
 */
import { tool } from 'langchain'
import { z } from 'zod'
import type { LangchainClientRetrievalConfig } from '@shared/langchain-client.types'
import { runKnowledgeRetrieval } from '../nodes/knowledge/knowledge-retrieval.node'

/**
 * 创建知识搜索 Tool
 *
 * 🎯 参数:
 * - apiBaseUrl: 知识库 API 的基础 URL
 * - getRetrievalConfig: 字段，返回当前选择的检索配置
 *   (为什么是函数？因为检索配置会实时方销）
 */
export function createKnowledgeSearchTool(params: {
  apiBaseUrl: string
  getRetrievalConfig: () => LangchainClientRetrievalConfig | undefined
}) {
  return tool(
    async ({ query }: { query: string }) => {
      const retrieval = params.getRetrievalConfig()
      return runKnowledgeRetrieval({
        apiBaseUrl: params.apiBaseUrl,
        query,
        retrieval
      })
    },
    {
      name: 'knowledge_search',
      description: '从知识库中检索与问题相关的文档片段。',
      schema: z.object({
        query: z.string().describe('检索查询文本')
      })
    }
  )
}
