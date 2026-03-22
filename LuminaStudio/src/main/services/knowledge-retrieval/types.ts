import type { DocumentEmbeddingItem } from '@shared/knowledge-database-api.types'

/**
 * knowledge-retrieval 服务域统一类型。
 *
 * 这里的职责是定义 main 进程内部的标准 DTO，
 * 后续 private RPC / bridge 只需要复用这里的结构即可。
 */

export type KnowledgeRetrievalPermissionEffect = 'allow' | 'deny' | 'inherit'

/**
 * embedding 粒度规则。
 * 真相范围固定为：knowledgeBaseId + fileKey + embeddingConfigId + dimensions。
 */
export interface KnowledgeRetrievalEmbeddingRule {
  embeddingConfigId: string
  dimensions: number
  effect?: KnowledgeRetrievalPermissionEffect
}

/**
 * 文档粒度规则。
 */
export interface KnowledgeRetrievalDocumentRule {
  fileKey: string
  effect?: KnowledgeRetrievalPermissionEffect
  embeddings?: KnowledgeRetrievalEmbeddingRule[]
}

/**
 * 新结构：按知识库拆分的规则节点。
 * 兼容 snake_case / camelCase 两种知识库 id 字段。
 */
export interface KnowledgeRetrievalKnowledgeBaseRule {
  knowledgeBaseId?: number | null
  knowledge_base_id?: number | null
  effect?: KnowledgeRetrievalPermissionEffect
  documents?: KnowledgeRetrievalDocumentRule[]
}

/**
 * 旧结构：renderer permission tree 的树节点（providers/knowledge-base/file）。
 * main 仅做兼容解析，不强耦合 UI 细节。
 */
export interface KnowledgeRetrievalLegacyPermissionTreeNode {
  id: string
  label?: string
  kind?: 'provider' | 'knowledge-base' | 'scope' | 'file' | string
  checked?: boolean
  knowledgeBaseId?: number | null
  knowledge_base_id?: number | null
  fileKey?: string | null
  file_key?: string | null
  metadata?: Record<string, unknown>
  children?: KnowledgeRetrievalLegacyPermissionTreeNode[]
}

/**
 * 知识库粒度规则树。
 *
 * 注意：根节点不信任 renderer 传来的 tableName，
 * 只接受 knowledgeBaseId 以及更细粒度的 fileKey / embedding 信息。
 */
export interface KnowledgeRetrievalPermissionTree {
  effect?: KnowledgeRetrievalPermissionEffect
  documents?: KnowledgeRetrievalDocumentRule[]
  /**
   * 新结构：多知识库目标。
   */
  knowledgeBaseIds?: number[]
  /**
   * 旧结构：单知识库目标。
   */
  knowledgeBaseId?: number | null
  /**
   * 新结构：按知识库规则分层。
   */
  knowledgeBases?: KnowledgeRetrievalKnowledgeBaseRule[]
  /**
   * 兼容字段：部分旧序列化使用 snake_case。
   */
  knowledge_base_rules?: KnowledgeRetrievalKnowledgeBaseRule[]
  /**
   * 旧结构：UI 权限树（provider -> knowledge-base -> file）。
   */
  providers?: KnowledgeRetrievalLegacyPermissionTreeNode[]
}

/**
 * 标准化 scope DTO。
 * 后续所有检索都基于这个 DTO，而不是 renderer 自带的 tableName。
 */
export interface KnowledgeRetrievalResolvedScopeDto {
  knowledgeBaseId: number
  fileKey: string
  fileName: string
  embeddingConfigId: string
  dimensions: number
  tableName: string
  chunkCount: number
}

/**
 * 文档展开后的中间结构。
 * 方便权限解析器和执行器共享上下文。
 */
export interface KnowledgeRetrievalDocumentEmbeddingContext {
  fileKey: string
  fileName: string
  embedding: DocumentEmbeddingItem
}

export interface KnowledgeRetrievalWarningDto {
  code:
    | 'DOCUMENT_RULE_TARGET_NOT_FOUND'
    | 'EMBEDDING_RULE_TARGET_NOT_FOUND'
    | 'DOCUMENT_HAS_NO_COMPLETED_EMBEDDINGS'
  message: string
  details?: Record<string, unknown>
}

export interface KnowledgeRetrievalErrorDto {
  code:
    | 'INVALID_REQUEST'
    | 'INVALID_RERANK_CONFIG'
    | 'KNOWLEDGE_BASE_LOAD_FAILED'
    | 'UPSTREAM_HTTP_ERROR'
    | 'UPSTREAM_RESPONSE_INVALID'
    | 'NETWORK_ERROR'
    | 'ABORTED'
    | 'NO_CONTENT_RETRIEVED'
    | 'UNKNOWN_ERROR'
  message: string
  retriable: boolean
  details?: Record<string, unknown>
}export interface KnowledgeRetrievalResolveScopesRequest {
  knowledgeBaseId?: number
  knowledgeBaseIds?: number[]
  selectedKnowledgeBaseIds?: number[]
  selectedDocumentFileKeysByKnowledgeBase?: Record<number, string[]>
  permissionTree?: unknown
}export interface KnowledgeRetrievalResolveScopesResultDto {
  /**
   * 兼容字段：保留主知识库 id（取 knowledgeBaseIds[0]）。
   */
  knowledgeBaseId: number | null
  /**
   * 新字段：本次参与解析的知识库列表（去重后）。
   */
  knowledgeBaseIds: number[]
  resolvedScopes: KnowledgeRetrievalResolvedScopeDto[]
  warnings: KnowledgeRetrievalWarningDto[]
}

export interface KnowledgeRetrievalSearchRequest {
  knowledgeBaseId?: number
  knowledgeBaseIds?: number[]
  selectedKnowledgeBaseIds?: number[]
  selectedDocumentFileKeysByKnowledgeBase?: Record<number, string[]>
  query: string
  permissionTree?: unknown
  k?: number
  ef?: number
  rerank?: {
    modelId?: string | null
    topN?: number | null
  }
  abortSignal?: AbortSignal
}export interface KnowledgeRetrievalHitDto {
  id: string
  content: string
  chunkIndex?: number
  fileKey: string
  fileName: string
  distance?: number
  rerankScore?: number
  scope: KnowledgeRetrievalResolvedScopeDto
}

export interface KnowledgeRetrievalScopeResultDto {
  scope: KnowledgeRetrievalResolvedScopeDto
  hits: KnowledgeRetrievalHitDto[]
  error?: KnowledgeRetrievalErrorDto
}

export interface KnowledgeRetrievalSearchResultDto {
  query: string
  knowledgeBaseId: number | null
  knowledgeBaseIds: number[]
  k: number
  ef?: number
  rerankModelId?: string
  rerankTopN?: number
  resolvedScopes: KnowledgeRetrievalResolvedScopeDto[]
  scopeResults: KnowledgeRetrievalScopeResultDto[]
  hits: KnowledgeRetrievalHitDto[]
  warnings: KnowledgeRetrievalWarningDto[]
  errors: KnowledgeRetrievalErrorDto[]
}
