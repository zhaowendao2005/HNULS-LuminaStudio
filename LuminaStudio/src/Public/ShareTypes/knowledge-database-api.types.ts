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

export type DocumentEmbeddingStatus = 'pending' | 'running' | 'completed' | 'failed' | 'none'

export interface DocumentInfo {
  id: string
  fileKey: string
  fileName: string
  fileType: string
  chunkCount: number
  embeddingStatus: DocumentEmbeddingStatus
  embeddingModel?: string
  embeddingDimensions?: number
  updatedAt: string
}

export interface DocumentEmbeddingInfo {
  fileKey: string
  embeddingConfigId: string
  dimensions: number
  status: 'pending' | 'running' | 'completed' | 'failed'
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
