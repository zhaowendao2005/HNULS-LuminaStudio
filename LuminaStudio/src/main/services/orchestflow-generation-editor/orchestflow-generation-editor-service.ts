import type Database from 'better-sqlite3'
import type { WebContents } from 'electron'
import { randomUUID } from 'crypto'
import { buildOFPlanningMarkdown, parseOFPlanningMarkdown } from '@shared/Orchestraflow-types'
import { logger } from '../logger'
import type { DatabaseManager } from '../database-sqlite'
import type { ModelConfigService, PersistedModelProviderConfig } from '../model-config'
import type {
  GenerationApplyPlanningCommandProposalRequest,
  GenerationChannelKey,
  GenerationCreatePlanningDocumentFromMessageRequest,
  GenerationCreateSessionRequest,
  GenerationGlobalSettings,
  GenerationListMessagesRequest,
  GenerationRejectPlanningCommandProposalRequest,
  GenerationSaveDocumentRequest,
  GenerationSavePlanningDocumentRequest,
  GenerationSaveStageConfigRequest,
  GenerationSelectPlanningDocumentRequest,
  GenerationSessionSummary,
  GenerationStageConfig,
  GenerationUpdateSessionStateRequest,
  ModelProviderProtocol
} from '@preload/types'
import { GenerationEditorRepository } from './repositories/generation-editor.repository'
import {
  abortGenerationStream,
  startAnalysisPlannerAgentStream,
  startCopilotEditorAgentStream,
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

  async savePlanningDocument(request: GenerationSavePlanningDocumentRequest) {
    const parseResult = parseOFPlanningMarkdown(request.document.content)
    if (parseResult.errors.length > 0) {
      throw new Error(parseResult.errors.map((error) => error.message).join('；'))
    }

    return this.repository.savePlanningDocument({
      ...request,
      document: {
        ...request.document,
        sections: parseResult.document.sections,
        content: buildOFPlanningMarkdown(parseResult.document)
      }
    })
  }

  async selectPlanningDocument(request: GenerationSelectPlanningDocumentRequest) {
    return this.repository.selectPlanningDocument(request)
  }

  async getOrCreatePlanningDocumentFromMessage(
    request: GenerationCreatePlanningDocumentFromMessageRequest
  ) {
    return this.repository.getOrCreatePlanningDocumentFromMessage(request)
  }

  async applyPlanningCommandProposal(request: GenerationApplyPlanningCommandProposalRequest) {
    return this.repository.applyPlanningCommandProposal(request)
  }

  async rejectPlanningCommandProposal(request: GenerationRejectPlanningCommandProposalRequest) {
    return this.repository.rejectPlanningCommandProposal(request)
  }

  async listMessages(request: GenerationListMessagesRequest) {
    return this.repository.listMessages(request)
  }

  async getGlobalSettings(): Promise<GenerationGlobalSettings> {
    return this.repository.getGlobalSettings()
  }

  async updateGlobalSettings(
    settings: Partial<GenerationGlobalSettings>
  ): Promise<GenerationGlobalSettings> {
    return this.repository.updateGlobalSettings(settings)
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
    const globalSettings = this.repository.getGlobalSettings()
    const effectiveProtocol = this.resolveEffectiveProtocol(provider)
    const vendor = this.resolveSdkVendorFromProtocol(effectiveProtocol)
    const requestId = randomUUID()
    const assistantMessageId = randomUUID()

    log.info('Dispatching generation request', {
      requestId,
      sessionId: request.sessionId,
      channelKey: request.channelKey,
      providerId: request.providerId,
      providerName: provider.name,
      protocol: effectiveProtocol,
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
      meta_json: null,
      raw_response_text: null,
      raw_trace_json: null
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
      meta_json: JSON.stringify({ vendor, protocol: effectiveProtocol }),
      raw_response_text: null,
      raw_trace_json: null
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
        protocol: effectiveProtocol,
        apiKey: provider.apiKey,
        baseUrl: provider.baseUrl || undefined,
        defaultHeaders: provider.defaultHeaders,
        persistRawLlmData: globalSettings.persistRawLlmData,
        memoryRounds: analysisStageConfig?.memoryRounds || 6,
        userMessage: text
      })
    } else if (request.channelKey === 'analysis-copilot') {
      const sessionDetail = this.repository.getSessionDetail(request.sessionId)
      const analysisStageConfig = sessionDetail.stageConfigs.find(
        (item) => item.stageKey === 'analysis'
      )

      if (!analysisStageConfig) {
        throw new Error('Analysis stage config missing')
      }

      const planningDocument = this.ensureActiveAnalysisPlanningDocument(request.sessionId)

      startCopilotEditorAgentStream({
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
        protocol: effectiveProtocol,
        apiKey: provider.apiKey,
        baseUrl: provider.baseUrl || undefined,
        defaultHeaders: provider.defaultHeaders,
        persistRawLlmData: globalSettings.persistRawLlmData,
        stageKey: 'analysis',
        stageConfig: analysisStageConfig as GenerationStageConfig,
        planningDocument,
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
        protocol: effectiveProtocol,
        apiKey: provider.apiKey,
        baseUrl: provider.baseUrl || undefined,
        defaultHeaders: provider.defaultHeaders,
        persistRawLlmData: globalSettings.persistRawLlmData,
        messages: [{ role: 'user', content: text }],
        requestContent: text
      })
    }

    return { requestId }
  }

  async abortMessage(requestId: string): Promise<void> {
    abortGenerationStream(this.activeStreams, requestId)
  }

  private ensureActiveAnalysisPlanningDocument(sessionId: string) {
    const detail = this.repository.getSessionDetail(sessionId)
    const analysisStageConfig = detail.stageConfigs.find((item) => item.stageKey === 'analysis')
    if (analysisStageConfig?.activePlanningDocumentId) {
      return this.repository.getPlanningDocumentById(analysisStageConfig.activePlanningDocumentId)
    }

    const latestPlanningMessage = [...detail.messages]
      .reverse()
      .find(
        (message) =>
          message.channelKey === 'analysis-discussion' && hasPlanningBlock(message.metaJson)
      )

    if (!latestPlanningMessage) {
      throw new Error('请先在需求分析与计划对话中生成一版规划，再使用 Copilot 调整。')
    }

    return this.repository.getOrCreatePlanningDocumentFromMessage({
      sessionId,
      messageId: latestPlanningMessage.id
    })
  }

  private async resolveProvider(providerId: string): Promise<PersistedModelProviderConfig> {
    const config = await this.modelConfigService.getConfig()
    const provider = config.providers.find((item) => item.id === providerId)
    if (!provider) throw new Error(`Provider not found: ${providerId}`)
    if (!provider.apiKey) throw new Error(`Provider apiKey missing: ${providerId}`)
    return provider
  }

  private resolveEffectiveProtocol(provider: PersistedModelProviderConfig): ModelProviderProtocol {
    if (provider.protocol !== 'openai') {
      return provider.protocol
    }

    const normalizedBaseUrl = normalizeBaseUrl(provider.baseUrl)
    if (!normalizedBaseUrl || normalizedBaseUrl === OPENAI_OFFICIAL_BASE_URL) {
      return 'openai'
    }

    log.warn('Auto-normalizing Generate provider protocol to openai-completion', {
      providerId: provider.id,
      providerName: provider.name,
      originalProtocol: provider.protocol,
      baseUrl: provider.baseUrl
    })

    return 'openai-completion'
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

function hasPlanningBlock(metaJson: string | null): boolean {
  if (!metaJson) {
    return false
  }

  try {
    const meta = JSON.parse(metaJson) as { planningBlock?: { kind?: string } }
    return meta.planningBlock?.kind === 'analysis-planning'
  } catch {
    return false
  }
}
