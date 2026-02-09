/**
 * Knowledge Retrieval 工具节点注册
 */
import type { UtilNodeRegistration } from '../types'
import { runKnowledgeRetrieval } from './knowledge-retrieval.node'
import type { LangchainClientRetrievalConfig } from '@shared/langchain-client.types'
import { KNOWLEDGE_RETRIEVAL_DESCRIPTOR } from '@prompt/knowledge-retrieval.node.prompt'

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
  descriptor: KNOWLEDGE_RETRIEVAL_DESCRIPTOR,
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
