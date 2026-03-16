import type Database from 'better-sqlite3'
import type { WebContents } from 'electron'
import type {
  GenerationAnalysisDocument,
  GenerationCompileDesignDocumentToWorkflowRequest,
  GenerationCompileDesignDocumentToWorkflowResult,
  GenerationCreateDesignDocumentRequest,
  GenerationCreateSessionRequest,
  GenerationDeleteDesignDocumentRequest,
  GenerationDeleteSessionRequest,
  GenerationDesignDocument,
  GenerationGlobalSettings,
  GenerationListMessagesRequest,
  GenerationSaveAnalysisDocumentRequest,
  GenerationSaveDesignDocumentRequest,
  GenerationSaveStageConfigRequest,
  GenerationSelectDesignDocumentRequest,
  GenerationSendMessageRequest,
  GenerationSessionDetail,
  GenerationStageConfig,
  GenerationStageKey,
  GenerationStreamEvent,
  GenerationUpdateSessionStateRequest,
  GenerationValidationReport,
  ModelConfig
} from '@preload/types'
import { logger } from '@main/services/logger'
import type { DatabaseManager } from '../database-sqlite/database-manager'
import { OrchestraflowWorkflowService } from '../orchestraflow/orchestraflow-workflow-service'
import type { ModelConfigService } from '../model-config'
import { runAnalysisPlanner } from './agents/analysis-planner/graph'
import { runDesignPlanner } from './agents/design-planner/graph'
import { runPlanningCopilot } from './agents/planning-copilot/graph'
import { estimateTokenUsage } from './agents/shared/trace-helpers'
import { DEFAULT_STAGE_CONFIGS, createDefaultAnalysisDocument } from './constants/defaults'
import { createGenerationChatModel } from './providers/chat-model-factory'
import type { GenerationModelProviderConfig } from './providers/types'
import { GenerationEditorRepository } from './repositories/generation-editor.repository'
import { buildBaseWorkflowSpecPrompt } from './prompts/base-workflow-spec'
import { buildCompressedNodePrompt } from './prompts/prompt-compressor'
import { createActiveGenerationRun } from './runtime/agent-runner'
import { GenerationBudgetController } from './runtime/budget-controller'
import { GenerationCallbackBridge } from './runtime/callback-bridge'
import { EphemeralGenerationMemory } from './runtime/ephemeral-memory'
import { GenerationTraceBuffer } from './runtime/trace-buffer'
import type { ActiveGenerationRun, GenerationEventSink } from './runtime/types/runtime.types'
import { compileDesignDocumentTomlToWorkflow } from './toml/compiler'
import { runFormatValidation } from './validation/format-validator'
import { mapAuthoringDiagnostics } from './validation/diagnostics'
import { validateOFAuthoringToml } from '@shared/Orchestraflow-types'

const log = logger.scope('OrchestflowGenerationEditorService')

function nowIso(): string {
  return new Date().toISOString()
}

function buildAnalysisSummary(content: string): string {
  const firstLine = content
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean)
  return firstLine || '已生成需求分析。'
}

function buildDesignSummary(document: GenerationDesignDocument): string {
  if (document.status === 'valid') {
    return '设计稿已通过校验。'
  }
  if (document.status === 'invalid') {
    return '设计稿仍有校验问题。'
  }
  return '设计稿草稿已更新。'
}

function applyPlanningPatch(
  document: GenerationAnalysisDocument,
  patch: { action: 'replace-analysis' | 'append-analysis'; content: string }
): GenerationAnalysisDocument {
  const nextContent =
    patch.action === 'append-analysis'
      ? `${document.content.trim()}\n\n${patch.content.trim()}`
      : patch.content.trim()
  return {
    ...document,
    content: nextContent,
    summary: buildAnalysisSummary(nextContent),
    updatedAt: nowIso()
  }
}

export class OrchestflowGenerationEditorService implements GenerationEventSink {
  private readonly repository: GenerationEditorRepository
  private readonly memory = new EphemeralGenerationMemory()
  private readonly traceBuffer = new GenerationTraceBuffer()
  private readonly workflowService = new OrchestraflowWorkflowService()
  private readonly activeRuns = new Map<string, ActiveGenerationRun>()

  constructor(
    databaseManager: DatabaseManager,
    private readonly modelConfigService: ModelConfigService
  ) {
    const db = databaseManager.getDatabase('orchestflow-generation-editor') as Database.Database
    this.repository = new GenerationEditorRepository(db)
  }

  emit(event: GenerationStreamEvent): void {
    this.traceBuffer.append(event.runId, event)
    for (const run of this.activeRuns.values()) {
      if (run.runId === event.runId && (run as ActiveGenerationRun & { sender?: WebContents }).sender) {
        ;(run as ActiveGenerationRun & { sender?: WebContents }).sender?.send(
          'orchestflowGenerationEditor:stream',
          event
        )
      }
    }
  }

  listSessions() {
    return this.repository.listSessions()
  }

  createSession(request: GenerationCreateSessionRequest): GenerationSessionDetail {
    return this.repository.createSession({
      title: request.title,
      stageConfigs: [DEFAULT_STAGE_CONFIGS.analysis, DEFAULT_STAGE_CONFIGS.design],
      analysisDocument: createDefaultAnalysisDocument()
    })
  }

  deleteSession(request: string | GenerationDeleteSessionRequest): void {
    const sessionId = typeof request === 'string' ? request : request.sessionId
    this.repository.deleteSession(sessionId)
  }

  getSessionDetail(sessionId: string): GenerationSessionDetail {
    return this.repository.getSessionDetail(sessionId)
  }

  updateSessionState(request: GenerationUpdateSessionStateRequest): GenerationSessionDetail {
    return this.repository.updateSessionState(request.sessionId, request.currentStage)
  }

  saveStageConfig(request: GenerationSaveStageConfigRequest): GenerationStageConfig {
    return this.repository.saveStageConfig(request.sessionId, request.config)
  }

  saveAnalysisDocument(request: GenerationSaveAnalysisDocumentRequest): GenerationAnalysisDocument {
    return this.repository.saveAnalysisDocument(request.sessionId, request.document)
  }

  createDesignDocument(request: GenerationCreateDesignDocumentRequest): GenerationDesignDocument {
    return this.repository.createDesignDocument({
      sessionId: request.sessionId,
      title: request.title?.trim() || '设计稿',
      planningSourceMessageId: request.planningSourceMessageId || null
    })
  }

  saveDesignDocument(request: GenerationSaveDesignDocumentRequest): GenerationDesignDocument {
    return this.repository.saveDesignDocument(request.sessionId, request.document)
  }

  selectDesignDocument(request: GenerationSelectDesignDocumentRequest): GenerationSessionDetail {
    return this.repository.selectDesignDocument(request.sessionId, request.designDocumentId)
  }

  deleteDesignDocument(request: GenerationDeleteDesignDocumentRequest): void {
    this.repository.deleteDesignDocument(request.sessionId, request.designDocumentId)
  }

  listMessages(request: GenerationListMessagesRequest) {
    return this.repository.listMessages(request.sessionId, request.channelKey)
  }

  getGlobalSettings(): GenerationGlobalSettings {
    return this.repository.getGlobalSettings()
  }

  updateGlobalSettings(settings: Partial<GenerationGlobalSettings>): GenerationGlobalSettings {
    return this.repository.updateGlobalSettings(settings)
  }

  async compileDesignDocumentToWorkflow(
    request: GenerationCompileDesignDocumentToWorkflowRequest
  ): Promise<GenerationCompileDesignDocumentToWorkflowResult> {
    const detail = this.repository.getSessionDetail(request.sessionId)
    const designDocument = detail.designDocuments.find((item) => item.id === request.designDocumentId)
    if (!designDocument) {
      throw new Error('设计稿不存在，无法编译。')
    }

    const parsed = runFormatValidation(designDocument.content)
    if (!parsed.document) {
      throw new Error(parsed.diagnostics.map((item) => item.message).join('\n'))
    }

    const validation = validateOFAuthoringToml(parsed.document)
    if (!validation.valid) {
      throw new Error(validation.diagnostics.map((item) => item.message).join('\n'))
    }

    const compiled = compileDesignDocumentTomlToWorkflow(designDocument.content)
    if (!compiled.runnable) {
      throw new Error(compiled.diagnostics.map((item) => item.message).join('\n'))
    }

    const workflow = await this.workflowService.createFromWorkflow(compiled.runnable)
    const saved = this.repository.saveDesignDocument(request.sessionId, {
      ...designDocument,
      status: 'valid',
      validationJson: JSON.stringify({
        valid: true,
        diagnostics: []
      }),
      summary: '设计稿已编译为工作流。',
      derivedTargetType: 'workflow',
      derivedTargetId: workflow.id,
      updatedAt: nowIso()
    })

    return {
      designDocument: saved,
      workflowId: workflow.id
    }
  }

  async sendMessage(sender: WebContents, request: GenerationSendMessageRequest) {
    const stageKey = request.channelKey === 'design-planner' ? 'design' : 'analysis'
    const detail = this.repository.getSessionDetail(request.sessionId)
    const stageConfig = this.getStageConfig(detail, stageKey)

    const userMessage = this.repository.insertMessage({
      sessionId: request.sessionId,
      channelKey: request.channelKey,
      role: 'user',
      status: 'completed',
      content: request.text
    })

    const assistantMessage = this.repository.insertMessage({
      sessionId: request.sessionId,
      channelKey: request.channelKey,
      role: 'assistant',
      status: 'streaming',
      content: '',
      meta: {
        stageKey
      }
    })

    const activeRun = createActiveGenerationRun({
      sessionId: request.sessionId,
      channelKey: request.channelKey,
      stageKey,
      messageId: assistantMessage.id
    }) as ActiveGenerationRun & { sender?: WebContents }
    activeRun.sender = sender
    this.activeRuns.set(activeRun.requestId, activeRun)

    this.emit({
      type: 'run-start',
      runId: activeRun.runId,
      requestId: activeRun.requestId,
      messageId: assistantMessage.id,
      sessionId: request.sessionId,
      channelKey: request.channelKey,
      stageKey,
      startedAt: nowIso()
    })

    void this.executeAgentRun(activeRun, request, detail, stageConfig, userMessage.content)
    return {
      ...assistantMessage,
      requestId: activeRun.requestId
    }
  }

  async abortMessage(requestId: string): Promise<void> {
    const activeRun = this.activeRuns.get(requestId)
    if (activeRun) {
      activeRun.aborted = true
    }
  }

  shutdown(): void {
    this.activeRuns.clear()
  }

  private async executeAgentRun(
    activeRun: ActiveGenerationRun,
    request: GenerationSendMessageRequest,
    detail: GenerationSessionDetail,
    stageConfig: GenerationStageConfig,
    userText: string
  ): Promise<void> {
    const bridge = new GenerationCallbackBridge(this, activeRun.runId)
    const budget = new GenerationBudgetController(stageConfig.maxRepairIterations)

    try {
      const provider = await this.resolveProviderConfig(request.providerId, request.modelId)
      const model = createGenerationChatModel(provider)
      const memoryWindow = this.memory.read(request.sessionId, stageConfig.memoryRounds)
      const workflowSpec = buildBaseWorkflowSpecPrompt()
      const nodePrompt = buildCompressedNodePrompt()

      bridge.emit({
        type: 'memory-snapshot',
        stepKey: request.channelKey,
        memory: {
          memoryWindow
        }
      })

      if (request.channelKey === 'analysis-planner') {
        const result = await runAnalysisPlanner({
          model,
          context: {
            analysisDocument: detail.analysisDocument.content,
            userText,
            memoryWindow,
            workflowSpec
          }
        })
        bridge.emit({ type: 'prompt-snapshot', stepKey: 'analysis-planner', title: 'Analysis Prompt', prompt: result.prompt })
        bridge.emit({ type: 'context-snapshot', stepKey: 'analysis-planner', title: 'Analysis Context', context: result.context })
        const spentTokens = budget.add(estimateTokenUsage(result.prompt + result.markdown))
        bridge.emit({
          type: 'budget-update',
          spentTokens,
          iteration: 1,
          maxIterations: budget.getMaxIterations()
        })
        this.repository.updateMessageContent(activeRun.messageId, result.markdown)
        const analysisDocument = this.repository.saveAnalysisDocument(request.sessionId, {
          ...detail.analysisDocument,
          content: result.markdown,
          summary: buildAnalysisSummary(result.markdown)
        })
        bridge.emit({
          type: 'artifact-replace',
          artifact: 'analysis-document',
          content: analysisDocument.content,
          summary: analysisDocument.summary
        })
      } else if (request.channelKey === 'planning-copilot') {
        const result = await runPlanningCopilot({
          model,
          context: {
            analysisDocument: detail.analysisDocument.content,
            userText,
            memoryWindow
          }
        })
        bridge.emit({ type: 'prompt-snapshot', stepKey: 'planning-copilot', title: 'Planning Copilot Prompt', prompt: result.prompt })
        bridge.emit({ type: 'context-snapshot', stepKey: 'planning-copilot', title: 'Planning Copilot Context', context: result.context })
        const spentTokens = budget.add(estimateTokenUsage(result.prompt + result.patchToml))
        bridge.emit({
          type: 'budget-update',
          spentTokens,
          iteration: 1,
          maxIterations: budget.getMaxIterations()
        })
        this.repository.updateMessageContent(activeRun.messageId, result.patchToml)
        const patch = require('@shared/Orchestraflow-types').parseOFPlanningPatchToml(
          result.patchToml
        ) as { action: 'replace-analysis' | 'append-analysis'; content: string }
        const analysisDocument = this.repository.saveAnalysisDocument(
          request.sessionId,
          applyPlanningPatch(detail.analysisDocument, patch)
        )
        bridge.emit({
          type: 'artifact-replace',
          artifact: 'analysis-document',
          content: analysisDocument.content,
          summary: analysisDocument.summary
        })
      } else {
        const designDocument =
          detail.designDocuments.find((item) => item.id === (request.designDocumentId || detail.selectedDesignDocumentId)) ||
          this.repository.createDesignDocument({
            sessionId: request.sessionId,
            title: '设计稿',
            planningSourceMessageId: null
          })

        let currentToml = designDocument.content
        let lastValidation: GenerationValidationReport | null = null
        let finalToml = currentToml

        for (let iteration = 1; iteration <= stageConfig.maxRepairIterations; iteration += 1) {
          const result = await runDesignPlanner({
            model,
            context: {
              analysisDocument: detail.analysisDocument.content,
              currentToml,
              workflowSpec,
              nodePrompt,
              validationReport: lastValidation
            }
          })
          bridge.emit({ type: 'prompt-snapshot', stepKey: 'design-planner', title: `Design Prompt #${iteration}`, prompt: result.prompt })
          bridge.emit({ type: 'context-snapshot', stepKey: 'design-planner', title: `Design Context #${iteration}`, context: result.context })
          const spentTokens = budget.add(estimateTokenUsage(result.prompt + result.toml))
          bridge.emit({
            type: 'budget-update',
            spentTokens,
            iteration,
            maxIterations: budget.getMaxIterations()
          })

          finalToml = result.toml
          const parsed = runFormatValidation(result.toml)
          if (!parsed.document) {
            lastValidation = {
              valid: false,
              diagnostics: mapAuthoringDiagnostics(parsed.diagnostics)
            }
            bridge.emit({ type: 'validation-report', report: lastValidation })
            currentToml = result.toml
            continue
          }

          const validation = validateOFAuthoringToml(parsed.document)
          lastValidation = {
            valid: validation.valid,
            diagnostics: mapAuthoringDiagnostics(validation.diagnostics)
          }
          bridge.emit({ type: 'validation-report', report: lastValidation })
          currentToml = result.toml
          if (validation.valid) {
            break
          }
        }

        this.repository.updateMessageContent(activeRun.messageId, finalToml)
        const savedDocument = this.repository.saveDesignDocument(request.sessionId, {
          ...designDocument,
          content: finalToml,
          contentFormat: 'of-workflow-toml-v1',
          status: lastValidation?.valid ? 'valid' : 'invalid',
          summary: buildDesignSummary({
            ...designDocument,
            status: lastValidation?.valid ? 'valid' : 'invalid'
          } as GenerationDesignDocument),
          validationJson: JSON.stringify(lastValidation),
          updatedAt: nowIso()
        })
        bridge.emit({
          type: 'artifact-replace',
          artifact: 'design-document',
          documentId: savedDocument.id,
          content: savedDocument.content,
          summary: savedDocument.summary
        })
        this.repository.updateSessionState(request.sessionId, 'design')
      }

      if (activeRun.aborted) {
        this.repository.finishMessage(activeRun.messageId, 'aborted')
        this.emit({
          type: 'run-finish',
          runId: activeRun.runId,
          messageId: activeRun.messageId,
          status: 'aborted',
          finishedAt: nowIso()
        })
        return
      }

      const assistantMessage = this.repository.finishMessage(activeRun.messageId, 'completed')
      this.memory.push(request.sessionId, `user:${userText}`)
      this.memory.push(request.sessionId, `assistant:${assistantMessage.content}`)
      this.emit({
        type: 'run-finish',
        runId: activeRun.runId,
        messageId: activeRun.messageId,
        status: 'completed',
        finishedAt: nowIso()
      })
    } catch (error) {
      log.error('Generate run failed', error)
      this.repository.failMessage(
        activeRun.messageId,
        error instanceof Error ? error.message : '生成失败'
      )
      this.emit({
        type: 'run-error',
        runId: activeRun.runId,
        messageId: activeRun.messageId,
        error: error instanceof Error ? error.message : '生成失败'
      })
    } finally {
      this.activeRuns.delete(activeRun.requestId)
      this.traceBuffer.clear(activeRun.runId)
    }
  }

  private getStageConfig(
    detail: GenerationSessionDetail,
    stageKey: GenerationStageKey
  ): GenerationStageConfig {
    return (
      detail.stageConfigs.find((config) => config.stageKey === stageKey) ||
      DEFAULT_STAGE_CONFIGS[stageKey]
    )
  }

  private async resolveProviderConfig(
    providerId: string,
    modelId: string
  ): Promise<GenerationModelProviderConfig> {
    const config = (await this.modelConfigService.getConfig()) as ModelConfig
    const provider = config.providers.find((item) => item.id === providerId)
    if (!provider) {
      throw new Error(`模型 provider 不存在：${providerId}`)
    }

    return {
      providerId,
      modelId,
      protocol: provider.protocol,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey
    }
  }
}
