import type {
  DocumentEmbeddingInfo,
  DocumentInfo,
  KGGraphTableInfo,
  KGKnowledgeBaseInfo,
  KnowledgeBaseInfo
} from '@shared/knowledge-database-api.types'
import type { NormalChatKnowledgeRetrievalPolicyTable } from '@preload/types'

export type RetrievalConfigPanelId = 'vector' | 'kg'

export type RetrievalConfigVectorMode = 'global' | 'documents' | 'disabled'
export type RetrievalConfigKgMode = 'global' | 'tables' | 'disabled'

export interface RetrievalConfigVectorEmbeddingNode extends DocumentEmbeddingInfo {
  tableName: string
  selected: boolean
}

export interface RetrievalConfigVectorDocumentNode extends DocumentInfo {
  expanded: boolean
  selected: boolean
  embeddingsLoaded: boolean
  loadingEmbeddings: boolean
  embeddingCount: number
  displayEmbeddingCount: number
  availableTables: NormalChatKnowledgeRetrievalPolicyTable[]
  embeddings: RetrievalConfigVectorEmbeddingNode[]
}

export interface RetrievalConfigVectorKnowledgeBaseNode extends KnowledgeBaseInfo {
  expanded: boolean
  selected: boolean
  documentsLoaded: boolean
  loadingDocuments: boolean
  displayDocCount: number
  documents: RetrievalConfigVectorDocumentNode[]
}

export interface RetrievalConfigKgGraphTableNode extends KGGraphTableInfo {
  selected: boolean
}

export interface RetrievalConfigKgKnowledgeBaseNode extends KGKnowledgeBaseInfo {
  expanded: boolean
  selected: boolean
  graphTablesLoaded: boolean
  loadingGraphTables: boolean
  graphTables: RetrievalConfigKgGraphTableNode[]
}
