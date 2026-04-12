/**
 * KnowledgeDatabase Bridge Service
 *
 * 负责与外部 KnowledgeDatabase REST API 服务通信。
 *
 * 重写原则：
 * - 这里是“纯 REST client”，不再掺入检索规划或 scope 语义。
 * - 所有路径、字段、错误语义都尽量对齐知识库服务端真实契约。
 */

import { logger } from '../logger'
import type {
  DocumentEmbeddingInfo,
  ExternalApiResponse,
  KGKnowledgeBaseInfo,
  KnowledgeBaseDetail,
  KnowledgeBaseInfo,
  KnowledgeDatabaseStatusData,
  ListDocumentsData,
  KGGraphTableInfo,
  KGGraphTablesResponse,
  KGModelInfo,
  KGModelsListResponse,
  KGRetrievalSearchRequest,
  KGRetrievalSearchResult
} from '@shared/knowledge-database-api.types'

const log = logger.scope('KnowledgeDatabaseBridgeService')

/**
 * 外部 API 服务配置
 */
export interface KnowledgeDatabaseServiceConfig {
  /** API 服务基础 URL */
  baseUrl: string
  /** 请求超时时间 (ms) */
  timeout?: number
}

interface KnowledgeDatabaseRequestResult<T> {
  status: number | null
  payload: ExternalApiResponse<T> | null
}

interface RetrievalHit {
  id: string
  content: string
  chunk_index?: number
  file_key?: string
  file_name?: string
  distance?: number
  rerank_score?: number
}

interface RetrievalSearchParams {
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

function normalizeKnowledgeBasesResponse(data: unknown): KnowledgeBaseInfo[] {
  if (!Array.isArray(data)) {
    return []
  }

  return data.filter((item): item is KnowledgeBaseInfo => {
    if (!item || typeof item !== 'object') {
      return false
    }

    const kb = item as Partial<KnowledgeBaseInfo>
    return typeof kb.id === 'number' && typeof kb.name === 'string'
  })
}

function normalizeKGKnowledgeBasesResponse(data: unknown): KGKnowledgeBaseInfo[] {
  if (!Array.isArray(data)) {
    return []
  }

  return data.filter((item): item is KGKnowledgeBaseInfo => {
    if (!item || typeof item !== 'object') {
      return false
    }

    const kb = item as Partial<KGKnowledgeBaseInfo>
    return typeof kb.id === 'number' && typeof kb.name === 'string'
  })
}

function normalizeKGGraphTablesResponse(data: unknown): KGGraphTablesResponse {
  if (!Array.isArray(data)) {
    return []
  }

  return data
    .filter((item): item is KGGraphTableInfo => {
      if (!item || typeof item !== 'object') {
        return false
      }

      const graph = item as Partial<KGGraphTableInfo>
      return typeof graph.graphTableBase === 'string' && graph.graphTableBase.trim().length > 0
    })
    .map((item) => ({
      graphTableBase: item.graphTableBase.trim(),
      displayName:
        typeof item.displayName === 'string' && item.displayName.trim()
          ? item.displayName.trim()
          : undefined,
      entityCount: typeof item.entityCount === 'number' ? item.entityCount : 0,
      relationCount: typeof item.relationCount === 'number' ? item.relationCount : 0
    }))
}

function normalizeKGModelInfo(item: unknown): KGModelInfo | null {
  if (!item || typeof item !== 'object') {
    return null
  }

  const model = item as Record<string, unknown>
  const id =
    typeof model.id === 'string' && model.id.trim()
      ? model.id.trim()
      : typeof model.modelId === 'string' && model.modelId.trim()
        ? model.modelId.trim()
        : typeof model.model_id === 'string' && model.model_id.trim()
          ? model.model_id.trim()
          : ''

  const providerId =
    typeof model.providerId === 'string' && model.providerId.trim()
      ? model.providerId.trim()
      : typeof model.provider_id === 'string' && model.provider_id.trim()
        ? model.provider_id.trim()
        : ''

  const providerName =
    typeof model.providerName === 'string' && model.providerName.trim()
      ? model.providerName.trim()
      : typeof model.provider_name === 'string' && model.provider_name.trim()
        ? model.provider_name.trim()
        : providerId

  const displayName =
    typeof model.displayName === 'string' && model.displayName.trim()
      ? model.displayName.trim()
      : typeof model.name === 'string' && model.name.trim()
        ? model.name.trim()
        : typeof model.modelName === 'string' && model.modelName.trim()
          ? model.modelName.trim()
          : id

  if (!id || !providerId || !providerName) {
    return null
  }

  return {
    id,
    displayName,
    providerId,
    providerName,
    group: typeof model.group === 'string' && model.group.trim() ? model.group.trim() : undefined,
    protocol:
      typeof model.protocol === 'string' && model.protocol.trim()
        ? model.protocol.trim()
        : undefined,
    dimensions: typeof model.dimensions === 'number' ? model.dimensions : undefined,
    maxTokens: typeof model.maxTokens === 'number' ? model.maxTokens : undefined
  }
}

function normalizeKGModelsListResponse(data: unknown): KGModelsListResponse {
  if (!Array.isArray(data)) {
    return []
  }

  return data.map(normalizeKGModelInfo).filter((item): item is KGModelInfo => item !== null)
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: KnowledgeDatabaseServiceConfig = {
  baseUrl: 'http://127.0.0.1:3721',
  timeout: 10000
}

/**
 * KnowledgeDatabaseBridgeService
 *
 * 只处理外部 KnowledgeDatabase REST API 的请求和响应归一化。
 */
export class KnowledgeDatabaseBridgeService {
  private config: KnowledgeDatabaseServiceConfig

  constructor(config?: Partial<KnowledgeDatabaseServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    log.info('Initialized with config', { baseUrl: this.config.baseUrl })
  }

  /**
   * 暴露当前 baseUrl，供上层日志或诊断复用。
   */
  getBaseUrl(): string {
    return this.config.baseUrl
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<KnowledgeDatabaseServiceConfig>): void {
    this.config = { ...this.config, ...config }
    log.info('Config updated', { baseUrl: this.config.baseUrl })
  }

  /**
   * 检查与外部服务的连接状态
   */
  async checkConnection(): Promise<{
    connected: boolean
    baseUrl: string
    error?: { code: string; message: string; details?: unknown }
  }> {
    const response = await this.request<KnowledgeDatabaseStatusData>('/api/v1/status')

    if (response.payload?.success && response.payload.data?.status === 'ok') {
      log.debug('Connection check passed')
      return {
        connected: true,
        baseUrl: this.config.baseUrl
      }
    }

    return {
      connected: false,
      baseUrl: this.config.baseUrl,
      error: response.payload?.success
        ? {
            code: 'UNEXPECTED_RESPONSE',
            message: 'Unexpected response from server'
          }
        : {
            code: response.payload?.error.code || 'CONNECTION_FAILED',
            message: response.payload?.error.message || 'Failed to connect',
            details: response.payload?.error.details
          }
    }
  }

  /**
   * 获取所有知识库列表
   */
  async listKnowledgeBases(): Promise<KnowledgeBaseInfo[]> {
    log.debug('Fetching knowledge bases')
    const data = await this.requestOrThrow<KnowledgeBaseInfo[]>(
      '/api/v1/knowledge-bases',
      'Failed to fetch knowledge bases'
    )
    const knowledgeBases = normalizeKnowledgeBasesResponse(data)
    log.info('Knowledge bases fetched', { count: knowledgeBases.length })
    return knowledgeBases
  }

  async listKGKnowledgeBases(): Promise<KGKnowledgeBaseInfo[]> {
    log.debug('Fetching KG knowledge bases')
    const data = await this.requestOrThrow<KGKnowledgeBaseInfo[]>(
      '/api/v1/kg/knowledge-bases',
      'Failed to list KG knowledge bases'
    )
    const knowledgeBases = normalizeKGKnowledgeBasesResponse(data)
    log.info('KG knowledge bases fetched', { count: knowledgeBases.length })
    return knowledgeBases
  }

  /**
   * 获取知识库详情。
   * 当前主链路暂未使用，但作为底层 REST client 保留完整能力。
   */
  async getKnowledgeBaseDetail(knowledgeBaseId: number): Promise<KnowledgeBaseDetail> {
    log.debug('Fetching knowledge base detail', { knowledgeBaseId })
    return await this.requestOrThrow<KnowledgeBaseDetail>(
      `/api/v1/knowledge-bases/${knowledgeBaseId}`,
      'Failed to fetch knowledge base detail'
    )
  }

  /**
   * 获取指定知识库下的文档列表
   */
  async listDocuments(params: {
    knowledgeBaseId: number
    page?: number
    pageSize?: number
  }): Promise<ListDocumentsData> {
    const { knowledgeBaseId, page = 1, pageSize = 50 } = params
    log.debug('Fetching documents', { knowledgeBaseId, page, pageSize })

    const queryParams = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize)
    })

    const data = await this.requestOrThrow<ListDocumentsData>(
      `/api/v1/knowledge-bases/${knowledgeBaseId}/documents?${queryParams.toString()}`,
      'Failed to fetch documents'
    )

    log.info('Documents fetched', {
      knowledgeBaseId,
      count: data.documents.length,
      total: data.pagination.total
    })

    return data
  }

  /**
   * 获取某个文档的嵌入状态列表。
   * 这是服务端现成能力，后续如果面板需要更细粒度状态，可以直接复用。
   */
  async listDocumentEmbeddings(params: {
    knowledgeBaseId: number
    fileKey: string
  }): Promise<DocumentEmbeddingInfo[]> {
    const { knowledgeBaseId, fileKey } = params
    log.debug('Fetching document embeddings', { knowledgeBaseId, fileKey })

    return await this.requestOrThrow<DocumentEmbeddingInfo[]>(
      `/api/v1/knowledge-bases/${knowledgeBaseId}/documents/${encodeURIComponent(fileKey)}/embeddings`,
      'Failed to fetch document embeddings'
    )
  }

  /**
   * 拉取整个知识库下的全部文档。
   *
   * 说明：权限展开需要完整文档列表，因此这里统一收口分页循环。
   */
  async listAllDocuments(params: {
    knowledgeBaseId: number
    pageSize?: number
  }): Promise<ListDocumentsData['documents']> {
    const { knowledgeBaseId, pageSize = 100 } = params
    const documents: ListDocumentsData['documents'] = []
    let page = 1
    let totalPages = 1

    while (page <= totalPages) {
      const response = await this.listDocuments({ knowledgeBaseId, page, pageSize })
      documents.push(...response.documents)
      totalPages = Math.max(1, response.pagination.totalPages)
      page += 1
    }

    log.info('All documents fetched', {
      knowledgeBaseId,
      count: documents.length
    })

    return documents
  }

  /**
   * 调用 `/api/v1/retrieval/search`。
   *
   * 这里故意返回原始 `success/error` 结构，不在 bridge 层擅自改写
   * “空召回是不是错误” 的语义，交由上层检索服务决定。
   */
  async retrievalSearch(
    params: RetrievalSearchParams
  ): Promise<ExternalApiResponse<RetrievalHit[]>> {
    const response = await this.request<RetrievalHit[]>('/api/v1/retrieval/search', {
      method: 'POST',
      body: JSON.stringify(params)
    })

    if (response.payload) {
      log.debug('Retrieval search completed', {
        knowledgeBaseId: params.knowledgeBaseId,
        tableName: params.tableName,
        fileKey: params.fileKey || null,
        fileKeys: params.fileKeys || null,
        status: response.status,
        success: response.payload.success,
        resultCount:
          response.payload.success && Array.isArray(response.payload.data)
            ? response.payload.data.length
            : 0
      })
      return response.payload
    }

    return {
      success: false,
      error: {
        code: 'INVALID_RESPONSE',
        message: '知识检索接口返回了无效响应',
        details: {
          path: '/api/v1/retrieval/search',
          status: response.status
        }
      }
    }
  }

  // ==========================================================================
  // 知识图谱（KG）检索 API
  // ==========================================================================

  /**
   * 获取知识库的 KG 配置。
   */
  async getKGConfigs(knowledgeBaseId: number): Promise<{ knowledgeGraph: unknown }> {
    log.debug('Fetching KG configs', { knowledgeBaseId })
    return await this.requestOrThrow<{ knowledgeGraph: unknown }>(
      `/api/v1/kg/knowledge-bases/${knowledgeBaseId}/configs`,
      'Failed to fetch KG configs'
    )
  }

  /**
   * 获取知识库的图谱表信息（含实体/关系计数）。
   */
  async getKGGraphTables(knowledgeBaseId: number): Promise<KGGraphTablesResponse> {
    log.debug('Fetching KG graph tables', { knowledgeBaseId })
    const data = await this.requestOrThrow<KGGraphTablesResponse>(
      `/api/v1/kg/knowledge-bases/${knowledgeBaseId}/graph-tables`,
      'Failed to fetch KG graph tables'
    )
    return normalizeKGGraphTablesResponse(data)
  }

  /**
   * 获取可用的 KG 模型列表。
   */
  async listKGModels(): Promise<KGModelsListResponse> {
    log.debug('Fetching KG models')
    const data = await this.requestOrThrow<KGModelsListResponse>(
      '/api/v1/kg/models',
      'Failed to list KG models'
    )
    return normalizeKGModelsListResponse(data)
  }

  /**
   * 执行知识图谱检索。
   *
   * 这里不再自己拼接 embedding/model 相关字段，直接把 Lumina 侧传来的
   * 检索请求转发给知识库系统。真正的 embedding / rerank 解析由知识库系统处理。
   */
  async kgRetrievalSearch(
    params: KGRetrievalSearchRequest
  ): Promise<ExternalApiResponse<KGRetrievalSearchResult>> {
    const response = await this.request<KGRetrievalSearchResult>('/api/v1/kg/retrieval', {
      method: 'POST',
      body: JSON.stringify(params)
    })

    if (response.payload) {
      log.debug('KG retrieval search completed', {
        mode: params.mode,
        graphTableBase: params.graphTableBase,
        status: response.status,
        success: response.payload.success
      })
      return response.payload
    }

    return {
      success: false,
      error: {
        code: 'INVALID_RESPONSE',
        message: 'KG 检索接口返回了无效响应',
        details: {
          path: '/api/v1/kg/retrieval',
          status: response.status
        }
      }
    }
  }

  /**
   * 通用 HTTP 请求方法
   */
  private async request<T>(
    path: string,
    options?: RequestInit
  ): Promise<KnowledgeDatabaseRequestResult<T>> {
    const url = `${this.config.baseUrl.replace(/\/$/, '')}${path}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      log.debug('HTTP Request', { method: options?.method || 'GET', url })

      const response = await globalThis.fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        }
      })

      clearTimeout(timeoutId)

      const rawText = await response.text()
      const payload = this.parseExternalApiResponse<T>(rawText)

      if (payload) {
        return {
          status: response.status,
          payload
        }
      }

      if (!response.ok) {
        log.warn('HTTP Error With Invalid Payload', { status: response.status, url })
        return {
          status: response.status,
          payload: {
            success: false,
            error: {
              code: `HTTP_${response.status}`,
              message: response.statusText || 'HTTP request failed',
              details: rawText || undefined
            }
          }
        }
      }

      log.warn('HTTP Response Invalid', { status: response.status, url })
      return {
        status: response.status,
        payload: null
      }
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        log.warn('Request timeout', { url })
        return {
          status: null,
          payload: {
            success: false,
            error: {
              code: 'TIMEOUT',
              message: 'Request timed out'
            }
          }
        }
      }

      const message = error instanceof Error ? error.message : 'Unknown error'
      log.error('Request failed', { url, error: message })
      return {
        status: null,
        payload: {
          success: false,
          error: {
            code: 'NETWORK_ERROR',
            message
          }
        }
      }
    }
  }

  /**
   * 请求成功且返回 `success: true` 时直接取 data，否则抛出 Error。
   */
  private async requestOrThrow<T>(path: string, fallbackMessage: string): Promise<T> {
    const response = await this.request<T>(path)

    if (!response.payload) {
      throw new Error(fallbackMessage)
    }

    if (!response.payload.success) {
      throw new Error(response.payload.error.message || fallbackMessage)
    }

    return response.payload.data
  }

  /**
   * 把服务端返回的 JSON 文本解析成标准 `ExternalApiResponse<T>`。
   */
  private parseExternalApiResponse<T>(rawText: string): ExternalApiResponse<T> | null {
    if (!rawText.trim()) {
      return null
    }

    try {
      const parsed = JSON.parse(rawText) as unknown
      if (!parsed || typeof parsed !== 'object') {
        return null
      }

      const candidate = parsed as Partial<ExternalApiResponse<T>>
      if (candidate.success === true && 'data' in candidate) {
        return candidate as ExternalApiResponse<T>
      }

      if (
        candidate.success === false &&
        candidate.error &&
        typeof candidate.error === 'object' &&
        'code' in candidate.error &&
        'message' in candidate.error
      ) {
        return candidate as ExternalApiResponse<T>
      }

      return null
    } catch {
      return null
    }
  }
}
