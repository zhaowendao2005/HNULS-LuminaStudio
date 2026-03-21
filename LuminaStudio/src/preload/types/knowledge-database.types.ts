/**
 * Knowledge Database 跨进程类型定义（Preload 权威来源）
 *
 * 注意：
 * - 这些类型是 Renderer ↔ Preload ↔ Main 之间通信的契约
 * - 外部 API 的 DTO 定义在 @shared/knowledge-database-api.types.ts
 */

import type { ApiResponse } from './base.types'
import type {
  KnowledgeBaseInfo,
  DocumentInfo,
  ExternalApiErrorInfo
} from '@shared/knowledge-database-api.types'

// ==================== 请求类型 ====================

/**
 * 获取知识库列表请求（无需参数）
 */
export type KnowledgeDatabaseListBasesRequest = void

/**
 * 获取指定知识库下的文档列表请求
 */
export interface KnowledgeDatabaseListDocsRequest {
  knowledgeBaseId: number
  page?: number
  pageSize?: number
}

/**
 * 检索权限树中的权限效果。
 */
export type KnowledgeDatabasePermissionEffect = 'allow' | 'deny' | 'inherit'

/**
 * 检索权限树中的 embedding 规则。
 */
export interface KnowledgeDatabaseEmbeddingRule {
  embeddingConfigId: string
  dimensions: number
  effect?: KnowledgeDatabasePermissionEffect
}

/**
 * 检索权限树中的文档规则。
 */
export interface KnowledgeDatabaseDocumentRule {
  fileKey: string
  effect?: KnowledgeDatabasePermissionEffect
  embeddings?: KnowledgeDatabaseEmbeddingRule[]
}

/**
 * 兼容旧结构的 permission tree 节点。
 */
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

/**
 * 检索权限树主结构。
 */
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

/**
 * 检索 scope DTO。
 */
export interface KnowledgeDatabaseResolvedScope {
  knowledgeBaseId: number
  fileKey: string
  fileName: string
  embeddingConfigId: string
  dimensions: number
  tableName: string
  chunkCount: number
}

/**
 * 检索 warning DTO。
 */
export interface KnowledgeDatabaseRetrievalWarning {
  code:
    | 'DOCUMENT_RULE_TARGET_NOT_FOUND'
    | 'EMBEDDING_RULE_TARGET_NOT_FOUND'
    | 'DOCUMENT_HAS_NO_COMPLETED_EMBEDDINGS'
  message: string
  details?: Record<string, unknown>
}

/**
 * 检索 error DTO。
 */
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

/**
 * 检索 hit DTO。
 */
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

/**
 * 检索 scopeResult DTO。
 */
export interface KnowledgeDatabaseRetrievalScopeResult {
  scope: KnowledgeDatabaseResolvedScope
  hits: KnowledgeDatabaseRetrievalHit[]
  error?: KnowledgeDatabaseRetrievalError
}

/**
 * 解析 scope 的请求。
 */
export interface KnowledgeDatabaseResolveKnowledgeRetrievalScopesRequest {
  knowledgeBaseId?: number
  knowledgeBaseIds?: number[]
  permissionTree?: KnowledgeDatabasePermissionTree
}

/**
 * 解析 scope 的响应。
 */
export interface KnowledgeDatabaseResolveKnowledgeRetrievalScopesResponse {
  knowledgeBaseId: number | null
  knowledgeBaseIds: number[]
  resolvedScopes: KnowledgeDatabaseResolvedScope[]
  warnings: KnowledgeDatabaseRetrievalWarning[]
}

/**
 * 执行知识检索的请求。
 */
export interface KnowledgeDatabaseSearchKnowledgeRetrievalRequest {
  knowledgeBaseId?: number
  knowledgeBaseIds?: number[]
  query: string
  permissionTree?: KnowledgeDatabasePermissionTree
  k?: number
  ef?: number
  rerank?: {
    modelId?: string | null
    topN?: number | null
  }
}

/**
 * 执行知识检索的响应。
 */
export interface KnowledgeDatabaseSearchKnowledgeRetrievalResponse {
  query: string
  knowledgeBaseId: number | null
  knowledgeBaseIds: number[]
  k: number
  ef?: number
  rerankModelId?: string
  rerankTopN?: number
  resolvedScopes: KnowledgeDatabaseResolvedScope[]
  scopeResults: KnowledgeDatabaseRetrievalScopeResult[]
  hits: KnowledgeDatabaseRetrievalHit[]
  warnings: KnowledgeDatabaseRetrievalWarning[]
  errors: KnowledgeDatabaseRetrievalError[]
}

// ==================== 响应类型 ====================

/**
 * 知识库列表响应
 */
export interface KnowledgeDatabaseListBasesResponse {
  knowledgeBases: KnowledgeBaseInfo[]
}

/**
 * 文档列表响应
 */
export interface KnowledgeDatabaseListDocsResponse {
  documents: DocumentInfo[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * 连接状态响应
 */
export interface KnowledgeDatabaseConnectionStatus {
  connected: boolean
  baseUrl?: string
  error?: ExternalApiErrorInfo
}

// ==================== API 接口定义 ====================

/**
 * Knowledge Database API 契约
 */
export interface KnowledgeDatabaseAPI {
  /**
   * 检查与外部服务的连接状态
   */
  checkConnection: () => Promise<ApiResponse<KnowledgeDatabaseConnectionStatus>>

  /**
   * 获取所有知识库列表
   */
  listKnowledgeBases: () => Promise<ApiResponse<KnowledgeDatabaseListBasesResponse>>

  /**
   * 获取指定知识库下的文档列表
   */
  listDocuments: (
    request: KnowledgeDatabaseListDocsRequest
  ) => Promise<ApiResponse<KnowledgeDatabaseListDocsResponse>>

  /**
   * 解析知识检索的 scope。
   */
  resolveKnowledgeRetrievalScopes: (
    request: KnowledgeDatabaseResolveKnowledgeRetrievalScopesRequest
  ) => Promise<ApiResponse<KnowledgeDatabaseResolveKnowledgeRetrievalScopesResponse>>

  /**
   * 执行知识检索。
   */
  searchKnowledgeRetrieval: (
    request: KnowledgeDatabaseSearchKnowledgeRetrievalRequest
  ) => Promise<ApiResponse<KnowledgeDatabaseSearchKnowledgeRetrievalResponse>>
}
