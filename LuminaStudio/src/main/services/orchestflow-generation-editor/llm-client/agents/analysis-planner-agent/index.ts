import { OF_PLANNING_SECTION_DEFINITIONS } from '@shared/Orchestraflow-types'
import { logger } from '@main/services/logger'
import type {
  GenerationAnalysisPlanningStatus,
  GenerationMessageMetaPayload,
  GenerationPlanningStreamSectionKey
} from '@preload/types'
import { streamChatByProtocol } from '../../generation-stream-runner'
import type { ActiveGenerationStream } from '../../../types/stream.types'
import { buildAnalysisPlannerContextBundle } from './context-builder'
import {
  ANALYSIS_PLANNER_PAYLOAD_END_MARKER,
  ANALYSIS_PLANNER_PAYLOAD_START_MARKER,
  buildAnalysisPlannerPromptMessages
} from './prompt'
import type {
  AnalysisPlannerModelResult,
  AnalysisPlannerRuntimeSignals,
  AnalysisPlannerStructuredResult,
  AnalysisPlanningProgressState,
  StartAnalysisPlannerAgentStreamParams
} from './types'

const log = logger.scope('AnalysisPlannerAgent')

const EXPLICIT_PLANNING_PATTERNS = [
  /开始规划/,
  /进入规划/,
  /制定规划/,
  /做个方案/,
  /给我方案/,
  /开始设计方案/,
  /输出规划/,
  /整理方案/
]

const SECTION_TITLES: Array<{
  key: GenerationPlanningStreamSectionKey
  title: string
  root: 'analysis' | 'design'
}> = OF_PLANNING_SECTION_DEFINITIONS.map((definition) => ({
  key: definition.key,
  title: definition.title,
  root: definition.rootKey
}))

export const analysisPlannerAgent = {
  id: 'analysis-planner-agent',
  label: '需求分析与规划 Agent',
  description: '负责分析需求成熟度，并在时机合适时产出结构化规划 block。'
} as const

interface AnalysisPlannerStreamAccumulator {
  rawText: string
  visibleBuffer: string
  payloadBuffer: string
  hasEnteredPayload: boolean
  lockedAsStructuredOnly: boolean
  lastProgressSignature: string | null
}

export function startAnalysisPlannerAgentStream(
  params: StartAnalysisPlannerAgentStreamParams
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
  void runAnalysisPlannerAgent(streamState, params)
}

async function runAnalysisPlannerAgent(
  state: ActiveGenerationStream,
  params: StartAnalysisPlannerAgentStreamParams
): Promise<void> {
  try {
    emitStreamStart(state)

    const context = buildAnalysisPlannerContextBundle({
      repository: params.repository,
      sessionId: params.sessionId,
      memoryRounds: params.memoryRounds
    })
    const runtimeSignals = buildRuntimeSignals({
      context,
      userMessage: params.userMessage
    })

    const modelResult = await runModelRequest({
      ...params,
      runtimeSignals,
      context,
      signal: state.abortController.signal,
      state
    })
    const structuredResult = normalizeStructuredResult(
      modelResult.rawPayload,
      runtimeSignals,
      state.answerText
    )
    const assistantText = pickAssistantText(structuredResult)

    ensureAssistantTextSynced(state, params, assistantText)

    const metaPayload = buildMessageMetaPayload({
      ...structuredResult,
      protocol: params.protocol,
      vendor: params.vendor
    })
    persistAndEmitMessageMeta(state, params, metaPayload)

    if (structuredResult.mode === 'planning' && metaPayload.planningBlock) {
      const planningDocument = params.repository.getOrCreatePlanningDocumentFromMessage({
        sessionId: params.sessionId,
        messageId: state.messageId
      })
      metaPayload.planningBlock = {
        ...metaPayload.planningBlock,
        documentId: planningDocument.id
      }
      persistAndEmitMessageMeta(state, params, metaPayload)
    }

    finishStream(state, params, 'stop', modelResult.usage, {
      persistRawLlmData: params.persistRawLlmData,
      rawResponseText: modelResult.rawPayload,
      rawTrace: modelResult.rawTrace
    })
  } catch (error) {
    const typedError = error as { name?: string; message?: string }
    if (typedError?.name === 'AbortError') {
      failStreamWithDiscard(state, params, '已停止，本次生成内容已丢弃，可重试。')
      return
    }

    log.error('Analysis planner agent failed', error, {
      requestId: state.requestId,
      sessionId: state.sessionId,
      messageId: state.messageId,
      providerId: params.providerId,
      protocol: params.protocol,
      modelId: params.modelId
    })

    params.repository.markMessageError(
      state.messageId,
      typedError?.message || 'Analysis planner failed'
    )
    state.sender.send('orchestflowGenerationEditor:stream', {
      type: 'error',
      requestId: state.requestId,
      sessionId: state.sessionId,
      channelKey: state.channelKey,
      messageId: state.messageId,
      message: typedError?.message || 'Analysis planner failed'
    })
    finishStream(state, params, 'error', undefined, {
      persistRawLlmData: params.persistRawLlmData,
      rawResponseText: state.answerText,
      rawTrace: []
    })
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

function buildRuntimeSignals(params: {
  context: ReturnType<typeof buildAnalysisPlannerContextBundle>
  userMessage: string
}): AnalysisPlannerRuntimeSignals {
  const readinessSignals: string[] = []
  const explicitPlanningRequested = EXPLICIT_PLANNING_PATTERNS.some((pattern) =>
    pattern.test(params.userMessage)
  )

  if (explicitPlanningRequested) {
    readinessSignals.push('用户显式要求开始规划')
  }
  if (params.context.historyEntries.length >= 4) {
    readinessSignals.push('近几轮对话已经有持续需求澄清')
  }
  if (containsFeatureSignals(params.userMessage)) {
    readinessSignals.push('用户输入包含功能/流程/约束信号')
  }
  if (params.context.latestPlanningBlock) {
    readinessSignals.push('窗口内已有上一版规划，可继续迭代')
  }

  return {
    explicitPlanningRequested,
    readinessSignals
  }
}

function containsFeatureSignals(text: string): boolean {
  return /(功能|流程|节点|输入|输出|约束|审核|审批|变量|工作流|步骤)/.test(text)
}

async function runModelRequest(
  params: StartAnalysisPlannerAgentStreamParams & {
    runtimeSignals: AnalysisPlannerRuntimeSignals
    context: ReturnType<typeof buildAnalysisPlannerContextBundle>
    signal: AbortSignal
    state: ActiveGenerationStream
  }
): Promise<AnalysisPlannerModelResult> {
  let hasLoggedFirstDelta = false

  const accumulator: AnalysisPlannerStreamAccumulator = {
    rawText: '',
    visibleBuffer: '',
    payloadBuffer: '',
    hasEnteredPayload: false,
    lockedAsStructuredOnly: false,
    lastProgressSignature: null
  }

  const messages = buildAnalysisPlannerPromptMessages({
    context: params.context,
    runtimeSignals: params.runtimeSignals,
    userMessage: params.userMessage,
    memoryRounds: params.memoryRounds
  })

  persistAndEmitMessageMeta(params.state, params, {
    llmRequest: {
      messages
    }
  })

  if (params.runtimeSignals.explicitPlanningRequested) {
    emitPlanningProgressMeta(params.state, params, buildEmptyPlanningProgressState())
  }

  const result = await streamChatByProtocol({
    protocol: params.protocol,
    vendor: params.vendor,
    modelId: params.modelId,
    apiKey: params.apiKey,
    baseUrl: params.baseUrl,
    defaultHeaders: params.defaultHeaders,
    messages,
    signal: params.signal,
    onTextDelta: (delta) => {
      if (!hasLoggedFirstDelta) {
        hasLoggedFirstDelta = true
        log.info('Analysis stream receiving started', {
          requestId: params.requestId,
          sessionId: params.sessionId,
          channelKey: params.channelKey,
          providerId: params.providerId,
          protocol: params.protocol,
          sdkVendor: params.vendor,
          baseUrl: params.baseUrl,
          modelId: params.modelId
        })
      }
      consumeModelDelta(params.state, params, accumulator, delta)
    }
  })

  flushRemainingVisibleBuffer(params.state, params, accumulator)
  maybeEmitPlanningProgress(params.state, params, accumulator)

  if (!hasLoggedFirstDelta && !accumulator.payloadBuffer.trim()) {
    throw new Error(
      `Analysis planner received no stream payload. protocol=${params.protocol}, model=${params.modelId}`
    )
  }

  log.info('Analysis stream receiving finished', {
    requestId: params.requestId,
    sessionId: params.sessionId,
    channelKey: params.channelKey,
    providerId: params.providerId,
    protocol: params.protocol,
    sdkVendor: params.vendor,
    baseUrl: params.baseUrl,
    modelId: params.modelId,
    hasReceivedDelta: hasLoggedFirstDelta,
    outputChars: params.state.answerText.length
  })

  return {
    rawPayload: buildNormalizedPayload(accumulator),
    usage: result.usage,
    rawTrace: result.rawTrace
  }
}

function consumeModelDelta(
  state: ActiveGenerationStream,
  params: StartAnalysisPlannerAgentStreamParams,
  accumulator: AnalysisPlannerStreamAccumulator,
  delta: string
): void {
  accumulator.rawText += delta
  accumulator.visibleBuffer += delta

  if (
    !accumulator.hasEnteredPayload &&
    !state.answerText.trim() &&
    !accumulator.lockedAsStructuredOnly
  ) {
    const firstNonWhitespace = accumulator.visibleBuffer.match(/\S/)
    if (firstNonWhitespace?.[0] === 'm' && accumulator.visibleBuffer.startsWith('mode:')) {
      accumulator.lockedAsStructuredOnly = true
      accumulator.payloadBuffer += accumulator.visibleBuffer
      accumulator.visibleBuffer = ''
      maybeEmitPlanningProgress(state, params, accumulator)
      return
    }
  }

  if (accumulator.lockedAsStructuredOnly) {
    accumulator.payloadBuffer += delta
    maybeEmitPlanningProgress(state, params, accumulator)
    return
  }

  while (accumulator.visibleBuffer) {
    if (!accumulator.hasEnteredPayload) {
      const startIndex = accumulator.visibleBuffer.indexOf(ANALYSIS_PLANNER_PAYLOAD_START_MARKER)
      if (startIndex >= 0) {
        const textBeforeMarker = accumulator.visibleBuffer.slice(0, startIndex)
        emitAssistantTextDelta(state, params, textBeforeMarker)
        accumulator.visibleBuffer = accumulator.visibleBuffer.slice(
          startIndex + ANALYSIS_PLANNER_PAYLOAD_START_MARKER.length
        )
        accumulator.hasEnteredPayload = true
        continue
      }

      const safeLength = Math.max(
        0,
        accumulator.visibleBuffer.length - ANALYSIS_PLANNER_PAYLOAD_START_MARKER.length + 1
      )
      if (safeLength === 0) {
        return
      }

      emitAssistantTextDelta(state, params, accumulator.visibleBuffer.slice(0, safeLength))
      accumulator.visibleBuffer = accumulator.visibleBuffer.slice(safeLength)
      return
    }

    const endIndex = accumulator.visibleBuffer.indexOf(ANALYSIS_PLANNER_PAYLOAD_END_MARKER)
    if (endIndex >= 0) {
      accumulator.payloadBuffer += accumulator.visibleBuffer.slice(0, endIndex)
      accumulator.visibleBuffer = accumulator.visibleBuffer.slice(
        endIndex + ANALYSIS_PLANNER_PAYLOAD_END_MARKER.length
      )
      accumulator.hasEnteredPayload = false
      maybeEmitPlanningProgress(state, params, accumulator)
      continue
    }

    const safeLength = Math.max(
      0,
      accumulator.visibleBuffer.length - ANALYSIS_PLANNER_PAYLOAD_END_MARKER.length + 1
    )
    if (safeLength === 0) {
      return
    }

    accumulator.payloadBuffer += accumulator.visibleBuffer.slice(0, safeLength)
    accumulator.visibleBuffer = accumulator.visibleBuffer.slice(safeLength)
    maybeEmitPlanningProgress(state, params, accumulator)
    return
  }
}

function flushRemainingVisibleBuffer(
  state: ActiveGenerationStream,
  params: StartAnalysisPlannerAgentStreamParams,
  accumulator: AnalysisPlannerStreamAccumulator
): void {
  if (accumulator.lockedAsStructuredOnly) {
    return
  }

  if (accumulator.hasEnteredPayload) {
    accumulator.payloadBuffer += accumulator.visibleBuffer
    maybeEmitPlanningProgress(state, params, accumulator)
  } else {
    emitAssistantTextDelta(state, params, accumulator.visibleBuffer)
  }
  accumulator.visibleBuffer = ''
}

function buildNormalizedPayload(accumulator: AnalysisPlannerStreamAccumulator): string {
  if (accumulator.payloadBuffer.trim()) {
    return accumulator.payloadBuffer.trim()
  }
  return accumulator.rawText.trim()
}

function emitAssistantTextDelta(
  state: ActiveGenerationStream,
  params: StartAnalysisPlannerAgentStreamParams,
  delta: string
): void {
  if (!delta) {
    return
  }

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

function maybeEmitPlanningProgress(
  state: ActiveGenerationStream,
  params: StartAnalysisPlannerAgentStreamParams,
  accumulator: AnalysisPlannerStreamAccumulator
): void {
  const progress = buildPlanningProgressState(accumulator.payloadBuffer)
  if (!progress.shouldShowPlanningBlock) {
    return
  }

  const signature = JSON.stringify(progress)
  if (signature === accumulator.lastProgressSignature) {
    return
  }

  accumulator.lastProgressSignature = signature
  emitPlanningProgressMeta(state, params, progress)
}

function buildEmptyPlanningProgressState(): AnalysisPlanningProgressState {
  return {
    shouldShowPlanningBlock: true,
    activeSection: 'analysis-summary',
    completedSectionKeys: [],
    analysisMarkdown: '# 需求分析\n',
    designMarkdown: '# 设计交接\n'
  }
}

export function buildPlanningProgressState(payloadText: string): AnalysisPlanningProgressState {
  const payload = payloadText.trim()
  const mode = extractPayloadScalar(payload, 'mode')
  const body = extractPayloadBody(payload)
  const analysisMarkdown = extractRootMarkdownSection(body, '需求分析')
  const designMarkdown = extractRootMarkdownSection(body, '设计交接')
  const completedSectionKeys = SECTION_TITLES.filter((item) => {
    const markdown = item.root === 'analysis' ? analysisMarkdown : designMarkdown
    return hasMarkdownSubsection(markdown, item.title)
  }).map((item) => item.key)

  const activeSection =
    SECTION_TITLES.find((item) => !completedSectionKeys.includes(item.key))?.key ||
    'design-blueprint-requirements'

  return {
    shouldShowPlanningBlock:
      // planning block 的显隐必须跟随 mode，而不是跟随 planningStatus。
      // continue 协议虽然也会带 planningStatus/固定标题壳，但它只表示“继续澄清”，
      // 不能因为正文里还有 draft/ready 这些控制字段就提前把规划块挂出来。
      mode === 'planning',
    activeSection,
    completedSectionKeys,
    analysisMarkdown: analysisMarkdown || '# 需求分析\n',
    designMarkdown: designMarkdown || '# 设计交接\n'
  }
}

function emitPlanningProgressMeta(
  state: ActiveGenerationStream,
  params: StartAnalysisPlannerAgentStreamParams & {
    runtimeSignals?: AnalysisPlannerRuntimeSignals
  },
  progress: AnalysisPlanningProgressState
): void {
  const metaPayload = createStreamingPlanningMetaPayload({
    protocol: params.protocol,
    vendor: params.vendor,
    trigger: params.runtimeSignals?.explicitPlanningRequested ? 'explicit' : 'auto',
    progress
  })
  persistAndEmitMessageMeta(state, params, metaPayload)
}

function createStreamingPlanningMetaPayload(params: {
  protocol: string
  vendor: string
  trigger: 'explicit' | 'auto'
  progress: AnalysisPlanningProgressState
}): GenerationMessageMetaPayload {
  return {
    vendor: params.vendor as GenerationMessageMetaPayload['vendor'],
    protocol: params.protocol as GenerationMessageMetaPayload['protocol'],
    agentId: analysisPlannerAgent.id,
    mode: 'planning',
    planningBlock: {
      kind: 'analysis-planning',
      version: '2.0',
      agentId: analysisPlannerAgent.id,
      trigger: params.trigger,
      status: 'draft',
      analysisMarkdown: params.progress.analysisMarkdown,
      designMarkdown: params.progress.designMarkdown,
      streamingState: {
        isStreaming: true,
        activeSection: params.progress.activeSection,
        completedSectionKeys: params.progress.completedSectionKeys
      }
    }
  }
}

function persistAndEmitMessageMeta(
  state: ActiveGenerationStream,
  params: StartAnalysisPlannerAgentStreamParams,
  metaPayload: GenerationMessageMetaPayload
): void {
  const currentMeta = params.repository.getMessageById(state.messageId)?.meta_json
  const metaJson = JSON.stringify(mergeMessageMeta(currentMeta, metaPayload))
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

function ensureAssistantTextSynced(
  state: ActiveGenerationStream,
  params: StartAnalysisPlannerAgentStreamParams,
  assistantText: string
): void {
  const normalizedCurrent = normalizeDisplayText(state.answerText)
  const normalizedExpected = normalizeDisplayText(assistantText)

  if (!normalizedExpected) {
    return
  }
  if (normalizedCurrent === normalizedExpected) {
    return
  }

  if (!normalizedCurrent) {
    emitAssistantTextDelta(state, params, assistantText)
    return
  }

  if (normalizedExpected.startsWith(normalizedCurrent)) {
    emitAssistantTextDelta(state, params, assistantText.slice(state.answerText.length))
    return
  }

  state.answerText = assistantText
  params.repository.updateMessageContent(state.messageId, state.answerText)
}

function normalizeDisplayText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function normalizeStructuredResult(
  rawPayload: string,
  runtimeSignals: AnalysisPlannerRuntimeSignals,
  visibleAssistantText: string
): AnalysisPlannerStructuredResult {
  const mode = extractPayloadScalar(rawPayload, 'mode')
  const trigger = extractPayloadScalar(rawPayload, 'trigger')
  const planningStatus = extractPayloadScalar(rawPayload, 'planningStatus')
  const analysisMarkdown = extractRootMarkdownSection(extractPayloadBody(rawPayload), '需求分析')
  const designMarkdown = extractRootMarkdownSection(extractPayloadBody(rawPayload), '设计交接')

  if (mode === 'planning') {
    return {
      mode: 'planning',
      trigger:
        runtimeSignals.explicitPlanningRequested || trigger === 'explicit' ? 'explicit' : 'auto',
      assistantText: extractAssistantSummary(analysisMarkdown),
      planningStatus: planningStatus === 'ready' ? 'ready' : 'draft',
      analysisMarkdown,
      designMarkdown
    }
  }

  if (mode === 'continue') {
    // continue 是合法协议分支：代表模型判断当前信息还不够，
    // 应继续澄清，而不是强行产出 planning block。
    if (runtimeSignals.explicitPlanningRequested) {
      throw new Error(
        'Analysis planner returned mode=continue while explicitPlanningRequested=true.'
      )
    }

    if (!normalizeDisplayText(visibleAssistantText)) {
      throw new Error(
        'Analysis planner returned mode=continue but visible assistant text is empty.'
      )
    }

    return {
      mode: 'continue',
      trigger: trigger === 'explicit' ? 'explicit' : 'auto',
      assistantText: visibleAssistantText
    }
  }

  throw new Error(
    `Analysis planner returned invalid payload. mode=${mode || 'empty'}, expected planning or continue.`
  )
}

function pickAssistantText(result: AnalysisPlannerStructuredResult): string {
  if (result.assistantText) {
    return result.assistantText
  }
  if (result.mode === 'planning') {
    return '我已经先整理出一版需求规划，请看下面的结构化规划块。'
  }
  return ''
}

function buildMessageMetaPayload(params: {
  mode: AnalysisPlannerStructuredResult['mode']
  trigger: AnalysisPlannerStructuredResult['trigger']
  planningStatus?: GenerationAnalysisPlanningStatus
  analysisMarkdown?: string
  designMarkdown?: string
  protocol: string
  vendor: string
}): GenerationMessageMetaPayload {
  const metaPayload: GenerationMessageMetaPayload = {
    vendor: params.vendor as GenerationMessageMetaPayload['vendor'],
    protocol: params.protocol as GenerationMessageMetaPayload['protocol'],
    agentId: analysisPlannerAgent.id,
    mode: params.mode
  }

  if (params.mode === 'planning') {
    metaPayload.planningBlock = {
      kind: 'analysis-planning',
      version: '2.0',
      agentId: analysisPlannerAgent.id,
      trigger: params.trigger,
      status: params.planningStatus || 'draft',
      analysisMarkdown: params.analysisMarkdown || '# 需求分析\n',
      designMarkdown: params.designMarkdown || '# 设计交接\n',
      streamingState: {
        isStreaming: false,
        activeSection: 'design-blueprint-requirements',
        completedSectionKeys: SECTION_TITLES.map((item) => item.key)
      }
    }
  }

  return metaPayload
}

function finishStream(
  state: ActiveGenerationStream,
  params: StartAnalysisPlannerAgentStreamParams,
  finishReason: 'stop' | 'aborted' | 'error',
  usage?: Record<string, unknown>,
  raw?: {
    persistRawLlmData: boolean
    rawResponseText: string
    rawTrace: unknown[]
  }
): void {
  if (state.terminalStateHandled) {
    params.activeStreams.delete(state.requestId)
    return
  }
  state.terminalStateHandled = true

  const status =
    finishReason === 'stop' ? 'final' : finishReason === 'aborted' ? 'aborted' : 'error'

  params.repository.finishMessage({
    messageId: state.messageId,
    content: state.answerText,
    status,
    usage,
    rawResponseText: raw?.persistRawLlmData ? (raw?.rawResponseText ?? null) : null,
    rawTrace: raw?.persistRawLlmData ? (raw?.rawTrace ?? []) : null
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

function failStreamWithDiscard(
  state: ActiveGenerationStream,
  params: StartAnalysisPlannerAgentStreamParams,
  errorMessage: string
): void {
  if (state.terminalStateHandled) {
    params.activeStreams.delete(state.requestId)
    return
  }
  state.terminalStateHandled = true
  state.answerText = ''
  params.repository.discardMessageAsFailed(state.messageId, errorMessage)
  params.repository.touchSession(state.sessionId)
  state.sender.send('orchestflowGenerationEditor:stream', {
    type: 'content-replace',
    requestId: state.requestId,
    sessionId: state.sessionId,
    channelKey: state.channelKey,
    messageId: state.messageId,
    content: ''
  })
  state.sender.send('orchestflowGenerationEditor:stream', {
    type: 'error',
    requestId: state.requestId,
    sessionId: state.sessionId,
    channelKey: state.channelKey,
    messageId: state.messageId,
    message: errorMessage
  })
  state.sender.send('orchestflowGenerationEditor:stream', {
    type: 'finish',
    requestId: state.requestId,
    sessionId: state.sessionId,
    channelKey: state.channelKey,
    messageId: state.messageId,
    finishReason: 'error',
    usageJson: null
  })
  params.activeStreams.delete(state.requestId)
}

function extractPayloadScalar(payload: string, key: string): string {
  const regex = new RegExp(`^${key}:\\s*(.+)$`, 'm')
  return payload.match(regex)?.[1]?.trim() || ''
}

function extractPayloadBody(payload: string): string {
  const dividerIndex = payload.indexOf('---')
  if (dividerIndex < 0) {
    return payload.trim()
  }
  return payload.slice(dividerIndex + 3).trim()
}

function extractRootMarkdownSection(payloadBody: string, title: string): string {
  if (!payloadBody.trim()) {
    return ''
  }

  const lines = payloadBody.split('\n')
  const header = `# ${title}`
  const startIndex = lines.findIndex((line) => line.trim() === header)
  if (startIndex < 0) {
    return ''
  }

  const contentLines: string[] = [header]
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const currentLine = lines[index]
    if (currentLine.startsWith('# ')) {
      break
    }
    contentLines.push(currentLine)
  }

  return contentLines.join('\n').trim()
}

function hasMarkdownSubsection(markdown: string, title: string): boolean {
  if (!markdown.trim()) {
    return false
  }
  const escapedTitle = escapeForRegex(title)
  return new RegExp(`^##\\s+${escapedTitle}\\s*$`, 'm').test(markdown)
}

function extractAssistantSummary(analysisMarkdown: string): string {
  const content = extractMarkdownSubsectionContent(analysisMarkdown, '摘要')
  return content
    .split('\n')
    .map((line) => line.trim().replace(/^-\s*/, ''))
    .filter(Boolean)
    .join(' ')
}

function extractMarkdownSubsectionContent(markdown: string, title: string): string {
  if (!markdown.trim()) {
    return ''
  }

  const lines = markdown.split('\n')
  const header = `## ${title}`
  const startIndex = lines.findIndex((line) => line.trim() === header)
  if (startIndex < 0) {
    return ''
  }

  const contentLines: string[] = []
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const currentLine = lines[index]
    if (currentLine.startsWith('## ') || currentLine.startsWith('# ')) {
      break
    }
    contentLines.push(currentLine)
  }

  return contentLines.join('\n').trim()
}

function escapeForRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
