import type { DocumentEmbeddingItem, RetrievalHit } from '@shared/knowledge-database-api.types'

export type KnowledgeRetrievalPermissionEffect = 'allow' | 'deny' | 'inherit'

export interface KnowledgeRetrievalEmbeddingRule {
  embeddingConfigId: string
  dimensions: number
  effect?: KnowledgeRetrievalPermissionEffect
}

export interface KnowledgeRetrievalDocumentRule {
  fileKey: string
  effect?: KnowledgeRetrievalPermissionEffect
  embeddings?: KnowledgeRetrievalEmbeddingRule[]
}

export interface KnowledgeRetrievalKnowledgeBaseRule {
  knowledgeBaseId?: number | null
  knowledge_base_id?: number | null
  effect?: KnowledgeRetrievalPermissionEffect
  documents?: KnowledgeRetrievalDocumentRule[]
}

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

export interface KnowledgeRetrievalPermissionTree {
  effect?: KnowledgeRetrievalPermissionEffect
  documents?: KnowledgeRetrievalDocumentRule[]
  knowledgeBaseIds?: number[]
  knowledgeBaseId?: number | null
  knowledgeBases?: KnowledgeRetrievalKnowledgeBaseRule[]
  knowledge_base_rules?: KnowledgeRetrievalKnowledgeBaseRule[]
  providers?: KnowledgeRetrievalLegacyPermissionTreeNode[]
}

export interface KnowledgeRetrievalResolvedScopeDto {
  knowledgeBaseId: number
  fileKey: string
  fileName: string
  embeddingConfigId: string
  dimensions: number
  tableName: string
  chunkCount: number
}

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
    | 'UNKNOWN_ERROR'
  message: string
  retriable: boolean
  details?: Record<string, unknown>
}

export interface KnowledgeRetrievalResolveScopesRequest {
  knowledgeBaseId?: number
  knowledgeBaseIds?: number[]
  selectedKnowledgeBaseIds?: number[]
  selectedDocumentFileKeysByKnowledgeBase?: Record<number, string[]>
  permissionTree?: unknown
}

export interface KnowledgeRetrievalResolveScopesResultDto {
  knowledgeBaseId: number | null
  knowledgeBaseIds: number[]
  resolvedScopes: KnowledgeRetrievalResolvedScopeDto[]
  warnings: KnowledgeRetrievalWarningDto[]
}

export interface KnowledgeRetrievalSearchRequest {
  knowledgeBaseId: number
  tableName: string
  queryText: string
  fileKey?: string
  fileKeys?: string[]
  k?: number
  ef?: number
  rerankModelId?: string
  rerankTopN?: number
  abortSignal?: AbortSignal
}

export type KnowledgeRetrievalHitDto = RetrievalHit

export interface KnowledgeRetrievalSearchResultDto {
  hits: RetrievalHit[]
}
