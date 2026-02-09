/**
 * Knowledge Retrieval 工具节点注册
 */
import type { UtilNodeRegistration } from '../types'
import { runKnowledgeRetrieval } from './knowledge-retrieval.node'
import type { LangchainClientRetrievalConfig } from '@shared/langchain-client.types'

export * from './knowledge-retrieval.node'

export interface KnowledgeRetrievalSystemParams {
  apiBaseUrl: string
  retrieval?: LangchainClientRetrievalConfig
  abortSignal?: AbortSignal
}

export interface KnowledgeRetrievalUserParams {
  query: string
  k?: number
}

export const knowledgeRetrievalReg: UtilNodeRegistration = {
  descriptor: {
    id: 'knowledge_retrieval',
    name: '知识库检索',
    description:
      '从本地知识库中检索与查询相关的文档片段。支持向量检索、语义重排、多文档范围检索。适合需要从已导入的私有文档、笔记、论文中查找相关内容的场景。',
    inputDescription:
      'query: 检索查询文本（自然语言）; k: 返回结果数（可选，默认由系统配置决定）',
    outputDescription:
      'JSON: { query, totalScopes, scopes: [{ knowledgeBaseId, tableName, hits: [{ content, file_name, distance, rerank_score, ... }] }] }'
  },
  nodeFactory: (systemParams: KnowledgeRetrievalSystemParams) => ({
    run: async (userParams: KnowledgeRetrievalUserParams) => {
      return runKnowledgeRetrieval({
        ...systemParams,
        ...userParams,
        maxK: systemParams.retrieval?.k
      })
    }
  })
}
