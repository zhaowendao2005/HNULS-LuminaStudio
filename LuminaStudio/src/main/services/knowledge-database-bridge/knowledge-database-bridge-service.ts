/**
 * KnowledgeDatabase Bridge Service
 *
 * 负责与外部 KnowledgeDatabase REST API 服务通信
 */

import { logger } from '../logger'
import type {
  KnowledgeBaseInfo,
  ExternalApiResponse,
  ListDocumentsData,
  DocumentInfo
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
 * 封装对外部 KnowledgeDatabase API 的 HTTP 调用
 */
export class KnowledgeDatabaseBridgeService {
  private config: KnowledgeDatabaseServiceConfig

  constructor(config?: Partial<KnowledgeDatabaseServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    log.info('Initialized with config', { baseUrl: this.config.baseUrl })
  }

  /**
   * 暴露当前 baseUrl，供上层服务复用统一配置。
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
    error?: { code: string; message: string }
  }> {
    try {
      const response = await this.fetch<{ status: string; version: string }>('/api/v1/status')

      if (response.success && response.data?.status === 'ok') {
        log.debug('Connection check passed')
        return {
          connected: true,
          baseUrl: this.config.baseUrl
        }
      }

      return {
        connected: false,
        baseUrl: this.config.baseUrl,
        error: {
          code: 'UNEXPECTED_RESPONSE',
          message: 'Unexpected response from server'
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      log.warn('Connection check failed', { error: message })

      return {
        connected: false,
        baseUrl: this.config.baseUrl,
        error: {
          code: 'CONNECTION_FAILED',
          message
        }
      }
    }
  }

  /**
   * 获取所有知识库列表
   */
  async listKnowledgeBases(): Promise<KnowledgeBaseInfo[]> {
    log.debug('Fetching knowledge bases')

    const response = await this.fetch<KnowledgeBaseInfo[]>('/api/v1/knowledge-bases')

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to fetch knowledge bases')
    }

    log.info('Knowledge bases fetched', { count: response.data?.length ?? 0 })
    return response.data || []
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

    const response = await this.fetch<ListDocumentsData>(
      `/api/v1/knowledge-bases/${knowledgeBaseId}/documents?${queryParams.toString()}`
    )

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to fetch documents')
    }

    log.info('Documents fetched', {
      knowledgeBaseId,
      count: response.data?.documents?.length ?? 0,
      total: response.data?.pagination?.total ?? 0
    })

    return (
      response.data || { documents: [], pagination: { total: 0, page: 1, pageSize, totalPages: 0 } }
    )
  }

  /**
   * 拉取整个知识库下的全部文档。
   *
   * 说明：知识检索权限展开需要完整文档树，
   * 因此这里通过分页循环拉全量数据，避免把分页逻辑散落到上层服务域。
   */
  async listAllDocuments(params: {
    knowledgeBaseId: number
    pageSize?: number
  }): Promise<DocumentInfo[]> {
    const { knowledgeBaseId, pageSize = 200 } = params
    const documents: DocumentInfo[] = []
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
   * 通用 HTTP 请求方法
   */
  private async fetch<T>(path: string, options?: RequestInit): Promise<ExternalApiResponse<T>> {
    const url = `${this.config.baseUrl}${path}`
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

      const data = await response.json()

      if (!response.ok) {
        log.warn('HTTP Error', { status: response.status, url })
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: data?.error?.message || response.statusText
          }
        }
      }

      return data as ExternalApiResponse<T>
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        log.warn('Request timeout', { url })
        return {
          success: false,
          error: {
            code: 'TIMEOUT',
            message: 'Request timed out'
          }
        }
      }

      const message = error instanceof Error ? error.message : 'Unknown error'
      log.error('Request failed', { url, error: message })

      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message
        }
      }
    }
  }
}
