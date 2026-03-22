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

// ============================
// 知识图谱（KG）检索
// ============================

/** KG 图谱表信息 */
export interface KGGraphTableInfo {
  graphTableBase: string
  entityCount: number
  relationCount: number
}

/** KG 图谱表响应 */
export interface KGGraphTablesResponse {
  targetNamespace: string
  targetDatabase: string
  graphs: KGGraphTableInfo[]
}

/** KG 模型信息 */
export interface KGModelInfo {
  id: string
  name?: string
}

/** KG 检索模式 */
export type KGRetrievalMode = 'local' | 'global' | 'hybrid' | 'naive'

/**
 * KG 检索请求（Lumina 前端 → Main 进程）。
 *
 * 与 KnowledgeDatabase 内部 KGRetrievalParams 不同：
 * - 用 knowledgeBaseId 代替 targetNamespace/targetDatabase（Main 侧自动解析）
 * - embeddingConfig 只传 providerId/modelId（Main 侧补全 credentials）
 * - rerank 只传 providerId/modelId（Main 侧补全 credentials）
 */
export interface KGRetrievalSearchRequest {
  /** 用户查询文本 */
  query: string
  /** 检索模式 */
  mode: KGRetrievalMode
  /** 知识库 ID（Main 侧用于解析 targetNamespace/targetDatabase） */
  knowledgeBaseId: number
  /** 图谱表基名，如 'kg_emb_cfg_xxx_3072' */
  graphTableBase: string

  // ========== Embedding 配置（Main 侧补全 apiKey/baseUrl） ==========
  /** 嵌入 Provider ID */
  embeddingProviderId: string
  /** 嵌入 Model ID */
  embeddingModelId: string
  /** 嵌入向量维度 */
  embeddingDimensions: number

  // ========== 关键词提取配置（可选） ==========
  keywordExtraction?: {
    /** false = 跳过 LLM，使用手动关键词 */
    useLLM: boolean
    /** LLM 提供者（useLLM=true 时必填） */
    llmProviderId?: string
    llmModelId?: string
    /** 手动关键词（useLLM=false 时使用） */
    manualHighLevelKeywords?: string[]
    manualLowLevelKeywords?: string[]
  }

  // ========== 向量搜索参数（可选） ==========
  vectorSearch?: {
    entityTopK?: number
    relationTopK?: number
    chunkTopK?: number
    ef?: number
  }

  // ========== 图遍历参数（可选） ==========
  graphTraversal?: {
    maxDepth?: number
    maxNeighbors?: number
  }

  // ========== Chunk 向量表（naive 模式必填） ==========
  chunkTableName?: string

  // ========== 重排配置（可选，Main 侧补全 credentials） ==========
  rerank?: {
    enabled: boolean
    providerId?: string
    modelId?: string
    topN?: number
  }

  // ========== Token 预算（可选） ==========
  tokenBudget?: {
    maxEntityDescTokens?: number
    maxRelationDescTokens?: number
    maxChunkTokens?: number
    maxTotalTokens?: number
  }
}

/** KG 检索实体 */
export interface KGRetrievalEntity {
  id: string
  name: string
  entity_type: string
  description: string
  score: number
}

/** KG 检索关系 */
export interface KGRetrievalRelation {
  id: string
  source_name: string
  target_name: string
  description: string
  keywords: string
  score: number
}

/** KG 检索 Chunk */
export interface KGRetrievalChunk {
  id: string
  content: string
  file_key: string
  file_name?: string
  chunk_index?: number
  score: number
  source: 'entity_expansion' | 'relation_expansion' | 'direct_vector'
}

/** KG 检索元数据 */
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

/** KG 检索结果 */
export interface KGRetrievalSearchResult {
  entities: KGRetrievalEntity[]
  relations: KGRetrievalRelation[]
  chunks: KGRetrievalChunk[]
  meta: KGRetrievalMeta
}
