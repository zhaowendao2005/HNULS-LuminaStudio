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
  GenerationMessageMetaPayload,
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
  ModelConfig
} from '@preload/types'
import { logger } from '@main/services/logger'
import type { DatabaseManager } from '../database-sqlite/database-manager'
import { OrchestraflowWorkflowService } from '../orchestraflow/orchestraflow-workflow-service'
import type { ModelConfigService } from '../model-config'
import { runAnalysisPlanner, runDesignPlanner, runPlanningCopilot } from './agents'
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
import { parseOFPlanningPatchToml, validateOFAuthoringToml } from '@shared/Orchestraflow-types'

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

function shouldPromoteAnalysisChatToPlanner(request: GenerationSendMessageRequest): boolean {
  if (request.channelKey !== 'analysis-chat') {
    return false
  }
  if (request.meta?.finalizeIntent === 'force-chat') {
    return false
  }
  if (request.meta?.finalizeIntent === 'force-result') {
    return true
  }

  const normalizedText = request.text.trim().toLowerCase()
  if (!normalizedText) {
    return false
  }

  // 中文关键词优先覆盖“按这个定稿 / 输出计划 / 整理成正式规划”这类高意图表达。
  // 这里故意保持规则较保守，避免普通讨论被误判成正式产出请求。
  return [
    '定稿',
    '输出计划',
    '生成计划',
    '正式规划',
    '整理成规划',
    '整理成正式规划',
    '按这个方案',
    '按这个来',
    '就这么定',
    '确定方案'
  ].some((keyword) => normalizedText.includes(keyword))
}

function buildAnalysisMessageMeta(params: {
  stageKey: GenerationStageKey
  request: GenerationSendMessageRequest
  effectiveChannelKey?: 'analysis-chat' | 'analysis-planner'
  finalizeIntentDetected?: boolean
  promotedFromChannelKey?: 'analysis-chat'
}): GenerationMessageMetaPayload {
  return {
    stageKey: params.stageKey,
    requestedChannelKey: params.request.channelKey,
    effectiveChannelKey: params.effectiveChannelKey,
    branchMode:
      params.effectiveChannelKey === 'analysis-planner'
        ? 'result'
        : params.effectiveChannelKey === 'analysis-chat'
          ? 'chat'
          : undefined,
    triggerSource: params.request.meta?.triggerSource,
    finalizeIntentDetected: params.finalizeIntentDetected,
    promotedFromChannelKey: params.promotedFromChannelKey
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
    // text-delta 可能非常高频，不进入 traceBuffer，避免运行时内存膨胀
    if (event.type !== 'text-delta') {
      this.traceBuffer.append(event.runId, event)
    }
    for (const run of this.activeRuns.values()) {
      if (
        run.runId === event.runId &&
        (run as ActiveGenerationRun & { sender?: WebContents }).sender
      ) {
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
    const designDocument = detail.designDocuments.find(
      (item) => item.id === request.designDocumentId
    )
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
    const effectiveAnalysisChannelKey =
      stageKey === 'analysis' && shouldPromoteAnalysisChatToPlanner(request)
        ? 'analysis-planner'
        : stageKey === 'analysis' && request.channelKey === 'analysis-chat'
          ? 'analysis-chat'
          : stageKey === 'analysis'
            ? 'analysis-planner'
            : undefined

    // 让 design copilot 的消息“跟随设计稿版本切换”。
    // 做法：在 message.metaJson 里写入 artifactDocumentId（即 designDocumentId）。
    // 这样前端就能按 activeDesignDocument.id 过滤消息列表。
    const artifactDocumentId =
      request.channelKey === 'design-planner'
        ? request.designDocumentId || detail.selectedDesignDocumentId || null
        : null

    const baseAnalysisMeta =
      stageKey === 'analysis'
        ? buildAnalysisMessageMeta({
            stageKey,
            request,
            effectiveChannelKey: effectiveAnalysisChannelKey,
            finalizeIntentDetected: effectiveAnalysisChannelKey === 'analysis-planner',
            promotedFromChannelKey:
              request.channelKey === 'analysis-chat' && effectiveAnalysisChannelKey === 'analysis-planner'
                ? 'analysis-chat'
                : undefined
          })
        : null

    const userMessage = this.repository.insertMessage({
      sessionId: request.sessionId,
      channelKey: request.channelKey,
      role: 'user',
      status: 'completed',
      content: request.text,
      meta: {
        stageKey,
        artifactDocumentId: artifactDocumentId || undefined,
        ...(baseAnalysisMeta || {})
      }
    })

    const assistantMessage = this.repository.insertMessage({
      sessionId: request.sessionId,
      channelKey:
        stageKey === 'analysis' && effectiveAnalysisChannelKey
          ? effectiveAnalysisChannelKey
          : request.channelKey,
      role: 'assistant',
      status: 'streaming',
      content: '',
      meta: {
        stageKey,
        artifactDocumentId: artifactDocumentId || undefined,
        ...(baseAnalysisMeta || {})
      }
    })

    const activeRun = createActiveGenerationRun({
      sessionId: request.sessionId,
      channelKey:
        stageKey === 'analysis' && effectiveAnalysisChannelKey
          ? effectiveAnalysisChannelKey
          : request.channelKey,
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
      channelKey: activeRun.channelKey,
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
    const startedAt = Date.now()
    const bridge = new GenerationCallbackBridge(this, activeRun.runId)
    const budget = new GenerationBudgetController(stageConfig.maxRepairIterations)

    const llmLog = logger.scope('OrchestflowGenerationLLMClient')
    let runOutcome: 'completed' | 'aborted' | 'failed' = 'failed'

    try {
      const provider = await this.resolveProviderConfig(request.providerId, request.modelId)
      const rawModel = createGenerationChatModel(provider)

      const extractChunkText = (chunk: unknown): string => {
        const content = (chunk as { content?: unknown } | null | undefined)?.content
        if (typeof content === 'string') return content
        if (Array.isArray(content)) {
          return content
            .map((part) => {
              if (typeof part === 'string') return part
              if (part && typeof part === 'object') {
                const maybeText = (part as { text?: unknown }).text
                if (typeof maybeText === 'string') return maybeText
              }
              return ''
            })
            .join('')
        }
        return ''
      }

      const createLoggedModel = (stepKey: string) => {
        return {
          invoke: async (input: unknown, options?: unknown): Promise<{ content: unknown }> => {
            const invokeStartedAt = Date.now()
            const summarizeInput = () => {
              if (Array.isArray(input)) {
                const contents = (input as Array<{ content?: unknown }>).map((m) =>
                  typeof m?.content === 'string' ? m.content : ''
                )
                const approxChars = contents.reduce((acc, cur) => acc + cur.length, 0)
                return { kind: 'messages', messageCount: input.length, approxChars }
              }
              if (typeof input === 'string') {
                return { kind: 'string', approxChars: input.length }
              }
              return { kind: typeof input }
            }

            llmLog.info('invoke:start', {
              runId: activeRun.runId,
              requestId: activeRun.requestId,
              sessionId: request.sessionId,
              channelKey: activeRun.channelKey,
              stepKey,
              providerId: provider.providerId,
              modelId: provider.modelId,
              baseUrl: provider.baseUrl || null,
              input: summarizeInput()
            })

            try {
              const asAsyncIterable = (value: unknown): AsyncIterable<unknown> => {
                if (
                  value &&
                  typeof (value as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator] ===
                    'function'
                ) {
                  return value as AsyncIterable<unknown>
                }
                if (
                  value &&
                  typeof (value as { [Symbol.iterator]?: unknown })[Symbol.iterator] === 'function'
                ) {
                  const iterable = value as Iterable<unknown>
                  return (async function* () {
                    yield* iterable
                  })()
                }
                const maybeReaderFactory = (value as { getReader?: unknown } | null | undefined)
                  ?.getReader
                if (value && typeof maybeReaderFactory === 'function') {
                  return (async function* () {
                    const reader = (
                      value as {
                        getReader: () => {
                          read: () => Promise<{ value?: unknown; done: boolean }>
                          releaseLock: () => void
                        }
                      }
                    ).getReader()
                    try {
                      while (true) {
                        const { value, done } = await reader.read()
                        if (done) break
                        yield value
                      }
                    } finally {
                      reader.releaseLock()
                    }
                  })()
                }
                throw new Error('stream() did not return an async iterable')
              }

              const maybeStream = (rawModel as unknown as { stream?: unknown }).stream
              if (typeof maybeStream === 'function') {
                const streamResult = await Promise.resolve(
                  (maybeStream as (i: unknown, o?: unknown) => unknown).call(
                    rawModel,
                    input,
                    options
                  )
                )

                let fullText = ''
                for await (const chunk of asAsyncIterable(streamResult)) {
                  const delta = extractChunkText(chunk)
                  if (!delta) continue
                  fullText += delta
                  bridge.emit({
                    type: 'text-delta',
                    messageId: activeRun.messageId,
                    delta
                  })
                }

                llmLog.info('invoke:finish', {
                  runId: activeRun.runId,
                  requestId: activeRun.requestId,
                  sessionId: request.sessionId,
                  channelKey: activeRun.channelKey,
                  stepKey,
                  durationMs: Date.now() - invokeStartedAt,
                  outputChars: fullText.length
                })

                return { content: fullText }
              }

              const response = (await (
                rawModel as {
                  invoke: (i: unknown, o?: unknown) => Promise<{ content: unknown }>
                }
              ).invoke(input, options)) as { content: unknown }

              llmLog.info('invoke:finish', {
                runId: activeRun.runId,
                requestId: activeRun.requestId,
                sessionId: request.sessionId,
                channelKey: activeRun.channelKey,
                stepKey,
                durationMs: Date.now() - invokeStartedAt,
                outputChars: String(response?.content ?? '').length
              })

              return response
            } catch (error) {
              llmLog.error('invoke:error', error, {
                runId: activeRun.runId,
                requestId: activeRun.requestId,
                sessionId: request.sessionId,
                channelKey: activeRun.channelKey,
                stepKey,
                durationMs: Date.now() - invokeStartedAt
              })
              throw error
            }
          }
        }
      }

      const memoryWindow = this.memory.read(request.sessionId, stageConfig.memoryRounds)
      const workflowSpec = buildBaseWorkflowSpecPrompt()
      const nodePrompt = buildCompressedNodePrompt()

      bridge.emit({
        type: 'memory-snapshot',
        stepKey: activeRun.channelKey,
        memory: {
          memoryWindow
        }
      })

      if (activeRun.channelKey === 'analysis-planner') {
        const result = await runAnalysisPlanner({
          model: createLoggedModel('analysis-planner'),
          context: {
            analysisDocument: detail.analysisDocument.content,
            userText,
            memoryWindow,
            workflowSpec
          },
          mode: 'result'
        })
        if (result.branch !== 'result') {
          throw new Error('analysis-planner(result) 返回了错误分支')
        }
        bridge.emit({
          type: 'prompt-snapshot',
          stepKey: 'analysis-planner',
          title: 'Analysis Prompt',
          prompt: result.prompt
        })
        bridge.emit({
          type: 'context-snapshot',
          stepKey: 'analysis-planner',
          title: 'Analysis Context',
          context: result.context
        })
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
      } else if (activeRun.channelKey === 'analysis-chat') {
        const result = await runAnalysisPlanner({
          model: createLoggedModel('analysis-chat'),
          context: {
            analysisDocument: detail.analysisDocument.content,
            userText,
            memoryWindow,
            workflowSpec
          },
          mode: 'chat'
        })
        if (result.branch !== 'chat') {
          throw new Error('analysis-planner(chat) 返回了错误分支')
        }
        bridge.emit({
          type: 'prompt-snapshot',
          stepKey: 'analysis-chat',
          title: 'Analysis Chat Prompt',
          prompt: result.prompt
        })
        bridge.emit({
          type: 'context-snapshot',
          stepKey: 'analysis-chat',
          title: 'Analysis Chat Context',
          context: result.context
        })
        const spentTokens = budget.add(estimateTokenUsage(result.prompt + result.reply))
        bridge.emit({
          type: 'budget-update',
          spentTokens,
          iteration: 1,
          maxIterations: budget.getMaxIterations()
        })
        this.repository.updateMessageContent(activeRun.messageId, result.reply)
        const currentAssistantMeta = this.repository.getMessageById(activeRun.messageId).metaJson
        this.repository.updateMessageMeta(activeRun.messageId, {
          ...(currentAssistantMeta
            ? (JSON.parse(currentAssistantMeta) as GenerationMessageMetaPayload)
            : {}),
          stageKey: 'analysis',
          requestedChannelKey: request.channelKey,
          effectiveChannelKey: 'analysis-chat',
          branchMode: 'chat',
          triggerSource: request.meta?.triggerSource,
          finalizeIntentDetected: result.intent.finalizeAnalysis,
          promotedFromChannelKey: undefined
        })

        if (result.intent.finalizeAnalysis) {
          const promotedAssistantMeta = this.repository.getMessageById(activeRun.messageId).metaJson
          const plannerResult = await runAnalysisPlanner({
            model: createLoggedModel('analysis-planner'),
            context: {
              analysisDocument: detail.analysisDocument.content,
              userText,
              memoryWindow,
              workflowSpec
            },
            mode: 'result'
          })
          if (plannerResult.branch !== 'result') {
            throw new Error('analysis-planner(promoted result) 返回了错误分支')
          }
          bridge.emit({
            type: 'prompt-snapshot',
            stepKey: 'analysis-planner',
            title: 'Analysis Prompt (Promoted)',
            prompt: plannerResult.prompt
          })
          bridge.emit({
            type: 'context-snapshot',
            stepKey: 'analysis-planner',
            title: 'Analysis Context (Promoted)',
            context: plannerResult.context
          })
          const promotedSpentTokens = budget.add(
            estimateTokenUsage(plannerResult.prompt + plannerResult.markdown)
          )
          bridge.emit({
            type: 'budget-update',
            spentTokens: promotedSpentTokens,
            iteration: 2,
            maxIterations: budget.getMaxIterations()
          })
          this.repository.updateMessageContent(activeRun.messageId, plannerResult.markdown)
          this.repository.updateMessageMeta(activeRun.messageId, {
            ...(promotedAssistantMeta
              ? (JSON.parse(promotedAssistantMeta) as GenerationMessageMetaPayload)
              : {}),
            stageKey: 'analysis',
            requestedChannelKey: request.channelKey,
            effectiveChannelKey: 'analysis-planner',
            branchMode: 'result',
            triggerSource: request.meta?.triggerSource,
            finalizeIntentDetected: true,
            promotedFromChannelKey: 'analysis-chat'
          })
          const analysisDocument = this.repository.saveAnalysisDocument(request.sessionId, {
            ...detail.analysisDocument,
            content: plannerResult.markdown,
            summary: buildAnalysisSummary(plannerResult.markdown)
          })
          bridge.emit({
            type: 'artifact-replace',
            artifact: 'analysis-document',
            content: analysisDocument.content,
            summary: analysisDocument.summary
          })
        }
      } else if (request.channelKey === 'planning-copilot') {
        const result = await runPlanningCopilot({
          model: createLoggedModel('planning-copilot'),
          context: {
            analysisDocument: detail.analysisDocument.content,
            userText,
            memoryWindow
          }
        })
        bridge.emit({
          type: 'prompt-snapshot',
          stepKey: 'planning-copilot',
          title: 'Planning Copilot Prompt',
          prompt: result.prompt
        })
        bridge.emit({
          type: 'context-snapshot',
          stepKey: 'planning-copilot',
          title: 'Planning Copilot Context',
          context: result.context
        })
        const spentTokens = budget.add(estimateTokenUsage(result.prompt + result.patchToml))
        bridge.emit({
          type: 'budget-update',
          spentTokens,
          iteration: 1,
          maxIterations: budget.getMaxIterations()
        })
        this.repository.updateMessageContent(activeRun.messageId, result.patchToml)
        const patch = parseOFPlanningPatchToml(result.patchToml) as {
          action: 'replace-analysis' | 'append-analysis'
          content: string
        }
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
          detail.designDocuments.find(
            (item) => item.id === (request.designDocumentId || detail.selectedDesignDocumentId)
          ) ||
          this.repository.createDesignDocument({
            sessionId: request.sessionId,
            title: '设计稿',
            planningSourceMessageId: null
          })

        const result = await runDesignPlanner({
          model: createLoggedModel('design-planner'),
          context: {
            analysisDocument: detail.analysisDocument.content,
            currentToml: designDocument.content,
            workflowSpec,
            nodePrompt,
            validationReport: null
          },
          maxRepairIterations: stageConfig.maxRepairIterations,
          onIteration: ({ iteration, prompt, context, toml, validationReport }) => {
            bridge.emit({
              type: 'prompt-snapshot',
              stepKey: 'design-planner',
              title: `Design Prompt #${iteration}`,
              prompt
            })
            bridge.emit({
              type: 'context-snapshot',
              stepKey: 'design-planner',
              title: `Design Context #${iteration}`,
              context
            })
            bridge.emit({ type: 'validation-report', report: validationReport })
            const spentTokens = budget.add(estimateTokenUsage(prompt + toml))
            bridge.emit({
              type: 'budget-update',
              spentTokens,
              iteration,
              maxIterations: budget.getMaxIterations()
            })
          }
        })

        this.repository.updateMessageContent(activeRun.messageId, result.toml)
        const savedDocument = this.repository.saveDesignDocument(request.sessionId, {
          ...designDocument,
          content: result.toml,
          contentFormat: 'of-workflow-toml-v1',
          status: result.validationReport.valid ? 'valid' : 'invalid',
          summary: buildDesignSummary({
            ...designDocument,
            status: result.validationReport.valid ? 'valid' : 'invalid'
          } as GenerationDesignDocument),
          validationJson: JSON.stringify(result.validationReport),
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
        runOutcome = 'aborted'
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

      runOutcome = 'completed'
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
      runOutcome = 'failed'
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
      llmLog.info('run:finalize', {
        runId: activeRun.runId,
        requestId: activeRun.requestId,
        sessionId: request.sessionId,
        channelKey: request.channelKey,
        outcome: runOutcome,
        durationMs: Date.now() - startedAt
      })
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

    const resolveProvider = () => {
      if (providerId) {
        return config.providers.find((item) => item.id === providerId)
      }
      const active = config.activeProviderId
        ? config.providers.find((item) => item.id === config.activeProviderId)
        : undefined
      return active || config.providers.find((item) => item.enabled)
    }

    const provider = resolveProvider()
    if (!provider) {
      throw new Error(
        providerId ? `模型 provider 不存在：${providerId}` : '未配置可用的模型 provider'
      )
    }

    const resolvedModelId = modelId || provider.models[0]?.id
    if (!resolvedModelId) {
      throw new Error('当前 provider 未配置任何模型')
    }

    return {
      providerId: provider.id,
      modelId: resolvedModelId,
      protocol: provider.protocol,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      defaultHeaders: provider.defaultHeaders
    }
  }
}
