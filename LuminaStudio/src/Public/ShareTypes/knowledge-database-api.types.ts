/**
 * Shared DTOs for the external KnowledgeDatabase REST API.
 *
 * Note:
 * - These are pure data contracts. No Electron imports.
 * - Renderer should NOT import from here directly; use @preload/types as the single authority.
 * - 当前文件是 LuminaStudio 对知识库 REST 服务端契约的镜像声明。
 */

export interface ExternalApiErrorInfo {
  code: string
  message: string
  details?: unknown
}

export type ExternalApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ExternalApiErrorInfo }

export interface KnowledgeDatabaseStatusData {
  status: 'ok'
  version: string
  uptime: number
}

export interface KnowledgeBaseInfo {
  id: number
  name: string
  description: string
  docCount: number
  chunkCount: number
  createdAt: string
  lastUpdated: string
  color: string
  icon: string
}

export interface KGKnowledgeBaseInfo {
  id: number
  name: string
  description: string
  databaseName: string
}

export interface KnowledgeBaseDetail extends KnowledgeBaseInfo {
  databaseName: string
  documentPath?: string
}

export type DocumentEmbeddingStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface DocumentEmbeddingItem {
  embeddingConfigId: string
  embeddingConfigName?: string
  dimensions: number
  status: DocumentEmbeddingStatus
  chunkCount: number
  updatedAt: string
}

export interface DocumentInfo {
  id: string
  fileKey: string
  fileName: string
  fileType: string
  updatedAt: string
  embeddings: DocumentEmbeddingItem[]
}

export interface DocumentEmbeddingInfo {
  fileKey: string
  embeddingConfigId: string
  embeddingConfigName?: string
  dimensions: number
  status: DocumentEmbeddingStatus
  chunkCount: number
  updatedAt: string
}

export interface PaginationInfo {
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ListDocumentsData {
  documents: DocumentInfo[]
  pagination: PaginationInfo
}

export interface RetrievalHit {
  id: string
  content: string
  chunk_index?: number
  file_key?: string
  file_name?: string
  distance?: number
  rerank_score?: number
}

export interface RetrievalSearchRequest {
  knowledgeBaseId: number
  tableName: string
  queryText: string
  fileKey?: string
  fileKeys?: string[]
  k?: number
  ef?: number
  rerankModelId?: string
  rerankTopN?: number
}

export type RetrievalSearchResult = RetrievalHit[]

export interface KGGraphTableInfo {
  graphTableBase: string
  displayName?: string
  entityCount: number
  relationCount: number
}

export type KGGraphTablesResponse = KGGraphTableInfo[]

export interface KGModelInfo {
  id: string
  displayName: string
  providerId: string
  providerName: string
  group?: string
  protocol?: string
  dimensions?: number
  maxTokens?: number
}

export type KGModelsListResponse = KGModelInfo[]

export type KGRetrievalMode = 'local' | 'global' | 'hybrid' | 'naive'

export interface KGRetrievalSearchRequest {
  graphTableBase: string
  query?: string
  mode?: KGRetrievalMode
  highLevelKeywords?: string[]
  lowLevelKeywords?: string[]
  rerank?: {
    enabled: boolean
    modelId?: string
    topN?: number
  }
}

export interface KGRetrievalEntity {
  id: string
  name: string
  entity_type: string
  description: string
  score: number
}

export interface KGRetrievalRelation {
  id: string
  source_name: string
  target_name: string
  description: string
  keywords: string
  score: number
}

export interface KGRetrievalChunk {
  id: string
  content: string
  file_key: string
  file_name?: string
  chunk_index?: number
  score: number
  source: 'entity_expansion' | 'relation_expansion' | 'direct_vector'
}

export interface KGRetrievalMeta {
  mode: KGRetrievalMode
  extractedKeywords: {
    highLevel: string[]
    lowLevel: string[]
  }
  entityCount: number
  relationCount: number
  chunkCount: number
  durationMs: number
  rerankApplied: boolean
}

export interface KGRetrievalSearchResult {
  entities: KGRetrievalEntity[]
  relations: KGRetrievalRelation[]
  chunks: KGRetrievalChunk[]
  meta: KGRetrievalMeta
}
