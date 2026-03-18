import { logger } from '../logger'
import type {
  PaperRetrievalProviderDescriptor,
  PaperRetrievalSearchRequest,
  PaperRetrievalSearchResult
} from '../../../preload/types/paper-retrieval.types'
import {
  getPaperRetrievalProvider,
  getPaperRetrievalProviderDescriptors
} from './providers/registry'
import type {
  ApiKeyRegistryEntryLike,
  PaperRetrievalUserSettingsResolver,
  ResolvedPaperRetrievalApiKey
} from './providers/types'
import {
  PaperRetrievalProviderNotFoundError,
  PaperRetrievalValidationError
} from './providers/types'

const log = logger.scope('PaperRetrievalService')

/**
 * Paper Retrieval 主进程服务。
 *
 * 职责：
 * - 暴露 provider descriptor 查询能力
 * - 根据 provider_id 选择具体 provider
 * - 从用户设置 registry 解析 api_key_ref_id
 */
export class PaperRetrievalService {
  constructor(private readonly userSettingsResolver: PaperRetrievalUserSettingsResolver) {}

  async listProviders(): Promise<PaperRetrievalProviderDescriptor[]> {
    return getPaperRetrievalProviderDescriptors()
  }

  async getProviderDescriptor(providerId: string): Promise<PaperRetrievalProviderDescriptor> {
    const provider = getPaperRetrievalProvider(providerId)
    if (!provider) {
      throw new PaperRetrievalProviderNotFoundError(
        `未知的 paper retrieval provider: ${providerId}`
      )
    }

    return provider.descriptor
  }

  async search(request: PaperRetrievalSearchRequest): Promise<PaperRetrievalSearchResult> {
    this.assertValidRequestShape(request)

    const provider = getPaperRetrievalProvider(request.provider_id)
    if (!provider) {
      throw new PaperRetrievalProviderNotFoundError(
        `未知的 paper retrieval provider: ${request.provider_id}`
      )
    }

    const resolvedApiKey = await this.resolveApiKey(request.api_key_ref_id)
    const normalizedRequest = provider.normalizeRequest(request)
    const result = await provider.search(normalizedRequest, {
      apiKey: resolvedApiKey
    })

    log.info('Paper retrieval search completed', {
      providerId: request.provider_id,
      apiKeyRefId: request.api_key_ref_id,
      resultCount: result.items.length,
      totalFound: result.total_found
    })

    return {
      ...result,
      meta: {
        ...result.meta,
        resolved_api_key_ref_id: resolvedApiKey.refId,
        api_key_resolved: Boolean(resolvedApiKey.value)
      }
    }
  }

  private assertValidRequestShape(request: PaperRetrievalSearchRequest): void {
    if (!request || typeof request !== 'object') {
      throw new PaperRetrievalValidationError('检索请求不能为空')
    }

    if (typeof request.provider_id !== 'string' || !request.provider_id.trim()) {
      throw new PaperRetrievalValidationError('provider_id 不能为空')
    }

    if (request.api_key_ref_id !== null && request.api_key_ref_id !== undefined) {
      if (typeof request.api_key_ref_id !== 'string' || !request.api_key_ref_id.trim()) {
        throw new PaperRetrievalValidationError('api_key_ref_id 必须是字符串或 null')
      }
    }

    if (!request.provider_options || typeof request.provider_options !== 'object') {
      throw new PaperRetrievalValidationError('provider_options 必须是对象')
    }
  }

  private async resolveApiKey(apiKeyRefId: string | null): Promise<ResolvedPaperRetrievalApiKey> {
    if (!apiKeyRefId) {
      return {
        refId: null,
        value: null
      }
    }

    const settings = await this.userSettingsResolver.getSettings()
    const resolved = this.extractApiKeyFromSettingsRegistry(settings, apiKeyRefId)
    if (!resolved) {
      throw new PaperRetrievalValidationError(`未找到 api_key_ref_id 对应的密钥：${apiKeyRefId}`)
    }

    return {
      refId: apiKeyRefId,
      value: resolved
    }
  }

  /**
   * 尽量兼容未来 user-settings registry 的多种可能形状。
   *
   * 之所以写成宽松解析，是因为本轮不能越界修改 user-settings 域，
   * 但这里仍然优先以 registry + refId 的方式解析。
   */
  private extractApiKeyFromSettingsRegistry(settings: unknown, apiKeyRefId: string): string | null {
    if (!settings || typeof settings !== 'object') {
      return null
    }

    const settingsRecord = settings as Record<string, unknown>

    const registryCandidates: unknown[] = [
      settingsRecord.apiKeys,
      settingsRecord.apiKeyRegistry,
      settingsRecord.api_key_registry,
      settingsRecord.credentialsRegistry,
      settingsRecord.credentials_registry,
      settingsRecord.registry
    ]

    for (const registryCandidate of registryCandidates) {
      const resolved = this.extractApiKeyFromRegistryCandidate(registryCandidate, apiKeyRefId)
      if (resolved) {
        return resolved
      }
    }

    return null
  }

  private extractApiKeyFromRegistryCandidate(
    registryCandidate: unknown,
    apiKeyRefId: string
  ): string | null {
    if (!registryCandidate) {
      return null
    }

    if (Array.isArray(registryCandidate)) {
      return this.extractApiKeyFromEntries(registryCandidate, apiKeyRefId)
    }

    if (typeof registryCandidate !== 'object') {
      return null
    }

    const record = registryCandidate as Record<string, unknown>

    const nestedArrayCandidates: unknown[] = [
      record.entries,
      record.items,
      record.records,
      record.list
    ]
    for (const nestedCandidate of nestedArrayCandidates) {
      if (Array.isArray(nestedCandidate)) {
        const resolved = this.extractApiKeyFromEntries(nestedCandidate, apiKeyRefId)
        if (resolved) {
          return resolved
        }
      }
    }

    const directEntry = record[apiKeyRefId]
    if (typeof directEntry === 'string' && directEntry.trim()) {
      return directEntry.trim()
    }

    if (directEntry && typeof directEntry === 'object') {
      return this.extractSecretValue(directEntry as ApiKeyRegistryEntryLike)
    }

    return null
  }

  private extractApiKeyFromEntries(entries: unknown[], apiKeyRefId: string): string | null {
    for (const entry of entries) {
      if (!entry || typeof entry !== 'object') {
        continue
      }

      const entryRecord = entry as ApiKeyRegistryEntryLike
      const candidateIds = [entryRecord.id, entryRecord.key, entryRecord.refId]
      const matched = candidateIds.some(
        (candidateId) => typeof candidateId === 'string' && candidateId === apiKeyRefId
      )

      if (!matched) {
        continue
      }

      const resolved = this.extractSecretValue(entryRecord)
      if (resolved) {
        return resolved
      }
    }

    return null
  }

  private extractSecretValue(entry: ApiKeyRegistryEntryLike): string | null {
    const candidateValues = [entry.value, entry.apiKey, entry.secret, entry.token]
    for (const candidateValue of candidateValues) {
      if (typeof candidateValue === 'string' && candidateValue.trim()) {
        return candidateValue.trim()
      }
    }

    return null
  }
}
