import {
  listAffectedOFPlanningSectionKeys,
  parseOFPlanningCommandDsl,
  type OFPlanningCommandMode
} from '@shared/Orchestraflow-types'
import { logger } from '@main/services/logger'
import type { GenerationMessageMetaPayload } from '@preload/types'
import { streamChatByProtocol } from '../../generation-stream-runner'
import type { ActiveGenerationStream } from '../../../types/stream.types'
import { buildAnalysisCopilotSpecializationPrompt } from './analysis-specialization'
import { buildCopilotEditorBasePrompt } from './base-prompt'
import { buildCopilotEditorContextBundle } from './context-builder'
import {
  COPILOT_EDITOR_DSL_END_MARKER,
  COPILOT_EDITOR_DSL_START_MARKER,
  extractVisibleTextAndDsl,
  normalizeCopilotEditorCommandDsl
} from './dsl'
import {
  resolveInitialStatus,
  validateCopilotEditorModelResult,
  type ValidatedCopilotEditorModelResult
} from './result'
import type { CopilotEditorModelResult, StartCopilotEditorAgentStreamParams } from './types'

const log = logger.scope('CopilotEditorAgent')

interface CopilotEditorStreamAccumulator {
  rawText: string
  visibleText: string
  visibleBuffer: string
  hasEnteredCommandDsl: boolean
}

export function startCopilotEditorAgentStream(params: StartCopilotEditorAgentStreamParams): void {
  const abortController = new AbortController()
  const streamState: ActiveGenerationStream = {
    requestId: params.requestId,
    sessionId: params.sessionId,
    channelKey: params.channelKey,
    messageId: params.messageId,
    sender: params.sender,
    answerText: '',
    providerId: params.providerId,
    modelId: params.modelId,
    abortController
  }

  params.activeStreams.set(params.requestId, streamState)
  void runCopilotEditorAgent(streamState, params)
}

async function runCopilotEditorAgent(
  state: ActiveGenerationStream,
  params: StartCopilotEditorAgentStreamParams
): Promise<void> {
  try {
    emitStreamStart(state)

    const context = buildCopilotEditorContextBundle({
      repository: params.repository,
      sessionId: params.sessionId,
      planningDocumentId: params.planningDocument.id,
      memoryRounds: params.stageConfig.copilotMemoryRounds
    })

    const modelResult = await runModelWithRetry(state, params, context)
    state.answerText = modelResult.visibleText || '我已整理好本次 planning 文档修改建议。'
    params.repository.updateMessageContent(state.messageId, state.answerText)
    state.sender.send('orchestflowGenerationEditor:stream', {
      type: 'text-delta',
      requestId: state.requestId,
      sessionId: state.sessionId,
      channelKey: state.channelKey,
      messageId: state.messageId,
      delta: state.answerText
    })

    const nextMeta = buildCopilotMetaPayload({
      documentId: params.planningDocument.id,
      mode: modelResult.parsedDsl.mode,
      commandDsl: modelResult.commandDsl,
      commands: modelResult.parsedDsl.commands,
      status: resolveInitialStatus({
        mode: modelResult.parsedDsl.mode,
        autoApproved: params.stageConfig.autoApproved,
        isValid: modelResult.isValid
      }),
      errorMessage: modelResult.validationError
    })

    params.repository.updateMessageMeta(state.messageId, JSON.stringify(nextMeta))
    state.sender.send('orchestflowGenerationEditor:stream', {
      type: 'message-meta',
      requestId: state.requestId,
      sessionId: state.sessionId,
      channelKey: state.channelKey,
      messageId: state.messageId,
      metaJson: JSON.stringify(nextMeta)
    })

    if (nextMeta.copilotEditBlock?.status === 'failed') {
      log.warn('Copilot editor agent produced invalid DSL after retry', {
        requestId: state.requestId,
        sessionId: state.sessionId,
        channelKey: state.channelKey,
        providerId: params.providerId,
        modelId: params.modelId,
        errorMessage: nextMeta.copilotEditBlock.errorMessage
      })
    }

    if (nextMeta.copilotEditBlock?.status === 'applied') {
      const appliedDocument = params.repository.applyPlanningCommandProposal({
        sessionId: params.sessionId,
        messageId: state.messageId
      })
      params.repository.selectPlanningDocument({
        sessionId: params.sessionId,
        stageKey: params.stageKey,
        documentId: appliedDocument.id
      })
    }

    finishStream(state, params, 'stop', modelResult.usage, {
      rawResponseText: modelResult.rawText,
      rawTrace: modelResult.rawTrace
    })
  } catch (error) {
    const typedError = error as { name?: string; message?: string }
    if (typedError?.name === 'AbortError') {
      finishStream(state, params, 'aborted', undefined, {
        rawResponseText: state.answerText,
        rawTrace: []
      })
      return
    }

    log.error('Copilot editor agent failed', error, {
      requestId: state.requestId,
      sessionId: state.sessionId,
      channelKey: state.channelKey,
      providerId: params.providerId,
      modelId: params.modelId
    })

    params.repository.markMessageError(
      state.messageId,
      typedError?.message || 'Copilot editor agent failed'
    )
    finishStream(state, params, 'error', undefined, {
      rawResponseText: state.answerText,
      rawTrace: []
    })
  }
}

async function runModelWithRetry(
  state: ActiveGenerationStream,
  params: StartCopilotEditorAgentStreamParams,
  context: ReturnType<typeof buildCopilotEditorContextBundle>
): Promise<ValidatedCopilotEditorModelResult> {
  let lastError = ''
  let lastAttempt: ValidatedCopilotEditorModelResult | null = null

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const result = await runModelOnce(state, params, context, lastError)
    const validatedResult = validateCopilotEditorModelResult(result)
    if (validatedResult.isValid) {
      return validatedResult
    }
    lastAttempt = validatedResult

    if (!result.commandDsl && result.visibleText) {
      lastError = `第 ${attempt} 次输出缺少 DSL marker：${COPILOT_EDITOR_DSL_START_MARKER} / ${COPILOT_EDITOR_DSL_END_MARKER}`
    } else {
      lastError = validatedResult.validationError || '未解析到任何 planning 编辑命令'
    }
  }

  if (lastAttempt) {
    return lastAttempt
  }

  throw new Error(lastError || 'Copilot editor agent failed to produce valid DSL.')
}

async function runModelOnce(
  state: ActiveGenerationStream,
  params: StartCopilotEditorAgentStreamParams,
  context: ReturnType<typeof buildCopilotEditorContextBundle>,
  previousError: string
): Promise<CopilotEditorModelResult> {
  const messages = [
    {
      role: 'system' as const,
      content: [
        buildCopilotEditorBasePrompt(),
        '',
        buildAnalysisCopilotSpecializationPrompt()
      ].join('\n')
    },
    {
      role: 'user' as const,
      content: [
        `current_document_id=${params.planningDocument.id}`,
        `auto_approved=${String(params.stageConfig.autoApproved)}`,
        '',
        '## 当前 planning 工作稿',
        context.planningDocument.content,
        '',
        '## 原始 planning 文档',
        context.sourceMarkdown,
        '',
        '## 最近需求分析主对话',
        context.discussionHistoryText,
        '',
        '## 最近 analysis copilot 对话',
        context.copilotHistoryText,
        '',
        '## Planning Framework Context Pack',
        context.capabilityContextText,
        '',
        previousError ? `## 上一轮 DSL 错误\n${previousError}` : '',
        '## 当前用户输入',
        params.userMessage
      ]
        .filter(Boolean)
        .join('\n')
    }
  ]

  const currentMeta = params.repository.getMessageById(state.messageId)?.meta_json
  const nextMetaJson = JSON.stringify(
    mergeMessageMeta(currentMeta, {
      llmRequest: {
        messages
      }
    })
  )
  params.repository.updateMessageMeta(state.messageId, nextMetaJson)
  state.sender.send('orchestflowGenerationEditor:stream', {
    type: 'message-meta',
    requestId: state.requestId,
    sessionId: state.sessionId,
    channelKey: state.channelKey,
    messageId: state.messageId,
    metaJson: nextMetaJson
  })

  const accumulator: CopilotEditorStreamAccumulator = {
    rawText: '',
    visibleText: '',
    visibleBuffer: '',
    hasEnteredCommandDsl: false
  }

  // retry 时需要先把上一轮尝试的可见正文清空，避免用户看到两轮内容叠加。
  syncVisibleContent(state, params, '')
  const result = await streamChatByProtocol({
    protocol: params.protocol,
    vendor: params.vendor,
    modelId: params.modelId,
    apiKey: params.apiKey,
    baseUrl: params.baseUrl,
    defaultHeaders: params.defaultHeaders,
    signal:
      params.activeStreams.get(params.requestId)?.abortController.signal ||
      new AbortController().signal,
    messages,
    onTextDelta: (delta) => {
      consumeVisibleTextDelta(state, params, accumulator, delta)
    }
  })

  flushRemainingVisibleText(state, params, accumulator)
  const extracted = extractVisibleTextAndDsl(accumulator.rawText)
  const normalizedCommandDsl = normalizeCopilotEditorCommandDsl(extracted.commandDsl)
  return {
    rawText: accumulator.rawText,
    visibleText: accumulator.visibleText.trim() || extracted.visibleText,
    commandDsl: normalizedCommandDsl,
    usage: result.usage,
    rawTrace: result.rawTrace
  }
}

function consumeVisibleTextDelta(
  state: ActiveGenerationStream,
  params: StartCopilotEditorAgentStreamParams,
  accumulator: CopilotEditorStreamAccumulator,
  delta: string
): void {
  accumulator.rawText += delta
  if (accumulator.hasEnteredCommandDsl) {
    return
  }

  accumulator.visibleBuffer += delta
  while (accumulator.visibleBuffer) {
    const markerIndex = accumulator.visibleBuffer.indexOf(COPILOT_EDITOR_DSL_START_MARKER)
    if (markerIndex >= 0) {
      appendVisibleText(state, params, accumulator, accumulator.visibleBuffer.slice(0, markerIndex))
      accumulator.visibleBuffer = accumulator.visibleBuffer.slice(
        markerIndex + COPILOT_EDITOR_DSL_START_MARKER.length
      )
      accumulator.hasEnteredCommandDsl = true
      return
    }

    const safeLength = Math.max(
      0,
      accumulator.visibleBuffer.length - COPILOT_EDITOR_DSL_START_MARKER.length + 1
    )
    if (safeLength === 0) {
      return
    }

    appendVisibleText(state, params, accumulator, accumulator.visibleBuffer.slice(0, safeLength))
    accumulator.visibleBuffer = accumulator.visibleBuffer.slice(safeLength)
    return
  }
}

function flushRemainingVisibleText(
  state: ActiveGenerationStream,
  params: StartCopilotEditorAgentStreamParams,
  accumulator: CopilotEditorStreamAccumulator
): void {
  if (accumulator.hasEnteredCommandDsl || !accumulator.visibleBuffer) {
    accumulator.visibleBuffer = ''
    return
  }

  appendVisibleText(state, params, accumulator, accumulator.visibleBuffer)
  accumulator.visibleBuffer = ''
}

function appendVisibleText(
  state: ActiveGenerationStream,
  params: StartCopilotEditorAgentStreamParams,
  accumulator: CopilotEditorStreamAccumulator,
  nextText: string
): void {
  if (!nextText) {
    return
  }

  accumulator.visibleText += nextText
  syncVisibleContent(state, params, accumulator.visibleText)
}

function syncVisibleContent(
  state: ActiveGenerationStream,
  params: StartCopilotEditorAgentStreamParams,
  content: string
): void {
  state.answerText = content
  params.repository.updateMessageContent(state.messageId, content)
  state.sender.send('orchestflowGenerationEditor:stream', {
    type: 'content-replace',
    requestId: state.requestId,
    sessionId: state.sessionId,
    channelKey: state.channelKey,
    messageId: state.messageId,
    content
  })
}

function buildCopilotMetaPayload(params: {
  documentId: string
  mode: OFPlanningCommandMode
  commandDsl: string
  commands: ReturnType<typeof parseOFPlanningCommandDsl>['commands']
  status: 'noop' | 'pending' | 'applied' | 'failed'
  errorMessage: string | null
}): GenerationMessageMetaPayload {
  return {
    mode: 'continue',
    copilotEditBlock: {
      kind: 'planning-edit',
      documentId: params.documentId,
      mode: params.mode,
      commandDsl: params.commandDsl,
      commands: params.commands,
      status: params.status,
      affectedSectionKeys: listAffectedOFPlanningSectionKeys(params.commands),
      sectionDecisionByKey: Object.fromEntries(
        listAffectedOFPlanningSectionKeys(params.commands).map((sectionKey) => [
          sectionKey,
          params.status === 'applied'
            ? 'applied'
            : params.status === 'rejected'
              ? 'rejected'
              : 'pending'
        ])
      ),
      errorMessage: params.errorMessage
    }
  }
}

function emitStreamStart(state: ActiveGenerationStream): void {
  state.sender.send('orchestflowGenerationEditor:stream', {
    type: 'stream-start',
    requestId: state.requestId,
    sessionId: state.sessionId,
    channelKey: state.channelKey,
    messageId: state.messageId
  })
}

function finishStream(
  state: ActiveGenerationStream,
  params: StartCopilotEditorAgentStreamParams,
  finishReason: 'stop' | 'aborted' | 'error',
  usage?: Record<string, unknown>,
  raw?: {
    rawResponseText: string
    rawTrace: unknown[]
  }
): void {
  const status =
    finishReason === 'stop' ? 'final' : finishReason === 'aborted' ? 'aborted' : 'error'

  params.repository.finishMessage({
    messageId: state.messageId,
    content: state.answerText,
    status,
    usage,
    rawResponseText: params.persistRawLlmData ? (raw?.rawResponseText ?? null) : null,
    rawTrace: params.persistRawLlmData ? (raw?.rawTrace ?? []) : null
  })
  params.repository.touchSession(state.sessionId)

  state.sender.send('orchestflowGenerationEditor:stream', {
    type: 'finish',
    requestId: state.requestId,
    sessionId: state.sessionId,
    channelKey: state.channelKey,
    messageId: state.messageId,
    finishReason,
    usageJson: usage ? JSON.stringify(usage) : null
  })

  params.activeStreams.delete(state.requestId)
}

function mergeMessageMeta(
  currentMetaJson: string | null | undefined,
  patch: GenerationMessageMetaPayload
): GenerationMessageMetaPayload {
  if (!currentMetaJson) {
    return patch
  }

  try {
    return {
      ...(JSON.parse(currentMetaJson) as GenerationMessageMetaPayload),
      ...patch
    }
  } catch {
    return patch
  }
}
