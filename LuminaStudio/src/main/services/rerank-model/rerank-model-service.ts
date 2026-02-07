/**
 * RerankModel Service
 *
 * 负责从 KnowledgeDatabase REST API 获取可用的重排模型列表
 */

import { logger } from '../logger'
import type { RerankModelInfo } from '@preload/types'

const log = logger.scope('RerankModelService')

/**
 * 外部 API 服务配置
 */
export interface RerankModelServiceConfig {
  /** API 服务基础 URL */
  baseUrl: string
  /** 请求超时时间 (ms) */
  timeout?: number
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: RerankModelServiceConfig = {
  baseUrl: 'http://127.0.0.1:3721',
  timeout: 10000
}

/**
 * 外部 API 响应格式
 */
interface ExternalApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

/**
 * RerankModelService
 *
 * 封装对 KnowledgeDatabase API 的 /api/v1/rerank-models 调用
 */
export class RerankModelService {
  private config: RerankModelServiceConfig

  constructor(config?: Partial<RerankModelServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    log.info('Initialized with config', { baseUrl: this.config.baseUrl })
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<RerankModelServiceConfig>): void {
    this.config = { ...this.config, ...config }
    log.info('Config updated', { baseUrl: this.config.baseUrl })
  }

  /**
   * 获取可用的重排模型列表
   */
  async listRerankModels(): Promise<RerankModelInfo[]> {
    log.debug('Fetching rerank models')

    const response = await this.fetch<RerankModelInfo[]>('/api/v1/rerank-models')

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to fetch rerank models')
    }

    const models = response.data || []
    log.info('Rerank models fetched', { count: models.length })
    return models
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
