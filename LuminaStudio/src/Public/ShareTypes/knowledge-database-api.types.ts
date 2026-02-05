/**
 * Shared DTOs for the external KnowledgeDatabase REST API.
 *
 * Note:
 * - These are pure data contracts. No Electron imports.
 * - Renderer should NOT import from here directly; use @preload/types as the single authority.
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
 * 文档的单个嵌入配置信息
 */
export interface DocumentEmbeddingItem {
  /** 嵌入配置 ID */
  embeddingConfigId: string
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
 * 文档信息
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
