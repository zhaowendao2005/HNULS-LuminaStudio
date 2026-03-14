import type Database from 'better-sqlite3'
import type { WebContents } from 'electron'
import { randomUUID } from 'crypto'
import {
  buildOFPlanningMarkdown,
  compileOFBlueprintTextDsl,
  parseOFPlanningMarkdown,
  type OFBlueprintTextDiagnostic
} from '@shared/Orchestraflow-types'
import { logger } from '../logger'
import type { DatabaseManager } from '../database-sqlite'
import type { ModelConfigService, PersistedModelProviderConfig } from '../model-config'
import type {
  GenerationApplyPlanningCommandProposalRequest,
  GenerationCompileDesignDocumentToWorkflowRequest,
  GenerationCompileDesignDocumentToWorkflowResult,
  GenerationCreateDesignDocumentFromPlanningRequest,
  GenerationCreatePlanningDocumentFromMessageRequest,
  GenerationCreateSessionRequest,
  GenerationDeleteDesignDocumentRequest,
  GenerationGlobalSettings,
  GenerationListDesignDocumentsRequest,
  GenerationListMessagesRequest,
  GenerationSendMessageRequest,
  GenerationRejectPlanningCommandProposalRequest,
  GenerationSaveDesignDocumentRequest,
  GenerationSaveDocumentRequest,
  GenerationSavePlanningDocumentRequest,
  GenerationSelectDesignDocumentRequest,
  GenerationSaveStageConfigRequest,
  GenerationSelectPlanningDocumentRequest,
  GenerationSessionSummary,
  GenerationStageConfig,
  GenerationUpdateSessionStateRequest,
  ModelProviderProtocol,
  GenerationMessageMetaPayload
} from '@preload/types'
import { GenerationEditorRepository } from './repositories/generation-editor.repository'
import { orchestraflowWorkflowService } from '../orchestraflow/orchestraflow-workflow-service'
import {
  abortGenerationStream,
  startAnalysisPlannerAgentStream,
  startCopilotEditorAgentStream,
  startDesignBlueprintAgentStream,
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

  async createDesignDocumentFromPlanning(
    request: GenerationCreateDesignDocumentFromPlanningRequest
  ) {
    return this.repository.createDesignDocumentFromPlanning(request)
  }

  async listDesignDocuments(request: GenerationListDesignDocumentsRequest) {
    return this.repository.listDesignDocuments(request)
  }

  async saveDesignDocument(request: GenerationSaveDesignDocumentRequest) {
    const compileResult = compileOFBlueprintTextDsl(request.document.content)
    const nextStatus = compileResult.valid ? 'valid' : 'invalid'
    return this.repository.saveDesignDocument({
      ...request,
      document: {
        ...request.document,
        contentFormat: detectBlueprintContentFormat(request.document.content),
        status: nextStatus,
        diagnosticsJson: compileResult.diagnostics.length
          ? JSON.stringify(compileResult.diagnostics)
          : null,
        summary: buildDesignDocumentSummary(nextStatus, compileResult.diagnostics)
      }
    })
  }

  async compileDesignDocumentToWorkflow(
    request: GenerationCompileDesignDocumentToWorkflowRequest
  ): Promise<GenerationCompileDesignDocumentToWorkflowResult> {
    const designDocument = this.ensureActiveDesignDocument(
      request.sessionId,
      request.designDocumentId
    )
    if (!designDocument.content.trim()) {
      throw new Error('当前规划设计稿 DSL 为空，无法编译为工作流。')
    }

    const compileResult = compileOFBlueprintTextDsl(designDocument.content)
    if (!compileResult.valid || !compileResult.runnable) {
      throw new Error(buildBlueprintCompileFailureMessage(compileResult.diagnostics))
    }

    // 编译链路只消费 shared blueprint compiler 的真相源，不在这里重复拼装 workflow graph。
    const workflow = await orchestraflowWorkflowService.createFromWorkflow(compileResult.runnable)
    const savedDesignDocument = this.repository.saveDesignDocument({
      sessionId: request.sessionId,
      document: {
        ...designDocument,
        status: 'valid',
        summary: buildDesignDocumentSummary('valid', compileResult.diagnostics),
        diagnosticsJson: null,
        derivedTargetType: 'workflow',
        derivedTargetId: workflow.id,
        derivedStatus: 'compiled'
      }
    })

    return {
      designDocument: savedDesignDocument,
      workflowId: workflow.id
    }
  }

  async selectDesignDocument(request: GenerationSelectDesignDocumentRequest) {
    return this.repository.selectDesignDocument(request)
  }

  async deleteDesignDocument(request: GenerationDeleteDesignDocumentRequest) {
    return this.repository.deleteDesignDocument(request)
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
    request: GenerationSendMessageRequest
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

    const designDocument =
      request.channelKey === 'design-copilot'
        ? this.ensureActiveDesignDocument(request.sessionId, request.designDocumentId)
        : null

    this.repository.insertMessage({
      id: randomUUID(),
      session_id: request.sessionId,
      channel_key: request.channelKey,
      design_document_id: designDocument?.id || null,
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
      design_document_id: designDocument?.id || null,
      request_id: requestId,
      role: 'assistant',
      content: '',
      status: 'streaming',
      provider_id: request.providerId,
      model_id: request.modelId,
      error: null,
      usage_json: null,
      meta_json: JSON.stringify(
        request.channelKey === 'design-copilot' && designDocument
          ? buildInitialDesignBlueprintMessageMeta({
              vendor,
              protocol: effectiveProtocol,
              designDocumentId: designDocument.id,
              generationMode: designDocument.content.trim() ? 'regenerate' : 'generate'
            })
          : { vendor, protocol: effectiveProtocol }
      ),
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
    } else if (request.channelKey === 'design-copilot') {
      startDesignBlueprintAgentStream({
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
        stageConfig: this.repository.getStageConfig(request.sessionId, 'design'),
        designDocument: designDocument!,
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

  private ensureActiveDesignDocument(sessionId: string, designDocumentId?: string | null) {
    if (designDocumentId) {
      const designDocument = this.repository.getDesignDocumentById(designDocumentId)
      if (designDocument.sessionId !== sessionId) {
        throw new Error('当前 designDocumentId 不属于本会话。')
      }
      return designDocument
    }

    const stageConfig = this.repository.getStageConfig(sessionId, 'design')
    if (!stageConfig.activeDesignDocumentId) {
      throw new Error('请先选择一个规划设计稿版本，再使用 Design Copilot。')
    }

    return this.repository.getDesignDocumentById(stageConfig.activeDesignDocumentId)
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

function detectBlueprintContentFormat(_sourceText: string): 'of-blueprint-section-v1' {
  return 'of-blueprint-section-v1'
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

function buildDesignDocumentSummary(
  status: 'valid' | 'invalid',
  diagnostics: OFBlueprintTextDiagnostic[]
): string {
  if (status === 'valid') {
    return '规划设计稿 DSL 已通过解析与编译校验。'
  }
  if (diagnostics.length) {
    return `规划设计稿 DSL 存在 ${diagnostics.length} 条校验错误。`
  }
  return '规划设计稿 DSL 尚未通过校验。'
}

function buildBlueprintCompileFailureMessage(diagnostics: OFBlueprintTextDiagnostic[]): string {
  if (!diagnostics.length) {
    return '当前规划设计稿 DSL 未通过编译校验，无法生成工作流。'
  }

  const firstDiagnostic = diagnostics[0]
  return `当前规划设计稿 DSL 未通过编译校验：${firstDiagnostic.message}（${firstDiagnostic.line}:${firstDiagnostic.column}）`
}

function buildInitialDesignBlueprintMessageMeta(params: {
  vendor: 'openai' | 'anthropic' | 'google'
  protocol: ModelProviderProtocol
  designDocumentId: string
  generationMode: 'generate' | 'regenerate'
}): GenerationMessageMetaPayload {
  return {
    vendor: params.vendor,
    protocol: params.protocol,
    designBlueprintBlock: {
      kind: 'design-blueprint-generation',
      designDocumentId: params.designDocumentId,
      generationMode: params.generationMode,
      status: 'streaming',
      progressPercent: 5,
      phaseLabel: '正在准备规划设计稿生成',
      canAbort: true,
      diagnostics: [],
      errorMessage: null
    }
  }
}
