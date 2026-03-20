import { logger } from '../logger'
import type { RerankModelInfo } from '@preload/types'

const log = logger.scope('OrchestraflowRerankModelService')

/**
 * OrchestraFlow 专用重排模型服务配置。
 *
 * 说明：
 * - 该服务与 NormalChat 的 rerank-model 服务解耦，避免跨业务域强耦合。
 * - 仅负责给 OrchestraFlow 编辑器提供“可用重排模型列表”。
 */
export interface OrchestraflowRerankModelServiceConfig {
  /** KnowledgeDatabase API 基础 URL */
  baseUrl: string
  /** 请求超时时间 (ms) */
  timeout?: number
}

const DEFAULT_CONFIG: OrchestraflowRerankModelServiceConfig = {
  baseUrl: 'http://127.0.0.1:3721',
  timeout: 10000
}

interface ExternalApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

export class OrchestraflowRerankModelService {
  private config: OrchestraflowRerankModelServiceConfig

  constructor(config?: Partial<OrchestraflowRerankModelServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    log.info('Initialized with config', { baseUrl: this.config.baseUrl })
  }

  /**
   * 拉取可用重排模型列表。
   */
  async listRerankModels(): Promise<RerankModelInfo[]> {
    const response = await this.fetch<RerankModelInfo[]>('/api/v1/rerank-models')
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to fetch orchestraflow rerank models')
    }

    const models = response.data || []
    log.info('Fetched orchestraflow rerank models', { count: models.length })
    return models
  }

  private async fetch<T>(path: string, options?: RequestInit): Promise<ExternalApiResponse<T>> {
    const url = `${this.config.baseUrl}${path}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
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
        return {
          success: false,
          error: {
            code: 'TIMEOUT',
            message: 'Request timed out'
          }
        }
      }

      const message = error instanceof Error ? error.message : 'Unknown error'
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

