import type Database from 'better-sqlite3'
import type { WebContents } from 'electron'
import { randomUUID } from 'crypto'
import { logger } from '../logger'
import type { DatabaseManager } from '../database-sqlite'
import type { ModelConfigService, PersistedModelProviderConfig } from '../model-config'
import type {
  GenerationChannelKey,
  GenerationCreateSessionRequest,
  GenerationListMessagesRequest,
  GenerationSaveDocumentRequest,
  GenerationSaveStageConfigRequest,
  GenerationSessionSummary,
  GenerationUpdateSessionStateRequest,
  ModelProviderProtocol
} from '@preload/types'
import { GenerationEditorRepository } from './repositories/generation-editor.repository'
import {
  abortGenerationStream,
  startAnalysisPlannerAgentStream,
  startGenerationStream
} from './llm-client'
import type { ActiveGenerationStream } from './types/stream.types'

const log = logger.scope('OrchestflowGenerationEditorService')
const OPENAI_OFFICIAL_BASE_URL = 'https://api.openai.com/v1'

export class OrchestflowGenerationEditorService {
  private readonly db: Database.Database
  private readonly repository: GenerationEditorRepository
  private readonly activeStreams = new Map<string, ActiveGenerationStream>()

  constructor(
    databaseManager: DatabaseManager,
    private readonly modelConfigService: ModelConfigService
  ) {
    this.db = databaseManager.getDatabase('orchestflow-generation-editor')
    this.repository = new GenerationEditorRepository(this.db)
  }

  async listSessions(): Promise<GenerationSessionSummary[]> {
    return this.repository.listSessions()
  }

  async createSession(request: GenerationCreateSessionRequest) {
    const sessionId = this.repository.createSession(request)
    return this.repository.getSessionDetail(sessionId)
  }

  async deleteSession(sessionId: string): Promise<void> {
    // 删除会话前先中断该会话上的所有活动流，避免后续 stream event 再写回已删除消息。
    for (const [requestId, stream] of this.activeStreams.entries()) {
      if (stream.sessionId !== sessionId) {
        continue
      }
      abortGenerationStream(this.activeStreams, requestId)
    }

    this.repository.deleteSession(sessionId)
  }

  async getSessionDetail(sessionId: string) {
    return this.repository.getSessionDetail(sessionId)
  }

  async updateSessionState(request: GenerationUpdateSessionStateRequest) {
    return this.repository.updateSessionState(request)
  }

  async saveStageConfig(request: GenerationSaveStageConfigRequest) {
    return this.repository.saveStageConfig(request)
  }

  async saveDocument(request: GenerationSaveDocumentRequest) {
    return this.repository.saveDocument(request)
  }

  async listMessages(request: GenerationListMessagesRequest) {
    return this.repository.listMessages(request)
  }

  async sendMessage(
    sender: WebContents,
    request: {
      sessionId: string
      channelKey: GenerationChannelKey
      providerId: string
      modelId: string
      content: string
    }
  ): Promise<{ requestId: string }> {
    const text = request.content.trim()
    if (!text) throw new Error('Message content is required')

    const provider = await this.resolveProvider(request.providerId)
    this.assertProviderProtocolCompatible(provider)
    const vendor = this.resolveSdkVendorFromProtocol(provider.protocol)
    const requestId = randomUUID()
    const assistantMessageId = randomUUID()

    log.info('Dispatching generation request', {
      requestId,
      sessionId: request.sessionId,
      channelKey: request.channelKey,
      providerId: request.providerId,
      providerName: provider.name,
      protocol: provider.protocol,
      sdkVendor: vendor,
      baseUrl: provider.baseUrl,
      modelId: request.modelId,
      contentPreview: buildContentPreview(text)
    })

    this.repository.insertMessage({
      id: randomUUID(),
      session_id: request.sessionId,
      channel_key: request.channelKey,
      request_id: requestId,
      role: 'user',
      content: text,
      status: 'final',
      provider_id: request.providerId,
      model_id: request.modelId,
      error: null,
      usage_json: null,
      meta_json: null
    })

    this.repository.insertMessage({
      id: assistantMessageId,
      session_id: request.sessionId,
      channel_key: request.channelKey,
      request_id: requestId,
      role: 'assistant',
      content: '',
      status: 'streaming',
      provider_id: request.providerId,
      model_id: request.modelId,
      error: null,
      usage_json: null,
      meta_json: JSON.stringify({ vendor, protocol: provider.protocol })
    })

    if (request.channelKey === 'analysis-discussion') {
      const sessionDetail = this.repository.getSessionDetail(request.sessionId)
      const analysisStageConfig = sessionDetail.stageConfigs.find(
        (item) => item.stageKey === 'analysis'
      )

      startAnalysisPlannerAgentStream({
        activeStreams: this.activeStreams,
        repository: this.repository,
        sender,
        requestId,
        sessionId: request.sessionId,
        channelKey: request.channelKey,
        messageId: assistantMessageId,
        providerId: request.providerId,
        modelId: request.modelId,
        vendor,
        protocol: provider.protocol,
        apiKey: provider.apiKey,
        baseUrl: provider.baseUrl || undefined,
        defaultHeaders: provider.defaultHeaders,
        memoryRounds: analysisStageConfig?.memoryRounds || 6,
        userMessage: text
      })
    } else {
      startGenerationStream({
        activeStreams: this.activeStreams,
        repository: this.repository,
        sender,
        requestId,
        sessionId: request.sessionId,
        channelKey: request.channelKey,
        messageId: assistantMessageId,
        providerId: request.providerId,
        providerName: provider.name,
        modelId: request.modelId,
        vendor,
        protocol: provider.protocol,
        apiKey: provider.apiKey,
        baseUrl: provider.baseUrl || undefined,
        defaultHeaders: provider.defaultHeaders,
        messages: [{ role: 'user', content: text }],
        requestContent: text
      })
    }

    return { requestId }
  }

  async abortMessage(requestId: string): Promise<void> {
    abortGenerationStream(this.activeStreams, requestId)
  }

  private async resolveProvider(providerId: string): Promise<PersistedModelProviderConfig> {
    const config = await this.modelConfigService.getConfig()
    const provider = config.providers.find((item) => item.id === providerId)
    if (!provider) throw new Error(`Provider not found: ${providerId}`)
    if (!provider.apiKey) throw new Error(`Provider apiKey missing: ${providerId}`)
    return provider
  }

  private assertProviderProtocolCompatible(provider: PersistedModelProviderConfig): void {
    if (provider.protocol !== 'openai') {
      return
    }

    const normalizedBaseUrl = normalizeBaseUrl(provider.baseUrl)
    if (normalizedBaseUrl !== OPENAI_OFFICIAL_BASE_URL) {
      throw new Error(
        `Provider "${provider.name}" is configured as protocol=openai but baseUrl is not OpenAI official. Please switch protocol to openai-completion or openai-response, or set baseUrl to ${OPENAI_OFFICIAL_BASE_URL}.`
      )
    }
  }

  private resolveSdkVendorFromProtocol(protocol: ModelProviderProtocol) {
    if (protocol === 'claude') return 'anthropic'
    if (protocol === 'gemini') return 'google'
    return 'openai'
  }
}

function buildContentPreview(content: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 200) {
    return normalized
  }
  return `${normalized.slice(0, 200)}...`
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/$/, '')
}
