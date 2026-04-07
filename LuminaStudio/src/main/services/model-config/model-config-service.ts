import type Database from 'better-sqlite3'
import type {
  ModelProviderProtocol,
  PersistedModelProviderConfig,
  SmokeTestPromptConfig,
  SmokeTestPromptSettings,
  SmokeTestResult
} from '@preload/types'
import { NormalChatRealModelAdapter } from '../normal-chat/runtime/llm/real-model-adapter'
import type { DatabaseManager } from '../database-sqlite'
import { logger } from '../logger'
import type { AppSettingRow, ModelConfigRow, ModelProviderRow } from './types'

const log = logger.scope('ModelConfigService')
const DEFAULT_SMOKE_TEST_PROMPT = 'say "pong"'
const DEFAULT_SMOKE_TEST_PROMPT_NAME = '默认测试提示词'
const SMOKE_TEST_TIMEOUT_MS = 15_000
const SMOKE_TEST_PROMPT_SETTINGS_KEY = 'modelConfig.smokeTestPromptSettings'
const PROVIDER_EXTRA_SETTINGS_KEY = 'modelConfig.providerExtraSettings'

interface ProviderExtraSettingsEntry {
  officialWebsite: string
}

interface ProviderExtraSettings {
  version: number
  providers: Record<string, ProviderExtraSettingsEntry>
}

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

function nowIso(): string {
  return new Date().toISOString()
}

function deriveOfficialWebsiteFromBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim()
  if (!trimmed) return ''

  try {
    const url = new URL(trimmed)
    return url.origin
  } catch {
    return ''
  }
}

function createDefaultSmokeTestPromptConfig(): SmokeTestPromptConfig {
  const now = nowIso()
  return {
    id: 'default-smoke-test-prompt',
    name: DEFAULT_SMOKE_TEST_PROMPT_NAME,
    prompt: DEFAULT_SMOKE_TEST_PROMPT,
    createdAt: now,
    updatedAt: now
  }
}

function createDefaultSmokeTestPromptSettings(): SmokeTestPromptSettings {
  const defaultConfig = createDefaultSmokeTestPromptConfig()
  return {
    version: 1,
    activeConfigId: defaultConfig.id,
    configs: [defaultConfig]
  }
}

function createDefaultProviderExtraSettings(): ProviderExtraSettings {
  return {
    version: 1,
    providers: {}
  }
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

      const providerExtraSettings = this.getProviderExtraSettings()
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

        const officialWebsite =
          providerExtraSettings.providers[row.id]?.officialWebsite ||
          deriveOfficialWebsiteFromBaseUrl(row.base_url)

        providers.push({
          id: row.id,
          name: row.name,
          protocol: row.protocol as ModelProviderProtocol,
          enabled: row.enabled === 1,
          baseUrl: row.base_url,
          apiKey: row.api_key,
          officialWebsite,
          defaultHeaders: row.default_headers ? JSON.parse(row.default_headers) : undefined,
          models
        })
      }

      const activeRow = this.db
        .prepare("SELECT value FROM app_settings WHERE key = 'activeProviderId'")
        .get() as AppSettingRow | undefined

      return {
        version: 2,
        updatedAt: nowIso(),
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

          this.saveProviderExtraSettings(
            this.buildProviderExtraSettingsFromProviders(patch.providers)
          )
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

  async getSmokeTestPromptSettings(): Promise<SmokeTestPromptSettings> {
    try {
      const row = this.db
        .prepare('SELECT value FROM app_settings WHERE key = ?')
        .get(SMOKE_TEST_PROMPT_SETTINGS_KEY) as AppSettingRow | undefined

      if (!row?.value) {
        return createDefaultSmokeTestPromptSettings()
      }

      const parsed = JSON.parse(row.value) as Partial<SmokeTestPromptSettings>
      return this.normalizeSmokeTestPromptSettings(parsed)
    } catch (error) {
      log.error('Failed to get smoke test prompt settings', error)
      return createDefaultSmokeTestPromptSettings()
    }
  }

  async updateSmokeTestPromptSettings(
    patch: SmokeTestPromptSettings
  ): Promise<SmokeTestPromptSettings> {
    try {
      const normalized = this.normalizeSmokeTestPromptSettings(patch)
      this.db
        .prepare(
          "INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))"
        )
        .run(SMOKE_TEST_PROMPT_SETTINGS_KEY, JSON.stringify(normalized, null, 2))
      return normalized
    } catch (error) {
      log.error('Failed to update smoke test prompt settings', error)
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

  async testProviderModel(
    providerId: string,
    modelId: string,
    prompt?: string
  ): Promise<SmokeTestResult> {
    const startedAt = Date.now()
    const adapter = new NormalChatRealModelAdapter(this)
    const testPrompt = prompt?.trim() || DEFAULT_SMOKE_TEST_PROMPT

    try {
      await this.withTimeout(
        adapter.smokeTest(providerId, modelId, testPrompt),
        SMOKE_TEST_TIMEOUT_MS
      )

      return {
        providerId,
        modelId,
        status: 'success',
        latency: Date.now() - startedAt
      }
    } catch (error) {
      const normalized = this.normalizeSmokeTestError(error)
      log.warn('Smoke test failed', {
        providerId,
        modelId,
        ...normalized,
        rawError: error instanceof Error ? error.message : String(error)
      })
      return {
        providerId,
        modelId,
        status: 'error',
        latency: Date.now() - startedAt,
        ...normalized
      }
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
      })
    ])
  }

  private getProviderExtraSettings(): ProviderExtraSettings {
    try {
      const row = this.db
        .prepare('SELECT value FROM app_settings WHERE key = ?')
        .get(PROVIDER_EXTRA_SETTINGS_KEY) as AppSettingRow | undefined

      if (!row?.value) {
        return createDefaultProviderExtraSettings()
      }

      const parsed = JSON.parse(row.value) as Partial<ProviderExtraSettings>
      return this.normalizeProviderExtraSettings(parsed)
    } catch (error) {
      log.error('Failed to get provider extra settings', error)
      return createDefaultProviderExtraSettings()
    }
  }

  private saveProviderExtraSettings(settings: ProviderExtraSettings): void {
    this.db
      .prepare(
        "INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))"
      )
      .run(PROVIDER_EXTRA_SETTINGS_KEY, JSON.stringify(settings, null, 2))
  }

  private buildProviderExtraSettingsFromProviders(
    providers: PersistedModelProviderConfig[]
  ): ProviderExtraSettings {
    const nextSettings = createDefaultProviderExtraSettings()
    providers.forEach((provider) => {
      nextSettings.providers[provider.id] = {
        officialWebsite:
          provider.officialWebsite.trim() || deriveOfficialWebsiteFromBaseUrl(provider.baseUrl)
      }
    })
    return nextSettings
  }

  private normalizeProviderExtraSettings(
    settings: Partial<ProviderExtraSettings> | null | undefined
  ): ProviderExtraSettings {
    const next = createDefaultProviderExtraSettings()
    const providerEntries = settings?.providers
    if (!providerEntries || typeof providerEntries !== 'object') {
      return next
    }

    Object.entries(providerEntries).forEach(([providerId, entry]) => {
      if (!providerId.trim()) return
      const typedEntry = entry as Partial<ProviderExtraSettingsEntry> | null | undefined
      next.providers[providerId] = {
        officialWebsite:
          typeof typedEntry?.officialWebsite === 'string' ? typedEntry.officialWebsite.trim() : ''
      }
    })

    return next
  }

  private normalizeSmokeTestPromptSettings(
    settings: Partial<SmokeTestPromptSettings> | null | undefined
  ): SmokeTestPromptSettings {
    const defaultSettings = createDefaultSmokeTestPromptSettings()
    const configs = Array.isArray(settings?.configs)
      ? settings.configs
          .map((item) => this.normalizeSmokeTestPromptConfig(item))
          .filter((item): item is SmokeTestPromptConfig => item !== null)
      : []

    const safeConfigs = configs.length > 0 ? configs : defaultSettings.configs
    const activeConfigId =
      typeof settings?.activeConfigId === 'string' &&
      safeConfigs.some((item) => item.id === settings.activeConfigId)
        ? settings.activeConfigId
        : safeConfigs[0].id

    return {
      version: 1,
      activeConfigId,
      configs: safeConfigs
    }
  }

  private normalizeSmokeTestPromptConfig(
    config: Partial<SmokeTestPromptConfig> | null | undefined
  ): SmokeTestPromptConfig | null {
    if (!config || typeof config.id !== 'string' || !config.id.trim()) {
      return null
    }

    const now = nowIso()
    return {
      id: config.id.trim(),
      name:
        typeof config.name === 'string' && config.name.trim()
          ? config.name.trim()
          : DEFAULT_SMOKE_TEST_PROMPT_NAME,
      prompt:
        typeof config.prompt === 'string' && config.prompt.trim()
          ? config.prompt
          : DEFAULT_SMOKE_TEST_PROMPT,
      createdAt:
        typeof config.createdAt === 'string' && config.createdAt.trim() ? config.createdAt : now,
      updatedAt:
        typeof config.updatedAt === 'string' && config.updatedAt.trim() ? config.updatedAt : now
    }
  }

  private normalizeSmokeTestError(
    error: unknown
  ): Pick<SmokeTestResult, 'message' | 'errorCode' | 'errorType'> {
    const rawMessage = error instanceof Error ? error.message : String(error)
    const message = rawMessage.trim() || 'Unknown Error'
    const lowerMessage = message.toLowerCase()
    const statusCodeMatch = message.match(/\b(400|401|403|404|408|409|422|429|500|502|503|504)\b/)

    let errorType = 'Unknown Error'
    if (lowerMessage.includes('timeout')) {
      errorType = 'Timeout'
    } else if (
      lowerMessage.includes('invalid api key') ||
      lowerMessage.includes('incorrect api key')
    ) {
      errorType = 'Invalid API Key'
    } else if (lowerMessage.includes('unauthorized') || statusCodeMatch?.[1] === '401') {
      errorType = 'Unauthorized'
    } else if (lowerMessage.includes('forbidden') || statusCodeMatch?.[1] === '403') {
      errorType = 'Forbidden'
    } else if (
      lowerMessage.includes('rate limit') ||
      lowerMessage.includes('too many requests') ||
      statusCodeMatch?.[1] === '429'
    ) {
      errorType = 'Rate Limit'
    } else if (
      lowerMessage.includes('model not found') ||
      lowerMessage.includes('unknown model') ||
      statusCodeMatch?.[1] === '404'
    ) {
      errorType = 'Model Not Found'
    } else if (
      lowerMessage.includes('bad request') ||
      statusCodeMatch?.[1] === '400' ||
      statusCodeMatch?.[1] === '422'
    ) {
      errorType = 'Bad Request'
    } else if (
      lowerMessage.includes('network') ||
      lowerMessage.includes('fetch failed') ||
      lowerMessage.includes('econnrefused') ||
      lowerMessage.includes('enotfound') ||
      lowerMessage.includes('socket hang up')
    ) {
      errorType = 'Connection Error'
    }

    return {
      message,
      errorCode: statusCodeMatch?.[1],
      errorType
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
