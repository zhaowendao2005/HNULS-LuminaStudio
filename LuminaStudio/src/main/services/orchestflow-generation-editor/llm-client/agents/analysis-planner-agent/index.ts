import { logger } from '@main/services/logger'
import type {
  GenerationAnalysisPlanningStatus,
  GenerationMessageMetaPayload,
  GenerationPlanningBlockFieldKey,
  GenerationPlanningStreamSectionKey,
  OFRequirementDocument
} from '@preload/types'
import { streamChat } from '../../generation-stream-runner'
import type { ActiveGenerationStream } from '../../../types/stream.types'
import { buildAnalysisPlannerContextBundle } from './context-builder'
import {
  ANALYSIS_PLANNER_JSON_END_MARKER,
  ANALYSIS_PLANNER_JSON_START_MARKER,
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

const ANALYSIS_SECTION_FIELD_KEYS: GenerationPlanningBlockFieldKey[] = [
  'summary',
  'goals',
  'success_criteria',
  'constraints',
  'prohibitions',
  'missingQuestions',
  'readinessSignals'
]

const DESIGN_SECTION_FIELD_KEYS: GenerationPlanningBlockFieldKey[] = [
  'candidate_nodes',
  'input_requirements',
  'output_requirements',
  'human_confirmation_questions',
  'blueprint_requirements'
]

export const analysisPlannerAgent = {
  id: 'analysis-planner-agent',
  label: '需求分析与规划 Agent',
  description: '负责分析需求成熟度，并在时机合适时产出结构化规划 block。'
} as const

interface AnalysisPlannerStreamAccumulator {
  rawText: string
  visibleBuffer: string
  hiddenJsonBuffer: string
  hasEnteredJsonPayload: boolean
  lockedAsStructuredOnly: boolean
  lastProgressSignature: string | null
}

/**
 * analysis planner agent 自己维护上下文、决策和规划 block。
 *
 * 它和普通聊天流的差异是：
 * - 先收集历史上下文
 * - 再让模型返回结构化 JSON
 * - 最后把用户可读文本 + planning block 一起写回消息
 */
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
    const structuredResult = normalizeStructuredResult(modelResult.rawText, runtimeSignals)
    const assistantText = pickAssistantText(structuredResult)

    ensureAssistantTextSynced(state, params, assistantText)

    const metaPayload = buildMessageMetaPayload({
      ...structuredResult,
      protocol: params.protocol,
      vendor: params.vendor
    })
    persistAndEmitMessageMeta(state, params, metaPayload)

    finishStream(state, params, 'stop', modelResult.usage)
  } catch (error) {
    const typedError = error as { name?: string; message?: string }
    if (typedError?.name === 'AbortError') {
      finishStream(state, params, 'aborted')
      return
    }

    log.error('Analysis planner agent failed', error, {
      requestId: state.requestId,
      sessionId: state.sessionId,
      messageId: state.messageId
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
    finishStream(state, params, 'error')
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
  const accumulator: AnalysisPlannerStreamAccumulator = {
    rawText: '',
    visibleBuffer: '',
    hiddenJsonBuffer: '',
    hasEnteredJsonPayload: false,
    lockedAsStructuredOnly: false,
    lastProgressSignature: null
  }
  const messages = buildAnalysisPlannerPromptMessages({
    context: params.context,
    runtimeSignals: params.runtimeSignals,
    userMessage: params.userMessage,
    memoryRounds: params.memoryRounds
  })

  if (params.runtimeSignals.explicitPlanningRequested) {
    const initialProgress = buildPlanningProgressState('{"mode":"planning"}')
    emitPlanningProgressMeta(params.state, params, initialProgress)
  }

  const result = await streamChat({
    vendor: params.vendor,
    modelId: params.modelId,
    apiKey: params.apiKey,
    baseUrl: params.baseUrl,
    messages,
    signal: params.signal,
    onTextDelta: (delta) => {
      consumeModelDelta(params.state, params, accumulator, delta)
    }
  })

  flushRemainingVisibleBuffer(params.state, params, accumulator)
  maybeEmitPlanningProgress(params.state, params, accumulator)

  return {
    rawText: buildNormalizedRawText(accumulator),
    usage: result.usage
  }
}

/**
 * 这里把模型流式输出分成两段：
 * - marker 之前的正文直接流给前端
 * - marker 之间的 JSON 只缓存，不直接展示
 *
 * 如果模型意外一开始就输出 JSON，对用户先隐藏，最后走兜底解析。
 */
function consumeModelDelta(
  state: ActiveGenerationStream,
  params: StartAnalysisPlannerAgentStreamParams,
  accumulator: AnalysisPlannerStreamAccumulator,
  delta: string
): void {
  accumulator.rawText += delta
  accumulator.visibleBuffer += delta

  if (
    !accumulator.hasEnteredJsonPayload &&
    !state.answerText.trim() &&
    !accumulator.lockedAsStructuredOnly
  ) {
    const firstNonWhitespace = accumulator.visibleBuffer.match(/\S/)
    if (firstNonWhitespace?.[0] === '{') {
      accumulator.lockedAsStructuredOnly = true
      accumulator.hiddenJsonBuffer += accumulator.visibleBuffer
      accumulator.visibleBuffer = ''
      maybeEmitPlanningProgress(state, params, accumulator)
      return
    }
  }

  if (accumulator.lockedAsStructuredOnly) {
    accumulator.hiddenJsonBuffer += delta
    maybeEmitPlanningProgress(state, params, accumulator)
    return
  }

  while (accumulator.visibleBuffer) {
    if (!accumulator.hasEnteredJsonPayload) {
      const startIndex = accumulator.visibleBuffer.indexOf(ANALYSIS_PLANNER_JSON_START_MARKER)
      if (startIndex >= 0) {
        const textBeforeMarker = accumulator.visibleBuffer.slice(0, startIndex)
        emitAssistantTextDelta(state, params, textBeforeMarker)
        accumulator.visibleBuffer = accumulator.visibleBuffer.slice(
          startIndex + ANALYSIS_PLANNER_JSON_START_MARKER.length
        )
        accumulator.hasEnteredJsonPayload = true
        continue
      }

      const safeLength = Math.max(
        0,
        accumulator.visibleBuffer.length - ANALYSIS_PLANNER_JSON_START_MARKER.length + 1
      )
      if (safeLength === 0) {
        return
      }

      emitAssistantTextDelta(state, params, accumulator.visibleBuffer.slice(0, safeLength))
      accumulator.visibleBuffer = accumulator.visibleBuffer.slice(safeLength)
      return
    }

    const endIndex = accumulator.visibleBuffer.indexOf(ANALYSIS_PLANNER_JSON_END_MARKER)
    if (endIndex >= 0) {
      accumulator.hiddenJsonBuffer += accumulator.visibleBuffer.slice(0, endIndex)
      accumulator.visibleBuffer = accumulator.visibleBuffer.slice(
        endIndex + ANALYSIS_PLANNER_JSON_END_MARKER.length
      )
      accumulator.hasEnteredJsonPayload = false
      maybeEmitPlanningProgress(state, params, accumulator)
      continue
    }

    const safeLength = Math.max(
      0,
      accumulator.visibleBuffer.length - ANALYSIS_PLANNER_JSON_END_MARKER.length + 1
    )
    if (safeLength === 0) {
      return
    }

    accumulator.hiddenJsonBuffer += accumulator.visibleBuffer.slice(0, safeLength)
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

  if (accumulator.hasEnteredJsonPayload) {
    accumulator.hiddenJsonBuffer += accumulator.visibleBuffer
    maybeEmitPlanningProgress(state, params, accumulator)
  } else {
    emitAssistantTextDelta(state, params, accumulator.visibleBuffer)
  }
  accumulator.visibleBuffer = ''
}

function buildNormalizedRawText(accumulator: AnalysisPlannerStreamAccumulator): string {
  if (accumulator.hiddenJsonBuffer.trim()) {
    return accumulator.hiddenJsonBuffer.trim()
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
  const progress = buildPlanningProgressState(accumulator.hiddenJsonBuffer)
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

function emitPlanningProgressMeta(
  state: ActiveGenerationStream,
  params: StartAnalysisPlannerAgentStreamParams,
  progress: AnalysisPlanningProgressState
): void {
  const metaPayload = createStreamingPlanningMetaPayload({
    protocol: params.protocol,
    vendor: params.vendor,
    trigger: params.runtimeSignals.explicitPlanningRequested ? 'explicit' : 'auto',
    readinessSignals: params.runtimeSignals.readinessSignals,
    progress
  })
  persistAndEmitMessageMeta(state, params, metaPayload)
}

function createStreamingPlanningMetaPayload(params: {
  protocol: string
  vendor: string
  trigger: 'explicit' | 'auto'
  readinessSignals: string[]
  progress: AnalysisPlanningProgressState
}): GenerationMessageMetaPayload {
  return {
    vendor: params.vendor as GenerationMessageMetaPayload['vendor'],
    protocol: params.protocol as GenerationMessageMetaPayload['protocol'],
    agentId: analysisPlannerAgent.id,
    mode: 'planning',
    planningBlock: {
      kind: 'analysis-planning',
      version: '1.0',
      agentId: analysisPlannerAgent.id,
      trigger: params.trigger,
      status: 'draft',
      summary: params.progress.completedFieldKeys.includes('summary')
        ? '正在整理本轮规划摘要...'
        : '正在生成需求分析与设计交接规划... ',
      readinessSignals: params.progress.completedFieldKeys.includes('readinessSignals')
        ? params.readinessSignals
        : [],
      missingQuestions: [],
      requirementDocument: createEmptyRequirementDocument(),
      streamingState: {
        isStreaming: true,
        activeSection: params.progress.activeSection,
        completedFieldKeys: params.progress.completedFieldKeys
      }
    }
  }
}

function persistAndEmitMessageMeta(
  state: ActiveGenerationStream,
  params: StartAnalysisPlannerAgentStreamParams,
  metaPayload: GenerationMessageMetaPayload
): void {
  const metaJson = JSON.stringify(metaPayload)
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

function buildPlanningProgressState(rawJsonText: string): AnalysisPlanningProgressState {
  const normalized = repairCommonJsonTypos(normalizeJsonCandidate(rawJsonText))
  const shouldShowPlanningBlock = /"mode"\s*:\s*"planning"/.test(normalized)

  const completedFieldKeys: GenerationPlanningBlockFieldKey[] = []
  const keyPatterns: Record<GenerationPlanningBlockFieldKey, RegExp> = {
    summary: /"summary"\s*:/,
    goals: /"goals"\s*:/,
    success_criteria: /"success_criteria"\s*:/,
    constraints: /"constraints"\s*:/,
    prohibitions: /"prohibitions"\s*:/,
    missingQuestions: /"missingQuestions"\s*:/,
    readinessSignals: /"readinessSignals"\s*:/,
    candidate_nodes: /"candidate_nodes"\s*:/,
    input_requirements: /"input_requirements"\s*:/,
    output_requirements: /"output_requirements"\s*:/,
    human_confirmation_questions: /"human_confirmation_questions"\s*:/,
    blueprint_requirements: /"blueprint_requirements"\s*:*/
  }

  ;(
    [
      ...ANALYSIS_SECTION_FIELD_KEYS,
      ...DESIGN_SECTION_FIELD_KEYS
    ] as GenerationPlanningBlockFieldKey[]
  ).forEach((fieldKey) => {
    if (keyPatterns[fieldKey].test(normalized)) {
      completedFieldKeys.push(fieldKey)
    }
  })

  const completedAnalysisCount = completedFieldKeys.filter((fieldKey) =>
    ANALYSIS_SECTION_FIELD_KEYS.includes(fieldKey)
  ).length
  const activeSection: GenerationPlanningStreamSectionKey =
    completedAnalysisCount < ANALYSIS_SECTION_FIELD_KEYS.length ? 'analysis' : 'design'

  return {
    shouldShowPlanningBlock,
    completedFieldKeys,
    activeSection
  }
}

/**
 * 正常情况下 assistantText 会在流中已经展示完。
 * 这里只在模型没有按 marker 协议输出，或正文与最终解析结果不一致时做兜底补齐。
 */
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
  rawText: string,
  runtimeSignals: AnalysisPlannerRuntimeSignals
): AnalysisPlannerStructuredResult {
  const parsed = extractJSONObject(rawText)
  if (!parsed) {
    return {
      mode: 'continue',
      trigger: runtimeSignals.explicitPlanningRequested ? 'explicit' : 'auto',
      assistantText:
        rawText.trim() || '我先继续帮你澄清需求，请再补充一下关键目标、输入和预期输出。',
      readinessSignals: runtimeSignals.readinessSignals
    }
  }

  const mode = parsed.mode === 'planning' ? 'planning' : 'continue'
  const trigger = runtimeSignals.explicitPlanningRequested
    ? 'explicit'
    : parsed.trigger === 'explicit'
      ? 'explicit'
      : 'auto'
  const assistantText =
    typeof parsed.assistantText === 'string' && parsed.assistantText.trim()
      ? parsed.assistantText.trim()
      : ''

  return {
    mode,
    trigger,
    assistantText,
    planningStatus: normalizePlanningStatus(parsed.planningStatus, mode),
    summary: toNonEmptyString(parsed.summary),
    requirementDocument: normalizeRequirementDocument(parsed.requirementDocument),
    missingQuestions: normalizeStringArray(parsed.missingQuestions),
    readinessSignals: normalizeStringArray(parsed.readinessSignals, runtimeSignals.readinessSignals)
  }
}

function pickAssistantText(result: AnalysisPlannerStructuredResult): string {
  if (result.assistantText) {
    return result.assistantText
  }
  if (result.mode === 'planning') {
    return result.summary || '我已经先整理出一版需求规划，请看下面的结构化规划块。'
  }
  return '我先继续帮你补齐需求关键信息，再进入规划。'
}

function buildMessageMetaPayload(params: {
  mode: AnalysisPlannerStructuredResult['mode']
  trigger: AnalysisPlannerStructuredResult['trigger']
  planningStatus?: GenerationAnalysisPlanningStatus
  summary?: string
  requirementDocument?: OFRequirementDocument
  missingQuestions?: string[]
  readinessSignals?: string[]
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
      version: '1.0',
      agentId: analysisPlannerAgent.id,
      trigger: params.trigger,
      status: params.planningStatus || 'draft',
      summary: params.summary || '已生成一版规划摘要。',
      readinessSignals: params.readinessSignals || [],
      missingQuestions: params.missingQuestions || [],
      requirementDocument: params.requirementDocument || createEmptyRequirementDocument(),
      streamingState: {
        isStreaming: false,
        activeSection: 'design',
        completedFieldKeys: [...ANALYSIS_SECTION_FIELD_KEYS, ...DESIGN_SECTION_FIELD_KEYS]
      }
    }
  }

  return metaPayload
}

function finishStream(
  state: ActiveGenerationStream,
  params: StartAnalysisPlannerAgentStreamParams,
  finishReason: 'stop' | 'aborted' | 'error',
  usage?: Record<string, unknown>
): void {
  const status =
    finishReason === 'stop' ? 'final' : finishReason === 'aborted' ? 'aborted' : 'error'

  params.repository.finishMessage({
    messageId: state.messageId,
    content: state.answerText,
    status,
    usage
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

function extractJSONObject(rawText: string): Record<string, unknown> | null {
  const markerWrapped = extractMarkedJsonBlock(rawText)
  if (markerWrapped) {
    return safeParseJSONObject(markerWrapped)
  }

  const cleaned = normalizeJsonCandidate(rawText)
  const firstBraceIndex = cleaned.indexOf('{')
  const lastBraceIndex = cleaned.lastIndexOf('}')

  if (firstBraceIndex < 0 || lastBraceIndex <= firstBraceIndex) {
    return null
  }

  const candidate = cleaned.slice(firstBraceIndex, lastBraceIndex + 1)
  return safeParseJSONObject(candidate)
}

function extractMarkedJsonBlock(rawText: string): string | null {
  const startIndex = rawText.indexOf(ANALYSIS_PLANNER_JSON_START_MARKER)
  const endIndex = rawText.lastIndexOf(ANALYSIS_PLANNER_JSON_END_MARKER)

  if (startIndex < 0 || endIndex <= startIndex) {
    return null
  }

  return rawText.slice(startIndex + ANALYSIS_PLANNER_JSON_START_MARKER.length, endIndex).trim()
}

function safeParseJSONObject(candidate: string): Record<string, unknown> | null {
  const normalizedCandidate = normalizeJsonCandidate(candidate)
  try {
    return JSON.parse(normalizedCandidate) as Record<string, unknown>
  } catch {
    try {
      return JSON.parse(repairCommonJsonTypos(normalizedCandidate)) as Record<string, unknown>
    } catch {
      return null
    }
  }
}

function normalizeJsonCandidate(text: string): string {
  return text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
}

/**
 * 模型偶发会把中文引号、中文逗号之类混进 JSON。
 * 这里做一层非常保守的修复，只处理高频标点，不主动改字段结构。
 */
function repairCommonJsonTypos(text: string): string {
  return text.replace(/[“”]/g, '"').replace(/[‘’]/g, '"').replace(/，/g, ',').replace(/：/g, ':')
}

function normalizePlanningStatus(
  value: unknown,
  mode: AnalysisPlannerStructuredResult['mode']
): GenerationAnalysisPlanningStatus | undefined {
  if (mode !== 'planning') {
    return undefined
  }
  return value === 'ready' ? 'ready' : 'draft'
}

function normalizeRequirementDocument(value: unknown): OFRequirementDocument | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const record = value as Record<string, unknown>
  return {
    goals: normalizeStringArray(record.goals),
    success_criteria: normalizeStringArray(record.success_criteria),
    constraints: normalizeStringArray(record.constraints),
    candidate_nodes: Array.isArray(record.candidate_nodes)
      ? record.candidate_nodes
          .filter(
            (item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object'
          )
          .map((item) => ({
            type: String(item.type || ''),
            reason: String(item.reason || '')
          }))
          .filter((item) => item.type && item.reason)
      : [],
    prohibitions: normalizeStringArray(record.prohibitions),
    human_confirmation_questions: normalizeStringArray(record.human_confirmation_questions),
    input_requirements: normalizeStringArray(record.input_requirements),
    output_requirements: normalizeStringArray(record.output_requirements),
    blueprint_requirements: normalizeStringArray(record.blueprint_requirements)
  }
}

function normalizeStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) {
    return fallback
  }
  return value.map((item) => String(item || '').trim()).filter((item) => Boolean(item))
}

function toNonEmptyString(value: unknown): string | undefined {
  const text = String(value || '').trim()
  return text || undefined
}

function createEmptyRequirementDocument(): OFRequirementDocument {
  return {
    goals: [],
    success_criteria: [],
    constraints: [],
    candidate_nodes: [],
    prohibitions: [],
    human_confirmation_questions: [],
    input_requirements: [],
    output_requirements: [],
    blueprint_requirements: []
  }
}
