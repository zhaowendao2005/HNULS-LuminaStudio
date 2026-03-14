import {
  compileOFBlueprintTextDsl,
  type OFBlueprintTextDiagnostic
} from '@shared/Orchestraflow-types'
import { logger } from '@main/services/logger'
import type {
  GenerationDesignBlueprintBlockPayload,
  GenerationDesignDocument,
  GenerationDesignGenerationMode,
  GenerationMessageMetaPayload
} from '@preload/types'
import { streamChatByProtocol } from '../../generation-stream-runner'
import type { ActiveGenerationStream } from '../../../types/stream.types'
import { buildDesignBlueprintContextBundle } from './context-builder'
import { buildDesignBlueprintPromptMessages } from './prompt'
import type { StartDesignBlueprintAgentStreamParams } from './types'

const log = logger.scope('DesignBlueprintAgent')

export * from './types'
export * from './prompt'
export * from './context-builder'

export function startDesignBlueprintAgentStream(
  params: StartDesignBlueprintAgentStreamParams
): void {
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
  void runDesignBlueprintAgent(streamState, params)
}

async function runDesignBlueprintAgent(
  state: ActiveGenerationStream,
  params: StartDesignBlueprintAgentStreamParams
): Promise<void> {
  const generationMode: GenerationDesignGenerationMode = params.designDocument.content.trim()
    ? 'regenerate'
    : 'generate'

  try {
    emitStreamStart(state)

    const context = buildDesignBlueprintContextBundle({
      repository: params.repository,
      designDocumentId: params.designDocument.id
    })

    const promptMessages = buildDesignBlueprintPromptMessages({
      designDocumentId: params.designDocument.id,
      generationMode,
      context,
      userMessage: params.userMessage
    })

    updateMessageMeta(state, params, {
      ...buildDesignBlueprintMeta({
        designDocumentId: params.designDocument.id,
        generationMode,
        status: 'streaming',
        progressPercent: 5,
        phaseLabel: '正在准备规划设计稿生成',
        canAbort: true,
        diagnostics: [],
        errorMessage: null
      }),
      llmRequest: {
        messages: promptMessages
      }
    })

    persistDesignDocument(params, {
      ...params.designDocument,
      status: 'streaming',
      latestGenerationMessageId: state.messageId,
      diagnosticsJson: null
    })

    const result = await streamChatByProtocol({
      protocol: params.protocol,
      vendor: params.vendor,
      modelId: params.modelId,
      apiKey: params.apiKey,
      baseUrl: params.baseUrl,
      defaultHeaders: params.defaultHeaders,
      signal: state.abortController.signal,
      messages: promptMessages,
      onTextDelta: (delta) => {
        handleTextDelta(state, params, delta)
      }
    })

    finalizeDesignBlueprintGeneration(
      state,
      params,
      generationMode,
      'completed',
      result.rawTrace,
      result.usage
    )
  } catch (error) {
    const typedError = error as { name?: string; message?: string }
    if (typedError?.name === 'AbortError') {
      finalizeDesignBlueprintGeneration(state, params, generationMode, 'aborted', [], undefined)
      return
    }

    log.error('Design blueprint agent failed', error, {
      requestId: state.requestId,
      sessionId: state.sessionId,
      channelKey: state.channelKey,
      designDocumentId: params.designDocument.id,
      providerId: params.providerId,
      modelId: params.modelId
    })

    params.repository.markMessageError(
      state.messageId,
      typedError?.message || 'Design blueprint agent failed'
    )

    finalizeDesignBlueprintGeneration(
      state,
      params,
      generationMode,
      'error',
      [],
      undefined,
      typedError?.message || 'Design blueprint agent failed'
    )
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

function handleTextDelta(
  state: ActiveGenerationStream,
  params: StartDesignBlueprintAgentStreamParams,
  delta: string
): void {
  state.answerText += delta
  params.repository.updateMessageContent(state.messageId, state.answerText)
  state.sender.send('orchestflowGenerationEditor:stream', {
    type: 'text-delta',
    requestId: state.requestId,
    sessionId: state.sessionId,
    channelKey: state.channelKey,
    messageId: state.messageId,
    delta
  })
}

function finalizeDesignBlueprintGeneration(
  state: ActiveGenerationStream,
  params: StartDesignBlueprintAgentStreamParams,
  generationMode: GenerationDesignGenerationMode,
  finishReason: 'completed' | 'aborted' | 'error',
  rawTrace: unknown[],
  usage?: Record<string, unknown>,
  errorMessage: string | null = null
): void {
  const compileResult = compileOFBlueprintTextDsl(state.answerText)
  const designStatus =
    finishReason === 'error'
      ? 'error'
      : finishReason === 'aborted'
        ? 'aborted'
        : compileResult.valid
          ? 'valid'
          : 'invalid'
  const metaStatus =
    finishReason === 'error'
      ? 'error'
      : finishReason === 'aborted'
        ? 'aborted'
        : compileResult.valid
          ? 'completed'
          : 'invalid'

  persistDesignDocument(params, {
    ...params.designDocument,
    status: designStatus,
    contentFormat: 'of-blueprint-section-v1',
    content: state.answerText,
    summary: buildDesignDocumentSummary(designStatus, compileResult.diagnostics),
    diagnosticsJson: compileResult.diagnostics.length
      ? JSON.stringify(compileResult.diagnostics)
      : null,
    latestGenerationMessageId: state.messageId
  })

  updateMessageMeta(
    state,
    params,
    buildDesignBlueprintMeta({
      designDocumentId: params.designDocument.id,
      generationMode,
      status: metaStatus,
      progressPercent: 100,
      phaseLabel:
        metaStatus === 'completed'
          ? '规划设计稿生成完成'
          : metaStatus === 'invalid'
            ? '规划设计稿存在错误'
            : metaStatus === 'aborted'
              ? '规划设计稿生成已中断'
              : '规划设计稿生成失败',
      canAbort: false,
      diagnostics: compileResult.diagnostics,
      errorMessage: errorMessage || extractDiagnosticMessage(compileResult.diagnostics)
    })
  )

  finishMessage(state, params, finishReason, usage, {
    rawResponseText: state.answerText,
    rawTrace
  })
}

function persistDesignDocument(
  params: StartDesignBlueprintAgentStreamParams,
  document: GenerationDesignDocument
): void {
  params.repository.saveDesignDocument({
    sessionId: params.sessionId,
    document
  })
}

function updateMessageMeta(
  state: ActiveGenerationStream,
  params: StartDesignBlueprintAgentStreamParams,
  meta: GenerationMessageMetaPayload
): void {
  const currentMeta = params.repository.getMessageById(state.messageId)?.meta_json
  const metaJson = JSON.stringify(mergeMessageMeta(currentMeta, meta))
  params.repository.updateMessageMeta(state.messageId, metaJson)
  state.sender.send('orchestflowGenerationEditor:stream', {
    type: 'message-meta',
    requestId: state.requestId,
    sessionId: state.sessionId,
    channelKey: state.channelKey,
    messageId: state.messageId,
    metaJson
  })
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

function finishMessage(
  state: ActiveGenerationStream,
  params: StartDesignBlueprintAgentStreamParams,
  finishReason: 'completed' | 'aborted' | 'error',
  usage?: Record<string, unknown>,
  raw?: {
    rawResponseText: string
    rawTrace: unknown[]
  }
): void {
  flushPendingTextDelta(state, params)

  const status =
    finishReason === 'completed' ? 'final' : finishReason === 'aborted' ? 'aborted' : 'error'
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
    finishReason: finishReason === 'completed' ? 'stop' : finishReason,
    usageJson: usage ? JSON.stringify(usage) : null
  })

  params.activeStreams.delete(state.requestId)
}
function buildDesignBlueprintMeta(params: {
  designDocumentId: string
  generationMode: GenerationDesignGenerationMode
  status: GenerationDesignBlueprintBlockPayload['status']
  progressPercent: number
  phaseLabel: string
  canAbort: boolean
  diagnostics: OFBlueprintTextDiagnostic[]
  errorMessage: string | null
}): GenerationMessageMetaPayload {
  return {
    designBlueprintBlock: {
      kind: 'design-blueprint-generation',
      designDocumentId: params.designDocumentId,
      generationMode: params.generationMode,
      status: params.status,
      progressPercent: params.progressPercent,
      phaseLabel: params.phaseLabel,
      canAbort: params.canAbort,
      diagnostics: params.diagnostics,
      errorMessage: params.errorMessage
    }
  }
}

function buildDesignDocumentSummary(
  status: GenerationDesignDocument['status'],
  diagnostics: OFBlueprintTextDiagnostic[]
): string {
  if (status === 'valid') {
    return '规划设计稿 DSL 已通过解析与编译校验。'
  }
  if (status === 'streaming') {
    return '规划设计稿 DSL 正在生成中。'
  }
  if (status === 'aborted') {
    return '规划设计稿生成已中断，当前保留残缺 DSL 草稿。'
  }
  if (status === 'error') {
    return '规划设计稿生成失败，请重试。'
  }
  if (diagnostics.length) {
    return `规划设计稿 DSL 存在 ${diagnostics.length} 条校验错误。`
  }
  return '规划设计稿 DSL 尚未生成。'
}

function extractDiagnosticMessage(diagnostics: OFBlueprintTextDiagnostic[]): string | null {
  if (!diagnostics.length) {
    return null
  }
  return diagnostics
    .slice(0, 3)
    .map((item) => `${item.code}: ${item.message}`)
    .join('；')
}
