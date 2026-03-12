import type Database from 'better-sqlite3'
import type { WebContents } from 'electron'
import { randomUUID } from 'crypto'
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
import { abortGenerationStream, startGenerationStream } from './llm-client'
import type { ActiveGenerationStream } from './types/stream.types'

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
    const vendor = this.resolveSdkVendorFromProtocol(provider.protocol)
    const requestId = randomUUID()
    const assistantMessageId = randomUUID()

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

    startGenerationStream({
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
      apiKey: provider.apiKey,
      baseUrl: provider.baseUrl || undefined,
      messages: [{ role: 'user', content: text }]
    })

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

  private resolveSdkVendorFromProtocol(protocol: ModelProviderProtocol) {
    if (protocol === 'claude') return 'anthropic'
    if (protocol === 'gemini') return 'google'
    return 'openai'
  }
}
