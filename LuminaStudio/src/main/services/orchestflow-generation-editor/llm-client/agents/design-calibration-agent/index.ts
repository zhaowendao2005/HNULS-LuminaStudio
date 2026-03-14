import { createHash } from 'crypto'
import {
  buildOFBlueprintDiagnosticSignature,
  compileOFBlueprintTextDsl,
  type OFBlueprintTextDiagnostic
} from '@shared/Orchestraflow-types'
import { logger } from '@main/services/logger'
import type {
  GenerationDesignCalibrationBlockPayload,
  GenerationMessageMetaPayload
} from '@preload/types'
import { streamChatByProtocol } from '../../generation-stream-runner'
import type { ActiveGenerationStream } from '../../../types/stream.types'
import { buildDesignCalibrationPassContextBundle } from './context-builder'
import {
  DESIGN_CALIBRATION_DSL_END_MARKER,
  DESIGN_CALIBRATION_DSL_START_MARKER,
  extractVisibleTextAndReplacementDsl
} from './dsl'
import { buildDesignCalibrationAgentPrompt } from './prompt'
import { buildDesignCalibrationProposal, validateDesignCalibrationModelResult } from './result'
import type { DesignCalibrationModelResult, StartDesignCalibrationAgentStreamParams } from './types'

const log = logger.scope('DesignCalibrationAgent')
const MAX_CALIBRATION_PASSES = 8

export function startDesignCalibrationAgentStream(
  params: StartDesignCalibrationAgentStreamParams
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
  void runDesignCalibrationAgent(streamState, params)
}

async function runDesignCalibrationAgent(
  state: ActiveGenerationStream,
  params: StartDesignCalibrationAgentStreamParams
): Promise<void> {
  const initialCompile = compileOFBlueprintTextDsl(params.designDocument.content)
  let currentDsl = params.designDocument.content
  let currentDiagnostics = initialCompile.diagnostics
  let currentVisibleSummary = '已开始校准当前规划设计稿。'
  let lastSignature = buildDiagnosticSignatureDigest(currentDiagnostics)
  let stagnantRounds = 0
  const aggregatedRawTexts: string[] = []
  const aggregatedRawTrace: unknown[] = []
  let aggregatedUsage: Record<string, unknown> | undefined
  let truncatedTailDiscarded = false

  try {
    emitStreamStart(state)
    state.answerText = currentVisibleSummary
    params.repository.updateMessageContent(state.messageId, state.answerText)

    if (!currentDiagnostics.length) {
      const meta = buildCalibrationMetaPayload({
        designDocumentId: params.designDocument.id,
        status: 'failed',
        totalDiagnosticCount: 0,
        remainingDiagnosticCount: 0,
        currentPass: 0,
        maxPasses: MAX_CALIBRATION_PASSES,
        phaseLabel: '当前版本没有可修复的 diagnostics',
        canAbort: false,
        summary: '当前版本没有 diagnostics，无需校准。',
        truncatedTailDiscarded: false,
        errorMessage: '当前版本没有 diagnostics，无需校准。'
      })
      pushMessageMeta(state, params, meta)
      finishStream(state, params, 'stop', aggregatedUsage, {
        rawResponseText: state.answerText,
        rawTrace: []
      })
      return
    }

    for (let pass = 1; pass <= MAX_CALIBRATION_PASSES; pass += 1) {
      pushMessageMeta(
        state,
        params,
        buildCalibrationMetaPayload({
          designDocumentId: params.designDocument.id,
          status: 'streaming',
          totalDiagnosticCount: initialCompile.diagnostics.length,
          remainingDiagnosticCount: currentDiagnostics.length,
          currentPass: pass,
          maxPasses: MAX_CALIBRATION_PASSES,
          phaseLabel: `第 ${pass} 轮校准中`,
          canAbort: true,
          summary: currentVisibleSummary,
          truncatedTailDiscarded,
          errorMessage: null
        })
      )

      const context = buildDesignCalibrationPassContextBundle({
        designDocument: params.designDocument,
        workingDsl: currentDsl,
        diagnostics: currentDiagnostics,
        contextBudgetChars: params.contextBudgetChars
      })

      const modelResult = await runModelOnce(
        state,
        params,
        currentDsl,
        currentDiagnostics,
        context,
        pass
      )
      aggregatedRawTexts.push(modelResult.rawText)
      aggregatedRawTrace.push(...modelResult.rawTrace)
      aggregatedUsage = modelResult.usage || aggregatedUsage
      truncatedTailDiscarded = truncatedTailDiscarded || modelResult.truncatedTailDiscarded

      const validated = validateDesignCalibrationModelResult({
        result: modelResult,
        currentContentHash: buildContentHash(currentDsl)
      })

      if (!validated.isValid) {
        stagnantRounds += 1
        currentVisibleSummary =
          validated.visibleText || validated.validationError || currentVisibleSummary
        if (stagnantRounds >= 2) {
          break
        }
        continue
      }

      const nextSignature = buildDiagnosticSignatureDigest(validated.diagnostics)
      const improved =
        validated.diagnostics.length < currentDiagnostics.length ||
        (validated.diagnostics.length === currentDiagnostics.length &&
          nextSignature !== lastSignature)

      currentVisibleSummary = validated.visibleText || currentVisibleSummary
      if (improved) {
        currentDsl = validated.replacementDsl
        currentDiagnostics = validated.diagnostics
        lastSignature = nextSignature
        stagnantRounds = 0
      } else {
        stagnantRounds += 1
      }

      if (!currentDiagnostics.length) {
        break
      }
      if (stagnantRounds >= 2) {
        break
      }
    }

    state.answerText =
      currentVisibleSummary || `校准完成，剩余 diagnostics ${currentDiagnostics.length} 条。`
    params.repository.updateMessageContent(state.messageId, state.answerText)

    if (currentDsl === params.designDocument.content) {
      const meta = buildCalibrationMetaPayload({
        designDocumentId: params.designDocument.id,
        status: 'failed',
        totalDiagnosticCount: initialCompile.diagnostics.length,
        remainingDiagnosticCount: currentDiagnostics.length,
        currentPass: MAX_CALIBRATION_PASSES,
        maxPasses: MAX_CALIBRATION_PASSES,
        phaseLabel: '未产出可接受的修复提案',
        canAbort: false,
        summary: state.answerText,
        truncatedTailDiscarded,
        errorMessage: '校准没有生成可接受的修复结果。'
      })
      pushMessageMeta(state, params, meta)
      finishStream(state, params, 'stop', aggregatedUsage, {
        rawResponseText: aggregatedRawTexts.join('\n\n===== PASS =====\n\n'),
        rawTrace: aggregatedRawTrace
      })
      return
    }

    const proposal = buildDesignCalibrationProposal({
      baseContentHash: buildContentHash(params.designDocument.content),
      summary: state.answerText,
      replacementDsl: currentDsl,
      totalDiagnostics: initialCompile.diagnostics,
      remainingDiagnostics: currentDiagnostics,
      truncatedTailDiscarded
    })

    const pendingMeta = buildCalibrationMetaPayload({
      designDocumentId: params.designDocument.id,
      status: 'pending',
      totalDiagnosticCount: initialCompile.diagnostics.length,
      remainingDiagnosticCount: currentDiagnostics.length,
      currentPass: MAX_CALIBRATION_PASSES,
      maxPasses: MAX_CALIBRATION_PASSES,
      phaseLabel: '已生成修复提案，等待审阅',
      canAbort: false,
      summary: state.answerText,
      truncatedTailDiscarded,
      proposal,
      errorMessage: null
    })

    pushMessageMeta(state, params, pendingMeta)
    finishStream(state, params, 'stop', aggregatedUsage, {
      rawResponseText: aggregatedRawTexts.join('\n\n===== PASS =====\n\n'),
      rawTrace: aggregatedRawTrace
    })
  } catch (error) {
    const typedError = error as { name?: string; message?: string }
    if (typedError?.name === 'AbortError') {
      pushMessageMeta(
        state,
        params,
        buildCalibrationMetaPayload({
          designDocumentId: params.designDocument.id,
          status: 'aborted',
          totalDiagnosticCount: initialCompile.diagnostics.length,
          remainingDiagnosticCount: currentDiagnostics.length,
          currentPass: 0,
          maxPasses: MAX_CALIBRATION_PASSES,
          phaseLabel: '校准已中断',
          canAbort: false,
          summary: '校准已中断。',
          truncatedTailDiscarded,
          errorMessage: null
        })
      )
      finishStream(state, params, 'aborted', aggregatedUsage, {
        rawResponseText: aggregatedRawTexts.join('\n\n===== PASS =====\n\n'),
        rawTrace: aggregatedRawTrace
      })
      return
    }

    log.error('Design calibration agent failed', error, {
      requestId: state.requestId,
      sessionId: state.sessionId,
      channelKey: state.channelKey,
      designDocumentId: params.designDocument.id,
      providerId: params.providerId,
      modelId: params.modelId
    })

    params.repository.markMessageError(
      state.messageId,
      typedError?.message || 'Design calibration agent failed'
    )

    pushMessageMeta(
      state,
      params,
      buildCalibrationMetaPayload({
        designDocumentId: params.designDocument.id,
        status: 'failed',
        totalDiagnosticCount: initialCompile.diagnostics.length,
        remainingDiagnosticCount: currentDiagnostics.length,
        currentPass: 0,
        maxPasses: MAX_CALIBRATION_PASSES,
        phaseLabel: '校准失败',
        canAbort: false,
        summary: state.answerText || '校准失败。',
        truncatedTailDiscarded,
        errorMessage: typedError?.message || 'Design calibration agent failed'
      })
    )

    finishStream(state, params, 'error', aggregatedUsage, {
      rawResponseText: aggregatedRawTexts.join('\n\n===== PASS =====\n\n'),
      rawTrace: aggregatedRawTrace
    })
  }
}

async function runModelOnce(
  state: ActiveGenerationStream,
  params: StartDesignCalibrationAgentStreamParams,
  workingDsl: string,
  diagnostics: OFBlueprintTextDiagnostic[],
  context: ReturnType<typeof buildDesignCalibrationPassContextBundle>,
  pass: number
): Promise<DesignCalibrationModelResult> {
  const messages = [
    {
      role: 'system' as const,
      content: buildDesignCalibrationAgentPrompt()
    },
    {
      role: 'user' as const,
      content: [
        `design_document_id=${params.designDocument.id}`,
        `pass=${pass}`,
        `context_budget_chars=${params.contextBudgetChars}`,
        '',
        '## 设计快照摘要',
        context.planningSnapshotText,
        '',
        '## 全部剩余 diagnostics 摘要',
        context.diagnosticsSummaryText,
        '',
        '## 当前这一轮优先错误',
        context.targetDiagnosticsText,
        '',
        '## 相关 DSL 上下文',
        context.dslContextText,
        '',
        '## Canonical Prompt Source',
        context.promptSourceText,
        '',
        '## 当前完整 DSL',
        workingDsl.length <= params.contextBudgetChars
          ? workingDsl
          : '(完整 DSL 已超预算，本轮只提供相关 excerpt)',
        '',
        '## 任务',
        '请输出一份修复后的完整 OFT/1 DSL，优先修复当前这一轮错误，同时不要破坏其它已正确部分。',
        '如果末尾可能超长，请优先保证 DSL 主体完整，不要输出额外解释。',
        '',
        '## 当前用户输入',
        params.userMessage
      ].join('\n')
    }
  ]

  pushMessageMeta(
    state,
    params,
    mergeCalibrationMeta(params.repository.getMessageById(state.messageId)?.meta_json, {
      llmRequest: {
        messages
      }
    })
  )

  let rawText = ''
  const result = await streamChatByProtocol({
    protocol: params.protocol,
    vendor: params.vendor,
    modelId: params.modelId,
    apiKey: params.apiKey,
    baseUrl: params.baseUrl,
    defaultHeaders: params.defaultHeaders,
    signal: state.abortController.signal,
    messages,
    onTextDelta: (delta) => {
      rawText += delta
    }
  })

  const extracted = extractVisibleTextAndReplacementDsl(rawText)
  return {
    rawText,
    visibleText: extracted.visibleText,
    replacementDsl: extracted.replacementDsl,
    usage: result.usage,
    rawTrace: result.rawTrace,
    truncatedTailDiscarded: extracted.truncatedTailDiscarded
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

function pushMessageMeta(
  state: ActiveGenerationStream,
  params: StartDesignCalibrationAgentStreamParams,
  meta: GenerationMessageMetaPayload
): void {
  const metaJson = JSON.stringify(meta)
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

function finishStream(
  state: ActiveGenerationStream,
  params: StartDesignCalibrationAgentStreamParams,
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

function buildCalibrationMetaPayload(params: {
  designDocumentId: string
  status: GenerationDesignCalibrationBlockPayload['status']
  totalDiagnosticCount: number
  remainingDiagnosticCount: number
  currentPass: number
  maxPasses: number
  phaseLabel: string
  canAbort: boolean
  summary: string
  truncatedTailDiscarded: boolean
  proposal?: GenerationDesignCalibrationBlockPayload['proposal']
  errorMessage?: string | null
}): GenerationMessageMetaPayload {
  return {
    designCalibrationBlock: {
      kind: 'design-calibration',
      designDocumentId: params.designDocumentId,
      status: params.status,
      totalDiagnosticCount: params.totalDiagnosticCount,
      remainingDiagnosticCount: params.remainingDiagnosticCount,
      currentPass: params.currentPass,
      maxPasses: params.maxPasses,
      phaseLabel: params.phaseLabel,
      canAbort: params.canAbort,
      summary: params.summary,
      truncatedTailDiscarded: params.truncatedTailDiscarded,
      proposal: params.proposal || null,
      errorMessage: params.errorMessage || null
    }
  }
}

function mergeCalibrationMeta(
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

function buildContentHash(content: string): string {
  return createHash('sha1').update(content).digest('hex')
}

function buildDiagnosticSignatureDigest(diagnostics: OFBlueprintTextDiagnostic[]): string {
  return diagnostics.map(buildOFBlueprintDiagnosticSignature).join('||')
}
