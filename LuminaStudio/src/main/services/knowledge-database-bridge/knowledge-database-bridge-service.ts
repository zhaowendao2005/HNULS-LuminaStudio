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
  KnowledgeBaseDetail,
  KnowledgeBaseInfo,
  KnowledgeDatabaseStatusData,
  ListDocumentsData,
  RetrievalHit,
  RetrievalSearchParams,
  KGGraphTablesResponse,
  KGModelInfo,
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
    log.info('Knowledge bases fetched', { count: data.length })
    return data
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
    return await this.requestOrThrow<KGGraphTablesResponse>(
      `/api/v1/kg/knowledge-bases/${knowledgeBaseId}/graph-tables`,
      'Failed to fetch KG graph tables'
    )
  }

  /**
   * 获取可用的 KG 模型列表。
   */
  async listKGModels(): Promise<KGModelInfo[]> {
    log.debug('Fetching KG models')
    return await this.requestOrThrow<KGModelInfo[]>('/api/v1/kg/models', 'Failed to list KG models')
  }

  /**
   * 执行知识图谱检索。
   *
   * 注意：这里接收的是已经由 KGRetrievalService 补全了 credentials 的完整参数，
   * 直接转发到 KnowledgeDatabase 的 `/api/v1/kg/retrieval`。
   */
  async kgRetrievalSearch(
    params: Record<string, unknown>
  ): Promise<ExternalApiResponse<KGRetrievalSearchResult>> {
    const response = await this.request<KGRetrievalSearchResult>('/api/v1/kg/retrieval', {
      method: 'POST',
      body: JSON.stringify(params)
    })

    if (response.payload) {
      log.debug('KG retrieval search completed', {
        mode: params.mode,
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
