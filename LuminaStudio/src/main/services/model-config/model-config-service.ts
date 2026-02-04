import type Database from 'better-sqlite3'
import { logger } from '../logger'
import type { DatabaseManager } from '../database-sqlite'
import type { ModelProviderRow, ModelConfigRow, AppSettingRow } from './types'

const log = logger.scope('ModelConfigService')

/**
 * 从远程 API 获取的模型信息（OpenAI /models 响应格式）
 */
export interface RemoteModelInfo {
  id: string
  object: string
  created: number
  owned_by: string
}

/**
 * 按分组组织的远程模型列表
 */
export interface RemoteModelGroups {
  [groupName: string]: RemoteModelInfo[]
}

/**
 * 单个模型配置
 */
export interface PersistedModelConfig {
  id: string
  displayName: string
  group?: string
}

/**
 * 模型提供商协议类型
 */
export type ModelProviderProtocol = 'openai'

/**
 * 单个模型提供商配置
 */
export interface PersistedModelProviderConfig {
  id: string
  name: string
  protocol: ModelProviderProtocol
  enabled: boolean
  baseUrl: string
  apiKey: string
  defaultHeaders?: Record<string, string>
  models: PersistedModelConfig[]
}

/**
 * 整体模型配置结构
 */
export interface ModelConfig {
  version: number
  updatedAt: string
  activeProviderId?: string | null
  providers: PersistedModelProviderConfig[]
}

/**
 * 默认配置
 */
const DEFAULT_MODEL_CONFIG: ModelConfig = {
  version: 1,
  updatedAt: new Date(0).toISOString(),
  activeProviderId: null,
  providers: []
}

/**
 * ModelConfigService
 *
 * 负责模型配置的业务逻辑：
 * - 从 SQLite 读取/写入配置
 * - 从远程 API 同步模型列表
 * - 自动推断模型分组
 */
export class ModelConfigService {
  private db: Database.Database

  constructor(databaseManager: DatabaseManager) {
    this.db = databaseManager.getDatabase('BaseConfig')
  }

  /**
   * 获取当前模型配置
   */
  async getConfig(): Promise<ModelConfig> {
    try {
      // 1. 读取所有 providers
      const providerRows = this.db
        .prepare('SELECT * FROM model_providers ORDER BY sort_order, id')
        .all() as ModelProviderRow[]

      if (providerRows.length === 0) {
        log.debug('No providers found, returning default config')
        return DEFAULT_MODEL_CONFIG
      }

      // 2. 为每个 provider 读取其 models
      const providers: PersistedModelProviderConfig[] = []

      for (const row of providerRows) {
        const modelRows = this.db
          .prepare('SELECT * FROM model_configs WHERE provider_id = ? ORDER BY sort_order, id')
          .all(row.id) as ModelConfigRow[]

        const models: PersistedModelConfig[] = modelRows.map((m) => ({
          id: m.id,
          displayName: m.display_name,
          group: m.group_name || undefined
        }))

        providers.push({
          id: row.id,
          name: row.name,
          protocol: row.protocol as ModelProviderProtocol,
          enabled: row.enabled === 1,
          baseUrl: row.base_url,
          apiKey: row.api_key,
          defaultHeaders: row.default_headers ? JSON.parse(row.default_headers) : undefined,
          models
        })
      }

      // 3. 读取 activeProviderId
      const activeRow = this.db
        .prepare("SELECT value FROM app_settings WHERE key = 'activeProviderId'")
        .get() as AppSettingRow | undefined

      const config: ModelConfig = {
        version: 1,
        updatedAt: new Date().toISOString(),
        activeProviderId: activeRow?.value || null,
        providers
      }

      log.debug('Config loaded', { providerCount: providers.length })
      return config
    } catch (error) {
      log.error('Failed to get config', error)
      throw error
    }
  }

  /**
   * 更新模型配置
   */
  async updateConfig(patch: Partial<ModelConfig>): Promise<ModelConfig> {
    try {
      log.debug('Updating config', { patch })

      // 使用事务确保原子性
      const transaction = this.db.transaction(() => {
        // 1. 更新 providers（如果提供）
        if (patch.providers) {
          // 删除所有旧数据（CASCADE 会自动删除相关的 model_configs）
          this.db.prepare('DELETE FROM model_providers').run()

          // 插入新 providers 和 models
          const insertProvider = this.db.prepare(`
            INSERT INTO model_providers (id, name, protocol, enabled, base_url, api_key, default_headers, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)

          const insertModel = this.db.prepare(`
            INSERT INTO model_configs (id, provider_id, display_name, group_name, sort_order)
            VALUES (?, ?, ?, ?, ?)
          `)

          patch.providers.forEach((provider, providerIndex) => {
            insertProvider.run(
              provider.id,
              provider.name,
              provider.protocol,
              provider.enabled ? 1 : 0,
              provider.baseUrl,
              provider.apiKey,
              provider.defaultHeaders ? JSON.stringify(provider.defaultHeaders) : null,
              providerIndex
            )

            provider.models.forEach((model, modelIndex) => {
              insertModel.run(
                model.id,
                provider.id,
                model.displayName,
                model.group || null,
                modelIndex
              )
            })
          })

          log.debug('Providers updated', { count: patch.providers.length })
        }

        // 2. 更新 activeProviderId（如果提供）
        if (patch.activeProviderId !== undefined) {
          this.db
            .prepare(
              `INSERT OR REPLACE INTO app_settings (key, value) VALUES ('activeProviderId', ?)`
            )
            .run(patch.activeProviderId || '')

          log.debug('Active provider updated', { id: patch.activeProviderId })
        }
      })

      transaction()

      // 返回更新后的完整配置
      return await this.getConfig()
    } catch (error) {
      log.error('Failed to update config', error)
      throw error
    }
  }

  /**
   * 从指定提供商的 API 同步模型列表
   */
  async syncModels(providerId: string): Promise<RemoteModelGroups> {
    try {
      log.debug('Syncing models from provider', { providerId })

      // 1. 获取 provider 信息
      const providerRow = this.db
        .prepare('SELECT * FROM model_providers WHERE id = ?')
        .get(providerId) as ModelProviderRow | undefined

      if (!providerRow) {
        throw new Error(`Provider not found: ${providerId}`)
      }

      if (!providerRow.base_url || !providerRow.api_key) {
        throw new Error('Provider baseUrl or apiKey is missing')
      }

      // 2. 构建完整的 API URL
      const baseUrl = providerRow.base_url.trim().replace(/\/$/, '')
      const modelsUrl = `${baseUrl}/v1/models`

      log.debug('Fetching models from API', { url: modelsUrl })

      // 3. 发送请求
      const response = await fetch(modelsUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${providerRow.api_key}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Failed to fetch models: ${response.status} ${response.statusText}. ${errorText}`
        )
      }

      const data = await response.json()

      // 4. OpenAI API 返回格式: { data: [{ id, object, created, owned_by }, ...] }
      const models: RemoteModelInfo[] = data.data || []

      log.info('Models synced successfully', { count: models.length })

      // 5. 按分组组织模型
      return this.groupModels(models)
    } catch (error) {
      log.error('Failed to sync models', error)
      throw error
    }
  }

  /**
   * 根据模型 ID 推断分组并组织模型列表
   */
  private groupModels(models: RemoteModelInfo[]): RemoteModelGroups {
    const groups: RemoteModelGroups = {}

    for (const model of models) {
      const groupName = this.inferGroupFromModelId(model.id)
      if (!groups[groupName]) {
        groups[groupName] = []
      }
      groups[groupName].push(model)
    }

    // 按组名排序
    const sortedGroups: RemoteModelGroups = {}
    Object.keys(groups)
      .sort()
      .forEach((key) => {
        sortedGroups[key] = groups[key]
      })

    return sortedGroups
  }

  /**
   * 从模型 ID 推断分组名称
   * 规则：
   * 1. 有 "/"："/" 前面就是组名
   * 2. 无 "/"：去掉类似 "[aws]" 前缀后再做 "-" 规则，取第二个 "-" 前的部分
   * 3. 都不符合就放进默认组
   */
  private inferGroupFromModelId(modelId: string): string {
    const DEFAULT = 'default'

    if (!modelId) return DEFAULT

    // 1) 有 "/"："/" 前面就是组名
    const slashIndex = modelId.indexOf('/')
    if (slashIndex > 0) {
      return modelId.slice(0, slashIndex)
    }

    // 2) 无 "/"：去掉类似 "[aws]" 前缀后再做 "-" 规则
    const normalized = modelId.replace(/^\[[^\]]+\]/, '') // 删除最前面的 [xxx]

    // 3) 正则/分段：取 "第二个 '-' 前的部分"，也就是前两段拼起来
    //    gemini-3-pro => ["gemini","3","pro"] => "gemini-3"
    const parts = normalized.split('-')
    if (parts.length >= 3 && parts[0] && parts[1]) {
      return `${parts[0]}-${parts[1]}`
    }

    // 4) 其他都进默认组
    return DEFAULT
  }
}
