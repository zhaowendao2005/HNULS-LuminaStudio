import type Database from 'better-sqlite3'
import { logger } from '../logger'
import type { DatabaseManager } from '../database-sqlite'
import type { ModelProviderRow, ModelConfigRow, AppSettingRow } from './types'
import type { ModelProviderProtocol } from '@preload/types'

const log = logger.scope('ModelConfigService')

export interface RemoteModelInfo {
  id: string
  object: string
  created: number
  owned_by: string
}

export interface RemoteModelGroups {
  [groupName: string]: RemoteModelInfo[]
}

export interface PersistedModelConfig {
  id: string
  displayName: string
  group?: string
}

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

export interface ModelConfig {
  version: number
  updatedAt: string
  activeProviderId?: string | null
  providers: PersistedModelProviderConfig[]
}

const DEFAULT_MODEL_CONFIG: ModelConfig = {
  version: 2,
  updatedAt: new Date(0).toISOString(),
  activeProviderId: null,
  providers: []
}

export class ModelConfigService {
  private db: Database.Database

  constructor(databaseManager: DatabaseManager) {
    this.db = databaseManager.getDatabase('BaseConfig')
  }

  async getConfig(): Promise<ModelConfig> {
    try {
      const providerRows = this.db
        .prepare('SELECT * FROM model_providers ORDER BY sort_order, id')
        .all() as ModelProviderRow[]

      if (providerRows.length === 0) {
        log.debug('No providers found, returning default config')
        return DEFAULT_MODEL_CONFIG
      }

      const providers: PersistedModelProviderConfig[] = []

      for (const row of providerRows) {
        const modelRows = this.db
          .prepare('SELECT * FROM model_configs WHERE provider_id = ? ORDER BY sort_order, id')
          .all(row.id) as ModelConfigRow[]

        const models: PersistedModelConfig[] = modelRows.map((modelRow) => ({
          id: modelRow.id,
          displayName: modelRow.display_name,
          group: modelRow.group_name || undefined
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

      const activeRow = this.db
        .prepare("SELECT value FROM app_settings WHERE key = 'activeProviderId'")
        .get() as AppSettingRow | undefined

      return {
        version: 2,
        updatedAt: new Date().toISOString(),
        activeProviderId: activeRow?.value || null,
        providers
      }
    } catch (error) {
      log.error('Failed to get config', error)
      throw error
    }
  }

  async updateConfig(patch: Partial<ModelConfig>): Promise<ModelConfig> {
    try {
      const transaction = this.db.transaction(() => {
        if (patch.providers) {
          this.assertNoDuplicateModelsWithinProvider(patch.providers)

          this.db.prepare('DELETE FROM model_providers').run()

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
        }

        if (patch.activeProviderId !== undefined) {
          this.db
            .prepare(
              `INSERT OR REPLACE INTO app_settings (key, value) VALUES ('activeProviderId', ?)`
            )
            .run(patch.activeProviderId || '')
        }
      })

      transaction()
      return await this.getConfig()
    } catch (error) {
      log.error('Failed to update config', error)
      throw error
    }
  }

  async syncModels(providerId: string): Promise<RemoteModelGroups> {
    try {
      const providerRow = this.db
        .prepare('SELECT * FROM model_providers WHERE id = ?')
        .get(providerId) as ModelProviderRow | undefined

      if (!providerRow) {
        throw new Error(`Provider not found: ${providerId}`)
      }

      if (!providerRow.base_url || !providerRow.api_key) {
        throw new Error('Provider baseUrl or apiKey is missing')
      }

      const normalizedBaseUrl = providerRow.base_url.trim().replace(/\/$/, '')
      const modelsUrl = normalizedBaseUrl.endsWith('/v1')
        ? `${normalizedBaseUrl}/models`
        : `${normalizedBaseUrl}/v1/models`

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
      const models: RemoteModelInfo[] = data.data || []
      return this.groupModels(models)
    } catch (error) {
      log.error('Failed to sync models', error)
      throw error
    }
  }

  private groupModels(models: RemoteModelInfo[]): RemoteModelGroups {
    const groups: RemoteModelGroups = {}

    for (const model of models) {
      const groupName = this.inferGroupFromModelId(model.id)
      if (!groups[groupName]) {
        groups[groupName] = []
      }
      groups[groupName].push(model)
    }

    const sortedGroups: RemoteModelGroups = {}
    Object.keys(groups)
      .sort()
      .forEach((key) => {
        sortedGroups[key] = groups[key]
      })

    return sortedGroups
  }

  private inferGroupFromModelId(modelId: string): string {
    const DEFAULT = 'default'

    if (!modelId) return DEFAULT

    const slashIndex = modelId.indexOf('/')
    if (slashIndex > 0) {
      return modelId.slice(0, slashIndex)
    }

    const normalized = modelId.replace(/^\[[^\]]+\]/, '')
    const parts = normalized.split('-')
    if (parts.length >= 3 && parts[0] && parts[1]) {
      return `${parts[0]}-${parts[1]}`
    }

    return DEFAULT
  }

  private assertNoDuplicateModelsWithinProvider(providers: PersistedModelProviderConfig[]): void {
    for (const provider of providers) {
      const seenModelIds = new Set<string>()
      for (const model of provider.models) {
        if (seenModelIds.has(model.id)) {
          throw new Error(
            `Duplicate model id "${model.id}" found in provider "${provider.id}". Model ids must be unique within a provider.`
          )
        }
        seenModelIds.add(model.id)
      }
    }
  }
}
