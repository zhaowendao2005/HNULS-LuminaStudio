import type { DocumentInfo, KnowledgeBaseInfo } from '@shared/knowledge-database-api.types'
import type {
  KnowledgeDatabaseResolveKnowledgeRetrievalScopesRequest,
  KnowledgeDatabaseResolveKnowledgeRetrievalScopesResponse,
  KnowledgeDatabaseSearchKnowledgeRetrievalRequest,
  KnowledgeDatabaseSearchKnowledgeRetrievalResponse,
  KnowledgeDatabaseListDocsRequest
} from '@preload/types'

const DEFAULT_PAGE_SIZE = 100

function assertSuccess<T>(response: { success: boolean; data?: T; error?: string }): T {
  if (!response.success || response.data == null) {
    throw new Error(response.error || '请求失败')
  }
  return response.data
}

/**
 * Knowledge Debug 数据源。
 * 只负责 renderer ↔ preload API 的薄适配，不做业务判断。
 */
export const KnowledgeDebugDataSource = {
  async listKnowledgeBases(): Promise<KnowledgeBaseInfo[]> {
    const response = await window.api.knowledgeDatabase.listKnowledgeBases()
    return assertSuccess(response).knowledgeBases
  },

  async listAllDocumentsByKnowledgeBaseId(knowledgeBaseId: number): Promise<DocumentInfo[]> {
    const documents: DocumentInfo[] = []
    let page = 1
    let totalPages = 1

    while (page <= totalPages) {
      const request: KnowledgeDatabaseListDocsRequest = {
        knowledgeBaseId,
        page,
        pageSize: DEFAULT_PAGE_SIZE
      }
      const response = await window.api.knowledgeDatabase.listDocuments(request)
      const data = assertSuccess(response)
      documents.push(...data.documents)
      totalPages = Math.max(1, data.totalPages)
      page += 1
    }

    return documents
  },

  async resolveKnowledgeRetrievalScopes(
    request: KnowledgeDatabaseResolveKnowledgeRetrievalScopesRequest
  ): Promise<KnowledgeDatabaseResolveKnowledgeRetrievalScopesResponse> {
    const response = await window.api.knowledgeDatabase.resolveKnowledgeRetrievalScopes(request)
    return assertSuccess(response)
  },

  async searchKnowledgeRetrieval(
    request: KnowledgeDatabaseSearchKnowledgeRetrievalRequest
  ): Promise<KnowledgeDatabaseSearchKnowledgeRetrievalResponse> {
    const response = await window.api.knowledgeDatabase.searchKnowledgeRetrieval(request)
    return assertSuccess(response)
  }
}
