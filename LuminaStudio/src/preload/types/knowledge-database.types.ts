/**
 * Knowledge Database 跨进程类型定义（Preload 侧聚合导出）
 */

import type { ApiResponse } from './base.types'
import type {
  DocumentInfo,
  DocumentEmbeddingInfo,
  ExternalApiErrorInfo,
  KGKnowledgeBaseInfo,
  KGGraphTablesResponse,
  KGModelsListResponse,
  KGRetrievalSearchRequest,
  KGRetrievalSearchResult,
  KnowledgeBaseInfo,
  RetrievalSearchRequest,
  RetrievalSearchResult
} from '@shared/knowledge-database-api.types'

export type {
  KGGraphTableInfo,
  KGGraphTablesResponse,
  KGKnowledgeBaseInfo,
  KGModelInfo,
  KGModelsListResponse,
  KGRetrievalMode,
  KGRetrievalSearchRequest,
  KGRetrievalEntity,
  KGRetrievalRelation,
  KGRetrievalChunk,
  KGRetrievalMeta,
  KGRetrievalSearchResult,
  RetrievalHit,
  RetrievalSearchRequest,
  RetrievalSearchResult
} from '@shared/knowledge-database-api.types'

export type KnowledgeDatabaseListBasesRequest = void

export interface KnowledgeDatabaseListDocsRequest {
  knowledgeBaseId: number
  page?: number
  pageSize?: number
}

export interface KnowledgeDatabaseListDocumentEmbeddingsRequest {
  knowledgeBaseId: number
  fileKey: string
}

export type KnowledgeDatabasePermissionEffect = 'allow' | 'deny' | 'inherit'

export interface KnowledgeDatabaseEmbeddingRule {
  embeddingConfigId: string
  dimensions: number
  effect?: KnowledgeDatabasePermissionEffect
}

export interface KnowledgeDatabaseDocumentRule {
  fileKey: string
  effect?: KnowledgeDatabasePermissionEffect
  embeddings?: KnowledgeDatabaseEmbeddingRule[]
}

export interface KnowledgeDatabaseLegacyPermissionTreeNode {
  id: string
  label?: string
  kind?: 'provider' | 'knowledge-base' | 'scope' | 'file' | string
  checked?: boolean
  knowledgeBaseId?: number | null
  knowledge_base_id?: number | null
  fileKey?: string | null
  file_key?: string | null
  metadata?: Record<string, unknown>
  children?: KnowledgeDatabaseLegacyPermissionTreeNode[]
}

export interface KnowledgeDatabasePermissionTree {
  effect?: KnowledgeDatabasePermissionEffect
  documents?: KnowledgeDatabaseDocumentRule[]
  knowledgeBaseIds?: number[]
  knowledgeBaseId?: number | null
  knowledgeBases?: Array<{
    knowledgeBaseId?: number | null
    knowledge_base_id?: number | null
    effect?: KnowledgeDatabasePermissionEffect
    documents?: KnowledgeDatabaseDocumentRule[]
  }>
  knowledge_base_rules?: Array<{
    knowledgeBaseId?: number | null
    knowledge_base_id?: number | null
    effect?: KnowledgeDatabasePermissionEffect
    documents?: KnowledgeDatabaseDocumentRule[]
  }>
  providers?: KnowledgeDatabaseLegacyPermissionTreeNode[]
}

export interface KnowledgeDatabaseResolvedScope {
  knowledgeBaseId: number
  fileKey: string
  fileName: string
  embeddingConfigId: string
  dimensions: number
  tableName: string
  chunkCount: number
}

export interface KnowledgeDatabaseRetrievalWarning {
  code:
    | 'DOCUMENT_RULE_TARGET_NOT_FOUND'
    | 'EMBEDDING_RULE_TARGET_NOT_FOUND'
    | 'DOCUMENT_HAS_NO_COMPLETED_EMBEDDINGS'
  message: string
  details?: Record<string, unknown>
}

export interface KnowledgeDatabaseRetrievalError {
  code:
    | 'INVALID_REQUEST'
    | 'INVALID_RERANK_CONFIG'
    | 'KNOWLEDGE_BASE_LOAD_FAILED'
    | 'UPSTREAM_HTTP_ERROR'
    | 'UPSTREAM_RESPONSE_INVALID'
    | 'NETWORK_ERROR'
    | 'ABORTED'
    | 'UNKNOWN_ERROR'
  message: string
  retriable: boolean
  details?: Record<string, unknown>
}

export interface KnowledgeDatabaseRetrievalHit {
  id: string
  content: string
  chunkIndex?: number
  fileKey: string
  fileName: string
  distance?: number
  rerankScore?: number
  scope: KnowledgeDatabaseResolvedScope
}

export interface KnowledgeDatabaseRetrievalScopeResult {
  scope: KnowledgeDatabaseResolvedScope
  hits: KnowledgeDatabaseRetrievalHit[]
  error?: KnowledgeDatabaseRetrievalError
}

export interface KnowledgeDatabaseResolveKnowledgeRetrievalScopesRequest {
  knowledgeBaseId?: number
  knowledgeBaseIds?: number[]
  selectedKnowledgeBaseIds?: number[]
  selectedDocumentFileKeysByKnowledgeBase?: Record<number, string[]>
  permissionTree?: KnowledgeDatabasePermissionTree
}

export interface KnowledgeDatabaseResolveKnowledgeRetrievalScopesResponse {
  knowledgeBaseId: number | null
  knowledgeBaseIds: number[]
  resolvedScopes: KnowledgeDatabaseResolvedScope[]
  warnings: KnowledgeDatabaseRetrievalWarning[]
}

export type KnowledgeDatabaseSearchKnowledgeRetrievalRequest = RetrievalSearchRequest
export type KnowledgeDatabaseSearchKnowledgeRetrievalResponse = RetrievalSearchResult

export interface KnowledgeDatabaseListBasesResponse {
  knowledgeBases: KnowledgeBaseInfo[]
}

export interface KnowledgeDatabaseListKGKnowledgeBasesResponse {
  knowledgeBases: KGKnowledgeBaseInfo[]
}

export interface KnowledgeDatabaseListDocumentEmbeddingsResponse {
  embeddings: DocumentEmbeddingInfo[]
}

export interface KnowledgeDatabaseListDocsResponse {
  documents: DocumentInfo[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface KnowledgeDatabaseConnectionStatus {
  connected: boolean
  baseUrl?: string
  error?: ExternalApiErrorInfo
}

export interface KnowledgeDatabaseAPI {
  checkConnection: () => Promise<ApiResponse<KnowledgeDatabaseConnectionStatus>>
  listKnowledgeBases: () => Promise<ApiResponse<KnowledgeDatabaseListBasesResponse>>
  listDocuments: (
    request: KnowledgeDatabaseListDocsRequest
  ) => Promise<ApiResponse<KnowledgeDatabaseListDocsResponse>>
  listDocumentEmbeddings: (
    request: KnowledgeDatabaseListDocumentEmbeddingsRequest
  ) => Promise<ApiResponse<KnowledgeDatabaseListDocumentEmbeddingsResponse>>
  resolveKnowledgeRetrievalScopes: (
    request: KnowledgeDatabaseResolveKnowledgeRetrievalScopesRequest
  ) => Promise<ApiResponse<KnowledgeDatabaseResolveKnowledgeRetrievalScopesResponse>>
  searchKnowledgeRetrieval: (
    request: KnowledgeDatabaseSearchKnowledgeRetrievalRequest
  ) => Promise<ApiResponse<KnowledgeDatabaseSearchKnowledgeRetrievalResponse>>
  listKGKnowledgeBases: () => Promise<ApiResponse<KnowledgeDatabaseListKGKnowledgeBasesResponse>>
  getKGConfigs: (knowledgeBaseId: number) => Promise<ApiResponse<{ knowledgeGraph: unknown }>>
  getKGGraphTables: (knowledgeBaseId: number) => Promise<ApiResponse<KGGraphTablesResponse>>
  listKGModels: () => Promise<ApiResponse<KGModelsListResponse>>
  kgRetrievalSearch: (
    request: KGRetrievalSearchRequest
  ) => Promise<ApiResponse<KGRetrievalSearchResult>>
}
