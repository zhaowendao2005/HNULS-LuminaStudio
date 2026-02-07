import { tool } from 'langchain'
import { z } from 'zod'
import type { LangchainClientRetrievalConfig } from '@shared/langchain-client.types'
import { runKnowledgeRetrieval } from '../nodes/knowledge/knowledge-retrieval.node'

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
