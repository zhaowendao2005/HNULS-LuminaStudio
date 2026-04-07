import type {
  NormalChatActionRunSnapshot,
  NormalChatTaskDetail,
  NormalChatModelCallSnapshot
} from '@preload/types'
import type {
  ChatDetailShellDocGroup,
  ChatDetailShellDocItem,
  ChatDetailShellFunctioncallItem,
  ChatDetailShellRecord,
  ChatDetailShellSnapshot
} from './chat-detail-shell.types'

function unwrap<T>(response: { success: boolean; data?: T; error?: string }): T {
  if (!response.success) {
    throw new Error(response.error || 'Normal chat detail shell request failed')
  }

  return response.data as T
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) {
    return fallback
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function createEmptySnapshot(): ChatDetailShellSnapshot {
  return {
    visible: false,
    requestId: '',
    messageId: '',
    currentPage: 'overview',
    selectedCallId: '',
    selectedFunctioncallId: '',
    selectedGroupId: 'request',
    selectedDocId: '',
    requestViewMode: 'json',
    responseViewMode: 'json',
    schemaViewMode: 'json',
    loading: false,
    errorText: '',
    detailByRequestId: {}
  }
}

function buildCallStatus(modelCall: NormalChatModelCallSnapshot): {
  statusLabel: string
  statusClass: string
} {
  switch (modelCall.status) {
    case 'queued':
      return { statusLabel: 'Queued', statusClass: 'bg-slate-100 text-slate-600' }
    case 'running':
      return { statusLabel: 'Running', statusClass: 'bg-sky-100 text-sky-700' }
    case 'failed':
      return { statusLabel: 'Error', statusClass: 'bg-rose-100 text-rose-700' }
    case 'aborted':
      return { statusLabel: 'Aborted', statusClass: 'bg-amber-100 text-amber-700' }
    case 'succeeded':
    default:
      return { statusLabel: 'Completed', statusClass: 'bg-emerald-100 text-emerald-700' }
  }
}

function buildCallTitle(modelCall: NormalChatModelCallSnapshot): string {
  return modelCall.depth > 0
    ? `Nested Model Call #${modelCall.seq}`
    : `Model Call #${modelCall.seq}`
}

function buildCallSummary(modelCall: NormalChatModelCallSnapshot): string {
  const requestPayload = parseJson<Record<string, unknown>>(modelCall.requestPayloadJson, {})
  const providerId =
    typeof requestPayload.providerId === 'string' ? requestPayload.providerId : 'unknown-provider'
  const modelId =
    typeof requestPayload.modelId === 'string' ? requestPayload.modelId : 'unknown-model'
  const loadedActions = parseJson<unknown[]>(modelCall.loadedActionsJson, [])
  const promptSnapshot = modelCall.compiledPromptJson
  const trimCount = promptSnapshot.trimSnapshot?.trimmedSections.length ?? 0
  const hasThinking = Boolean(modelCall.responseEnvelopeJson?.includes('thinking_md'))

  return [
    `Round ${modelCall.roundIndex + 1}`,
    `depth ${modelCall.depth}`,
    providerId,
    modelId,
    `actions ${loadedActions.length}`,
    trimCount > 0 ? `trim ${trimCount}` : null,
    hasThinking ? 'thinking' : null
  ]
    .filter(Boolean)
    .join(' / ')
}

function buildCallContextText(
  detail: NormalChatTaskDetail,
  modelCall: NormalChatModelCallSnapshot
): string {
  const segments = [
    detail.topicTitle,
    `request ${detail.requestId}`,
    `round ${modelCall.roundIndex + 1}`
  ]
  if (modelCall.parentActionRunId) {
    segments.push(`action ${modelCall.parentActionRunId}`)
  }
  return segments.join(' / ')
}

function buildCallBadge(modelCall: NormalChatModelCallSnapshot): string {
  return modelCall.depth > 0 ? `Depth ${modelCall.depth}` : 'LLM'
}

function createDocItem(input: ChatDetailShellDocItem): ChatDetailShellDocItem {
  return input
}

function buildRequestGroup(modelCall: NormalChatModelCallSnapshot): ChatDetailShellDocGroup {
  const requestPayload = parseJson<Record<string, unknown>>(modelCall.requestPayloadJson, {})
  const historyMessages = parseJson<unknown[]>(modelCall.historyMessagesJson, [])
  const loadedActions = parseJson<unknown[]>(modelCall.loadedActionsJson, [])
  const actionResults = parseJson<unknown[]>(modelCall.actionResultsJson, [])
  const promptSnapshot = modelCall.compiledPromptJson
  const actionFeedback =
    (promptSnapshot.roundSections.actionFeedback as unknown as string | undefined) ?? ''

  const items: ChatDetailShellDocItem[] = [
    createDocItem({
      id: 'request.request_meta',
      groupId: 'request',
      title: 'request_meta',
      summary: '请求元信息',
      description:
        '展示这次模型调用的请求参数、调用序号、所属任务、轮次、深度和时间戳，用来快速确认本次调用的执行坐标。',
      payload: {
        requestPayload,
        requestMeta: {
          seq: modelCall.seq,
          taskId: modelCall.taskId,
          conversationId: modelCall.conversationId,
          agentRunId: modelCall.agentRunId,
          parentActionRunId: modelCall.parentActionRunId,
          depth: modelCall.depth,
          roundIndex: modelCall.roundIndex,
          callIndexInAgent: modelCall.callIndexInAgent,
          status: modelCall.status,
          createdAt: modelCall.createdAt,
          startedAt: modelCall.startedAt,
          updatedAt: modelCall.updatedAt
        }
      },
      kind: 'json-object'
    }),
    createDocItem({
      id: 'request.prompt.system_sections',
      groupId: 'request',
      title: 'prompt.system_sections',
      summary: '系统提示词分区',
      description:
        '展示系统层提示词的结构化 section，如 identity、output contract、action protocol、repair contract。用于排查系统约束是否正确注入。',
      payload: promptSnapshot.systemSections,
      kind: 'json-object'
    }),
    createDocItem({
      id: 'request.prompt.round_sections',
      groupId: 'request',
      title: 'prompt.round_sections',
      summary: '轮次提示词分区',
      description:
        '展示当前轮传给模型的动态 section，包括 context、prior round memory、loaded action specs、action results、action feedback 等。',
      payload: promptSnapshot.roundSections,
      kind: 'json-object'
    }),
    createDocItem({
      id: 'request.prompt.compiled_system_prompt',
      groupId: 'request',
      title: 'prompt.compiled_system_prompt',
      summary: '编译后的系统提示词',
      description: '展示最终发送给 provider 的系统层完整文本，用于核对系统规则与注入顺序。',
      payload: promptSnapshot.compiledSystemPrompt,
      kind: 'text'
    }),
    createDocItem({
      id: 'request.prompt.compiled_round_prompt',
      groupId: 'request',
      title: 'prompt.compiled_round_prompt',
      summary: '编译后的轮次提示词',
      description:
        '展示当前轮完整动态提示词正文，是模型真正看到的 round 内容。适合排查记忆回填、动作结果回填和修复提示是否生效。',
      payload: promptSnapshot.compiledRoundPrompt,
      kind: 'text'
    }),
    createDocItem({
      id: 'request.prompt.trim_snapshot',
      groupId: 'request',
      title: 'prompt.trim_snapshot',
      summary: '提示词裁剪快照',
      description:
        '展示提示词预算裁剪前后的字符数、被裁掉的 section 和裁剪原因，用于分析上下文压缩行为。',
      payload: promptSnapshot.trimSnapshot ?? null,
      kind: 'json-object'
    }),
    createDocItem({
      id: 'request.context.history_messages',
      groupId: 'request',
      title: 'context.history_messages',
      summary: '种子历史消息',
      description:
        '展示本轮构建 prompt 时使用的历史消息种子，通常来自当前对话最近若干轮的持久化消息。',
      payload: historyMessages,
      kind: 'json-object'
    }),
    createDocItem({
      id: 'request.context.loaded_actions',
      groupId: 'request',
      title: 'context.loaded_actions',
      summary: '已加载动作',
      description:
        '展示这一轮真正被暴露给模型的动作定义和 schema，用于区分已启用动作与当前实际加载动作。',
      payload: loadedActions,
      kind: 'json-object'
    }),
    createDocItem({
      id: 'request.context.action_results',
      groupId: 'request',
      title: 'context.action_results',
      summary: '动作结果上下文',
      description: '展示当前轮之前已经积累的动作结果摘要，这些内容会作为下一轮模型的可见上下文。',
      payload: actionResults,
      kind: 'json-object'
    }),
    createDocItem({
      id: 'request.context.action_feedback',
      groupId: 'request',
      title: 'context.action_feedback',
      summary: '动作反馈上下文',
      description:
        '展示上一轮或更早轮次产生的 action feedback，例如 schema 错误、权限拒绝、执行失败等，用于约束模型不要重复犯错。',
      payload: actionFeedback,
      kind: actionFeedback ? 'text' : 'json-object'
    })
  ]

  return {
    id: 'request',
    title: 'request',
    items
  }
}

function buildResponseGroup(modelCall: NormalChatModelCallSnapshot): ChatDetailShellDocGroup {
  const responseEnvelope = parseJson<Record<string, unknown> | null>(
    modelCall.responseEnvelopeJson,
    null
  )

  return {
    id: 'response',
    title: 'response',
    items: [
      createDocItem({
        id: 'response.stream_text',
        groupId: 'response',
        title: 'response.stream_text',
        summary: '流式文本累计',
        description:
          '展示这次模型调用在流式阶段累计收到的原始文本内容，适合排查 streaming 是否正常、delta 是否完整。',
        payload: modelCall.responseStreamText,
        kind: 'text'
      }),
      createDocItem({
        id: 'response.envelope',
        groupId: 'response',
        title: 'response.envelope',
        summary: '解析后的响应包',
        description:
          '展示 runtime 在 parser 之后持久化的结构化响应 envelope，通常包含 body_md、action_calls、thinking_md 等。',
        payload: responseEnvelope,
        kind: 'json-object'
      }),
      createDocItem({
        id: 'response.final_reply',
        groupId: 'response',
        title: 'response.final_reply',
        summary: '最终回答正文',
        description: '展示这次调用最终确认并持久化的回复正文，用于核对最终用户可见文本。',
        payload: modelCall.finalReplyMd,
        kind: 'markdown'
      }),
      createDocItem({
        id: 'response.error',
        groupId: 'response',
        title: 'response.error',
        summary: '响应错误',
        description:
          '展示 provider 或 runtime 在本次调用上记录的错误信息。若为空，说明调用在这一层没有报错。',
        payload: modelCall.errorMessage,
        kind: 'text'
      })
    ]
  }
}

function buildSchemaDebugGroup(
  modelCall: NormalChatModelCallSnapshot
): ChatDetailShellDocGroup | null {
  const loadedActions = parseJson<Array<Record<string, unknown>>>(modelCall.loadedActionsJson, [])
  const items: ChatDetailShellDocItem[] = []

  for (const action of loadedActions) {
    const actionKey = typeof action.actionKey === 'string' ? action.actionKey : null
    const definition = action.definition as Record<string, unknown> | undefined
    const schemaDebug = definition?.debugSchemaSnapshot as Record<string, unknown> | undefined
    if (!actionKey || !schemaDebug) {
      continue
    }

    items.push(
      createDocItem({
        id: `schema_debug.${actionKey}.runtime_schema`,
        groupId: 'schema_debug',
        title: `${actionKey}.runtime_schema`,
        summary: '运行时真实 schema',
        description:
          '展示 action 在运行时真正用于 safeParse 和校验的 schema，是未裁剪前的完整版本。',
        payload: schemaDebug.runtimeSchemaJson as Record<string, unknown>,
        kind: 'json-object'
      }),
      createDocItem({
        id: `schema_debug.${actionKey}.public_schema`,
        groupId: 'schema_debug',
        title: `${actionKey}.public_schema`,
        summary: '模型可见 schema',
        description: '展示真正暴露给模型的 schema，可能对内部字段、危险字段或派生字段做了裁剪。',
        payload: schemaDebug.publicSchemaJson as Record<string, unknown>,
        kind: 'json-object'
      }),
      createDocItem({
        id: `schema_debug.${actionKey}.redaction_summary`,
        groupId: 'schema_debug',
        title: `${actionKey}.redaction_summary`,
        summary: '裁剪说明',
        description:
          '展示 runtime schema 与 public schema 之间的差异说明，包括删掉了哪些字段、为什么删。',
        payload: schemaDebug.redactionSummary as Record<string, unknown>,
        kind: 'json-object'
      })
    )
  }

  if (items.length === 0) {
    return null
  }

  return {
    id: 'schema_debug',
    title: 'schema_debug',
    items
  }
}

function formatActionStatusLabel(status: NormalChatActionRunSnapshot['status']): string {
  if (status === 'succeeded') return 'Completed'
  if (status === 'failed') return 'Error'
  if (status === 'aborted') return 'Aborted'
  if (status === 'queued') return 'Queued'
  return 'Running'
}

function formatActionStatusClass(status: NormalChatActionRunSnapshot['status']): string {
  if (status === 'succeeded') return 'bg-emerald-100 text-emerald-700'
  if (status === 'failed') return 'bg-rose-100 text-rose-700'
  if (status === 'aborted') return 'bg-amber-100 text-amber-700'
  if (status === 'queued') return 'bg-slate-100 text-slate-600'
  return 'bg-sky-100 text-sky-700'
}

function collectAutofilledKeys(
  rawInputPayload: Record<string, unknown>,
  normalizedInputPayload: Record<string, unknown>
): string[] {
  return Object.keys(normalizedInputPayload).filter((key) => !(key in rawInputPayload))
}

function toFunctioncallItem(
  call: NormalChatActionRunSnapshot,
  index: number,
  assistantPart: Extract<
    NormalChatTaskDetail['messages'][number]['parts'][number],
    { kind: 'functioncall' }
  > | null
): ChatDetailShellFunctioncallItem {
  const rawInputPayload = parseJson<Record<string, unknown>>(call.inputJson, {})
  const normalizedInputPayload = parseJson<Record<string, unknown>>(
    assistantPart?.input ?? call.inputJson,
    {}
  )
  const part = {
    kind: 'functioncall' as const,
    callId: call.id,
    functionCallName: call.actionKey,
    title: call.actionKey,
    status:
      call.status === 'succeeded' ? 'success' : call.status === 'failed' ? 'error' : call.status,
    input: assistantPart?.input ?? JSON.stringify(normalizedInputPayload, null, 2),
    output: assistantPart?.output ?? call.outputJson ?? '',
    errorMessage: call.errorMessage,
    isStreaming: false,
    roundIndex: call.roundIndex,
    batchIndex: call.batchIndex,
    parallelIndex: call.parallelIndex,
    depth: assistantPart?.depth ?? 0,
    decisionReason: assistantPart?.decisionReason ?? null
  }

  return {
    id: call.id,
    indexLabel: `#${index + 1}`,
    title: call.actionKey,
    summary: `${call.actionKind} / round ${call.roundIndex}`,
    contextText: `Round ${call.roundIndex} / batch ${call.batchIndex + 1} / parallel ${call.parallelIndex + 1}`,
    badge: call.actionKey,
    statusLabel: formatActionStatusLabel(call.status),
    statusClass: formatActionStatusClass(call.status),
    rawInputPayload,
    normalizedInputPayload,
    autofilledKeys: collectAutofilledKeys(rawInputPayload, normalizedInputPayload),
    requestPayload: normalizedInputPayload,
    responsePayload: {
      outputJson: call.outputJson,
      errorMessage: call.errorMessage,
      status: call.status,
      startedAt: call.startedAt,
      finishedAt: call.finishedAt
    },
    part
  }
}

function buildDescription(detail: NormalChatTaskDetail): string {
  const lastCompletedCall = [...detail.modelCalls]
    .reverse()
    .find((modelCall) => modelCall.finalReplyMd?.trim())
  if (lastCompletedCall?.finalReplyMd?.trim()) {
    return lastCompletedCall.finalReplyMd.trim()
  }

  const assistantMessage = detail.messages.find((message) => message.role === 'assistant') ?? null
  const finalMessageText = assistantMessage?.parts
    .filter((part) => part.kind === 'text')
    .map((part) => part.text)
    .join('')
    .trim()

  return (
    detail.finalResponse?.finalText ||
    finalMessageText ||
    'Conversation detail loaded from backend.'
  )
}

function toRecord(detail: NormalChatTaskDetail): ChatDetailShellRecord {
  const assistantMessage = detail.messages.find((message) => message.role === 'assistant') ?? null
  const functioncallParts =
    assistantMessage?.parts.filter(
      (
        part
      ): part is Extract<
        NormalChatTaskDetail['messages'][number]['parts'][number],
        { kind: 'functioncall' }
      > => part.kind === 'functioncall'
    ) ?? []
  const functioncallPartById = new Map(functioncallParts.map((part) => [part.callId, part]))
  const hasLlmCallDetails = detail.modelCalls.length > 0
  const llmCallEmptyMessage =
    !hasLlmCallDetails && detail.executionSnapshot.runtime.persistencePreset === 'light'
      ? '当前 assistant 使用轻量持久化，LLM 调用明细没有保存。'
      : null

  return {
    requestId: detail.requestId,
    messageId: assistantMessage?.id ?? '',
    assistantName: detail.assistantName,
    topicTitle: detail.topicTitle,
    description: buildDescription(detail),
    hasLlmCallDetails,
    llmCallEmptyMessage,
    calls: detail.modelCalls.map((modelCall) => {
      const status = buildCallStatus(modelCall)
      const groups = [buildRequestGroup(modelCall), buildResponseGroup(modelCall)]
      const schemaDebugGroup = buildSchemaDebugGroup(modelCall)
      if (schemaDebugGroup) {
        groups.push(schemaDebugGroup)
      }

      return {
        id: modelCall.id,
        indexLabel: `#${modelCall.seq}`,
        title: buildCallTitle(modelCall),
        summary: buildCallSummary(modelCall),
        contextText: buildCallContextText(detail, modelCall),
        badge: buildCallBadge(modelCall),
        statusLabel: status.statusLabel,
        statusClass: status.statusClass,
        groups
      }
    }),
    functioncalls: detail.actionRuns.map((call, index) =>
      toFunctioncallItem(call, index, functioncallPartById.get(call.id) ?? null)
    )
  }
}

export class ChatDetailShellDatasource {
  async loadSnapshot(): Promise<ChatDetailShellSnapshot> {
    return createEmptySnapshot()
  }

  async getConversationDetail(requestId: string): Promise<ChatDetailShellRecord> {
    if (!requestId) {
      throw new Error('Missing requestId for chat detail.')
    }

    const detail = await window.api.normalChat.getConversationTurnDetail({ requestId }).then(unwrap)

    if (!detail) {
      throw new Error(`Task detail not found for request ${requestId}.`)
    }

    return toRecord(detail)
  }
}
