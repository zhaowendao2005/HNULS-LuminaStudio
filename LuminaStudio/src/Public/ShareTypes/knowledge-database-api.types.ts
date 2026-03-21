/**
 * Shared DTOs for the external KnowledgeDatabase REST API.
 *
 * Note:
 * - These are pure data contracts. No Electron imports.
 * - Renderer should NOT import from here directly; use @preload/types as the single authority.
 * - 当前文件是 LuminaStudio 对知识库 REST 服务端契约的镜像声明。
 */

// ============================
// Base REST response contracts
// ============================

export interface ExternalApiErrorInfo {
  code: string
  message: string
  details?: unknown
}

export type ExternalApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ExternalApiErrorInfo }

// ============================
// Health / status
// ============================

export interface KnowledgeDatabaseStatusData {
  status: 'ok'
  version: string
  uptime: number
}

// ============================
// Knowledge bases
// ============================

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

export interface KnowledgeBaseDetail extends KnowledgeBaseInfo {
  databaseName: string
  documentPath?: string
}

// ============================
// Documents
// ============================

export type DocumentEmbeddingStatus = 'pending' | 'running' | 'completed' | 'failed'

/**
 * 文档的单个嵌入配置信息。
 * 注意：服务端返回的真实形态是数组项，而不是单对象。
 */
export interface DocumentEmbeddingItem {
  /** 嵌入配置 ID */
  embeddingConfigId: string
  /** 嵌入配置展示名 */
  embeddingConfigName?: string
  /** 向量维度 */
  dimensions: number
  /** 状态 */
  status: DocumentEmbeddingStatus
  /** 分片数量 */
  chunkCount: number
  /** 更新时间 */
  updatedAt: string
}

/**
 * 文档信息。
 */
export interface DocumentInfo {
  /** 记录 ID */
  id: string
  /** 文件标识 (相对路径) */
  fileKey: string
  /** 文件名 */
  fileName: string
  /** 文件类型 */
  fileType: string
  /** 更新时间 */
  updatedAt: string
  /** 该文档的所有嵌入配置列表 */
  embeddings: DocumentEmbeddingItem[]
}

/**
 * 文档嵌入信息 (用于单独查询某文档的嵌入状态)
 * @deprecated 使用 DocumentInfo.embeddings 代替
 */
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

// ============================
// Retrieval
// ============================

/**
 * 与知识库 REST 服务端 `/api/v1/retrieval/search` 对齐的请求体。
 */
export interface RetrievalSearchParams {
  knowledgeBaseId: number
  tableName: string
  queryText: string
  /**
   * 单文件筛选。
   * 服务端优先级高于 fileKeys。
   */
  fileKey?: string
  /**
   * 多文件筛选。
   * 传空数组会被服务端判为 400。
   */
  fileKeys?: string[]
  k?: number
  ef?: number
  rerankModelId?: string
  rerankTopN?: number
}

/**
 * `/api/v1/retrieval/search` 返回的单条命中。
 */
export interface RetrievalHit {
  id: string
  content: string
  chunk_index?: number
  file_key?: string
  file_name?: string
  distance?: number
  rerank_score?: number
}

export interface RetrievalSearchResult {
  hits: RetrievalHit[]
}
