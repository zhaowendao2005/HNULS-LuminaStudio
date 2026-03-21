import type { DocumentInfo, KnowledgeBaseInfo } from '@shared/knowledge-database-api.types'

/**
 * 调试页中的文档状态。
 * 这里保留 `empty`，方便区分“已加载但还没有有效 embedding”的情况。
 */
export type KnowledgeDebugDocumentState = 'completed' | 'partial' | 'pending' | 'failed' | 'empty'

/**
 * 文档状态筛选项。
 */
export type KnowledgeDebugDocumentStatusFilter = 'all' | KnowledgeDebugDocumentState

/**
 * 结果排序方式。
 */
export type KnowledgeDebugResultSortMode = 'distance' | 'rerankScore' | 'chunkIndex'

/**
 * 调试页中的文档节点。
 */
export interface KnowledgeDebugDocumentNode extends DocumentInfo {
  knowledgeBaseId: number
  embeddingCount: number
  completedEmbeddingCount: number
  embeddingState: KnowledgeDebugDocumentState
  selected: boolean
}

/**
 * 调试页中的知识库节点。
 */
export interface KnowledgeDebugKnowledgeBaseNode extends KnowledgeBaseInfo {
  expanded: boolean
  selected: boolean
  documentsLoaded: boolean
  loadingDocuments: boolean
  documents: KnowledgeDebugDocumentNode[]
}

/**
 * 当前选中的资源范围摘要。
 */
export interface KnowledgeDebugSelectionState {
  selectedKnowledgeBaseIds: number[]
  selectedDocumentsByBase: Record<number, string[]>
}
