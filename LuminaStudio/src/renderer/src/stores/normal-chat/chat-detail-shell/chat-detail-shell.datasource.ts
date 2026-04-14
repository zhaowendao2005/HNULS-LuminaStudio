import type {
  NormalChatActionRunSnapshot,
  NormalChatFunctionCallMessagePart,
  NormalChatModelCallSnapshot,
  NormalChatRequestDebugSnapshot,
  NormalChatRequestDetailSnapshot,
  NormalChatSubAgentMessagePart
} from '@preload/types'
import type {
  ChatDetailShellDocGroup,
  ChatDetailShellDocItem,
  ChatDetailShellDocTreeBranchNode,
  ChatDetailShellDocTreeLeafNode,
  ChatDetailShellDocTreeNode,
  ChatDetailShellFunctioncallItem,
  ChatDetailShellRecord,
  ChatDetailShellSnapshot,
  ChatDetailShellSubagentItem
} from './chat-detail-shell.types'
import { buildAgentRuntimeGraph } from './agent-runtime-graph.builder'

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
    focusAgentRunId: '',
    selectedRuntimeNodeId: '',
    runtimeDrawerVisible: false,
    selectedRuntimeSectionId: 'summary',
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
    modelCall.turnKind,
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
  detail: Pick<NormalChatRequestDetailSnapshot, 'topicTitle' | 'requestId'>,
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

function createDocLeafNode(input: ChatDetailShellDocItem): ChatDetailShellDocTreeLeafNode {
  return {
    id: input.id,
    kind: 'leaf',
    title: input.title,
    summary: input.summary,
    doc: input
  }
}

function createDocBranchNode(input: {
  id: string
  title: string
  summary: string
  children: ChatDetailShellDocTreeNode[]
}): ChatDetailShellDocTreeBranchNode {
  return {
    id: input.id,
    kind: 'branch',
    title: input.title,
    summary: input.summary,
    children: input.children
  }
}

function flattenDocTree(nodes: ChatDetailShellDocTreeNode[]): ChatDetailShellDocItem[] {
  const items: ChatDetailShellDocItem[] = []
  const walk = (treeNodes: ChatDetailShellDocTreeNode[]): void => {
    for (const node of treeNodes) {
      if (node.kind === 'leaf') {
        items.push(node.doc)
        continue
      }
      walk(node.children)
    }
  }

  walk(nodes)
  return items
}

function safeParseJsonString(value: string | null): unknown {
  if (!value) {
    return value
  }

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function buildActionResultTree(
  modelCall: NormalChatModelCallSnapshot
): ChatDetailShellDocTreeNode[] {
  const actionResults = parseJson<Array<Record<string, unknown>>>(modelCall.actionResultsJson, [])
  if (actionResults.length === 0) {
    return []
  }

  const grouped = new Map<string, Array<{ item: Record<string, unknown>; index: number }>>()
  actionResults.forEach((item, index) => {
    const actionKey =
      typeof item.actionKey === 'string' && item.actionKey.trim()
        ? item.actionKey
        : 'unknown_action'
    const next = grouped.get(actionKey) ?? []
    next.push({ item, index })
    grouped.set(actionKey, next)
  })

  return Array.from(grouped.entries()).map(([actionKey, entries]) => {
    const children = entries.flatMap(({ item, index }) => {
      const title = typeof item.title === 'string' ? item.title : actionKey
      const status = typeof item.status === 'string' ? item.status : 'unknown'
      const retryable = Boolean(item.retryable)
      const inputJson = typeof item.inputJson === 'string' ? item.inputJson : ''
      const outputJson = typeof item.outputJson === 'string' ? item.outputJson : null
      const errorMessage = typeof item.errorMessage === 'string' ? item.errorMessage : null
      const modelFacingSummaryMd =
        typeof item.modelFacingSummaryMd === 'string' ? item.modelFacingSummaryMd : ''
      const inputPayload = safeParseJsonString(inputJson)
      const outputPayload = safeParseJsonString(outputJson)

      return [
        createDocLeafNode(
          createDocItem({
            id: `request.context.action_results.${actionKey}.${index}.summary`,
            groupId: 'request',
            title: `${actionKey}.summary`,
            summary: `${title} / ${status}${retryable ? ' / retryable' : ''}`,
            description: '展示单个 action 结果的摘要、状态、是否可重试以及模型可见的总结文本。',
            payload: {
              actionKey,
              title,
              status,
              retryable,
              errorMessage,
              modelFacingSummaryMd
            },
            kind: 'json-object'
          })
        ),
        createDocLeafNode(
          createDocItem({
            id: `request.context.action_results.${actionKey}.${index}.input`,
            groupId: 'request',
            title: `${actionKey}.input`,
            summary: `${title} / input`,
            description: '展示单个 action 的输入参数。',
            payload: inputPayload,
            kind: typeof inputPayload === 'string' ? 'text' : 'json-object'
          })
        ),
        createDocLeafNode(
          createDocItem({
            id: `request.context.action_results.${actionKey}.${index}.output`,
            groupId: 'request',
            title: `${actionKey}.output`,
            summary: `${title} / output`,
            description: '展示单个 action 的输出结果。',
            payload: outputPayload,
            kind:
              outputPayload === null || typeof outputPayload === 'string' ? 'text' : 'json-object'
          })
        ),
        createDocLeafNode(
          createDocItem({
            id: `request.context.action_results.${actionKey}.${index}.model_facing_summary`,
            groupId: 'request',
            title: `${actionKey}.model_facing_summary`,
            summary: `${title} / model summary`,
            description: '展示单个 action 面向模型的摘要文本。',
            payload: modelFacingSummaryMd,
            kind: 'markdown'
          })
        )
      ]
    })

    return createDocBranchNode({
      id: `request.context.action_results.${actionKey}`,
      title: actionKey,
      summary: `${entries.length} items`,
      children
    })
  })
}

function buildFunctioncallSummary(
  actionKey: string,
  input: Record<string, unknown>,
  outputJson: string | null
): { title: string; summary: string; contextText: string; badge: string } {
  if (actionKey === 'functioncall.kg_retrieval') {
    const output = parseJson<Record<string, unknown> | null>(outputJson, null)
    const meta = output?.meta as Record<string, unknown> | undefined
    const mode =
      typeof input.mode === 'string'
        ? input.mode
        : typeof meta?.mode === 'string'
          ? meta.mode
          : '--'
    const graphTableBase = typeof input.graphTableBase === 'string' ? input.graphTableBase : '--'
    const entityCount = typeof meta?.entityCount === 'number' ? meta.entityCount : '--'
    const relationCount = typeof meta?.relationCount === 'number' ? meta.relationCount : '--'
    const chunkCount = typeof meta?.chunkCount === 'number' ? meta.chunkCount : '--'
    return {
      title: 'KG Retrieval',
      summary: `kg / ${graphTableBase} / mode ${mode}`,
      contextText: `entities ${entityCount} / relations ${relationCount} / chunks ${chunkCount}`,
      badge: graphTableBase
    }
  }

  if (actionKey === 'functioncall.knowledge_retrieval') {
    const tableName = typeof input.tableName === 'string' ? input.tableName : '--'
    const fileKey = typeof input.fileKey === 'string' ? input.fileKey : null
    return {
      title: 'Knowledge Retrieval',
      summary: `vector / ${tableName}`,
      contextText: fileKey ? `file ${fileKey}` : 'global table retrieval',
      badge: tableName
    }
  }

  return {
    title: actionKey,
    summary: `${actionKey} / round --`,
    contextText: '',
    badge: actionKey
  }
}

function buildRequestGroup(
  detail: NormalChatRequestDetailSnapshot,
  modelCall: NormalChatModelCallSnapshot
): ChatDetailShellDocGroup {
  const requestPayload = parseJson<Record<string, unknown>>(modelCall.requestPayloadJson, {})
  const historyMessages = parseJson<unknown[]>(modelCall.historyMessagesJson, [])
  const loadedActions = parseJson<unknown[]>(modelCall.loadedActionsJson, [])
  const actionResults = parseJson<unknown[]>(modelCall.actionResultsJson, [])
  const promptSnapshot = modelCall.compiledPromptJson
  const actionFeedback =
    (promptSnapshot.roundSections.actionFeedback as unknown as string | undefined) ?? ''
  const retrievalPolicies = {
    knowledgeRetrievalPolicy: detail.executionSnapshot?.knowledgeRetrievalPolicy ?? null,
    kgRetrievalPolicy: detail.executionSnapshot?.kgRetrievalPolicy ?? null
  }

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
      id: 'request.raw_provider_request',
      groupId: 'request',
      title: 'raw_provider_request',
      summary: '原始出网请求',
      description:
        '展示 SDK 在真正出网前捕获到的原始 provider 请求。bodyText 是原始请求体字符串，bodyJson 是把 bodyText 解析后的对象，排查结构先看 bodyJson，排查序列化细节再看 bodyText。',
      payload: modelCall.rawProviderRequest,
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
      id: 'request.context.retrieval_policies',
      groupId: 'request',
      title: 'context.retrieval_policies',
      summary: '请求级检索策略',
      description:
        '展示本次请求在进入 runtime 时携带的向量检索策略与 KG 检索策略，是 action gating、prompt injection 和权限校验的共同来源。',
      payload: retrievalPolicies,
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

  const actionResultTree = buildActionResultTree(modelCall)
  const requestTree: ChatDetailShellDocTreeNode[] = [
    createDocBranchNode({
      id: 'request.base',
      title: 'request.base',
      summary: '请求与 prompt 基础信息',
      children: items
        .filter(
          (item) =>
            item.id !== 'request.context.action_results' &&
            item.id !== 'request.context.action_feedback'
        )
        .map((item) => createDocLeafNode(item))
    }),
    createDocBranchNode({
      id: 'request.context.action_results.branch',
      title: 'action_results',
      summary: `${actionResultTree.length} action groups`,
      children: actionResultTree
    }),
    createDocLeafNode(
      items.find((item) => item.id === 'request.context.action_feedback') ??
        createDocItem({
          id: 'request.context.action_feedback',
          groupId: 'request',
          title: 'context.action_feedback',
          summary: '动作反馈上下文',
          description: '展示 action feedback 的原始内容。',
          payload: actionFeedback,
          kind: actionFeedback ? 'text' : 'json-object'
        })
    )
  ]

  return {
    id: 'request',
    title: 'request',
    items: [...items, ...flattenDocTree(actionResultTree)],
    tree: requestTree
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

function resolveChildAgentRunId(
  detail: Pick<NormalChatRequestDetailSnapshot, 'modelCalls'>,
  call: NormalChatActionRunSnapshot
): string | null {
  const matchedModelCall = detail.modelCalls.find(
    (modelCall) => modelCall.parentActionRunId === call.id
  )
  return matchedModelCall?.agentRunId ?? null
}

function buildSubagentItems(
  functioncalls: ChatDetailShellFunctioncallItem[],
  assistantMessage: NormalChatRequestDetailSnapshot['messages'][number] | null
): ChatDetailShellSubagentItem[] {
  const subagentParts =
    assistantMessage?.parts.filter(
      (part): part is NormalChatSubAgentMessagePart => part.kind === 'subagent'
    ) ?? []

  return subagentParts.map((part) => {
    const matchedFunctioncall =
      functioncalls.find(
        (item) =>
          item.actionKey === 'system.dispatch_sub_agent' &&
          ((part.childAgentRunId && item.childAgentRunId === part.childAgentRunId) ||
            (item.roundIndex === part.roundIndex &&
              item.batchIndex === part.batchIndex &&
              item.parallelIndex === part.parallelIndex &&
              item.part.depth === part.depth))
      ) ?? null

    return {
      partId: part.partId,
      goal: part.goal,
      childAgentRunId: part.childAgentRunId,
      sourceFunctioncallId: matchedFunctioncall?.id ?? null,
      roundIndex: part.roundIndex,
      batchIndex: part.batchIndex,
      parallelIndex: part.parallelIndex,
      depth: part.depth,
      status: part.status
    }
  })
}

function toFunctioncallItem(
  detail: NormalChatRequestDetailSnapshot,
  call: NormalChatActionRunSnapshot,
  index: number,
  assistantPart: Extract<
    NormalChatRequestDetailSnapshot['messages'][number]['parts'][number],
    { kind: 'functioncall' }
  > | null
): ChatDetailShellFunctioncallItem {
  const rawInputPayload = parseJson<Record<string, unknown>>(call.inputJson, {})
  const normalizedInputPayload = parseJson<Record<string, unknown>>(
    assistantPart?.input ?? call.inputJson,
    {}
  )
  const display = buildFunctioncallSummary(call.actionKey, normalizedInputPayload, call.outputJson)
  const part = {
    kind: 'functioncall' as const,
    callId: call.id,
    functionCallName: call.actionKey,
    title: call.actionKey,
    status: (call.status === 'succeeded'
      ? 'success'
      : call.status === 'failed'
        ? 'error'
        : call.status) as NormalChatFunctionCallMessagePart['status'],
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
    actionKey: call.actionKey,
    actionKind: call.actionKind,
    mode: call.mode,
    agentRunId: call.agentRunId,
    roundIndex: call.roundIndex,
    batchIndex: call.batchIndex,
    parallelIndex: call.parallelIndex,
    createdAt: call.createdAt,
    startedAt: call.startedAt,
    finishedAt: call.finishedAt,
    indexLabel: `#${index + 1}`,
    title: display.title,
    summary: `${display.summary} / round ${call.roundIndex + 1}`,
    contextText: `${display.contextText} / batch ${call.batchIndex + 1} / parallel ${call.parallelIndex + 1}`,
    badge: display.badge,
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
    part,
    childAgentRunId: resolveChildAgentRunId(detail, call)
  }
}

function buildDescription(detail: NormalChatRequestDetailSnapshot): string {
  const lastCompletedCall = [...detail.modelCalls]
    .reverse()
    .find(
      (modelCall) =>
        modelCall.turnKind !== 'action_plan' &&
        typeof modelCall.finalReplyMd === 'string' &&
        modelCall.finalReplyMd.trim()
    )
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

function toRecord(snapshot: NormalChatRequestDebugSnapshot): ChatDetailShellRecord {
  const detail = snapshot.detail
  const assistantMessage = detail.messages.find((message) => message.role === 'assistant') ?? null
  const functioncallParts =
    assistantMessage?.parts.filter(
      (
        part
      ): part is Extract<
        NormalChatRequestDetailSnapshot['messages'][number]['parts'][number],
        { kind: 'functioncall' }
      > => part.kind === 'functioncall'
    ) ?? []
  const functioncallPartById = new Map(functioncallParts.map((part) => [part.callId, part]))
  const hasLlmCallDetails = detail.modelCalls.length > 0
  const llmCallEmptyMessage =
    !hasLlmCallDetails && detail.executionSnapshot?.runtime.persistencePreset === 'light'
      ? '当前 assistant 使用轻量持久化，LLM 调用明细没有保存。'
      : null
  const calls = detail.modelCalls.map((modelCall) => {
    const status = buildCallStatus(modelCall)
    const groups = [buildRequestGroup(detail, modelCall), buildResponseGroup(modelCall)]
    const schemaDebugGroup = buildSchemaDebugGroup(modelCall)
    if (schemaDebugGroup) {
      groups.push(schemaDebugGroup)
    }

    return {
      id: modelCall.id,
      seq: modelCall.seq,
      agentRunId: modelCall.agentRunId,
      parentActionRunId: modelCall.parentActionRunId,
      roundIndex: modelCall.roundIndex,
      depth: modelCall.depth,
      createdAt: modelCall.createdAt,
      status: modelCall.status,
      indexLabel: `#${modelCall.seq}`,
      title: buildCallTitle(modelCall),
      summary: buildCallSummary(modelCall),
      contextText: buildCallContextText(detail, modelCall),
      badge: buildCallBadge(modelCall),
      statusLabel: status.statusLabel,
      statusClass: status.statusClass,
      groups
    }
  })
  const functioncalls = detail.actionRuns.map((call, index) =>
    toFunctioncallItem(detail, call, index, functioncallPartById.get(call.id) ?? null)
  )
  const subagents = buildSubagentItems(functioncalls, assistantMessage)
  const record: ChatDetailShellRecord = {
    requestId: detail.requestId,
    messageId: assistantMessage?.id ?? '',
    assistantName: detail.assistantName,
    topicTitle: detail.topicTitle,
    requestInput: detail.executionSnapshot?.request.input ?? '',
    requestStatus: detail.head?.status ?? 'queued',
    requestPhase: detail.head?.phase ?? '',
    highWatermark: snapshot.highWatermark,
    description: buildDescription(detail),
    hasLlmCallDetails,
    llmCallEmptyMessage,
    calls,
    functioncalls,
    subagents,
    agentTree: snapshot.agentGraph.tree,
    agentSummary: snapshot.agentGraph.summary,
    runtimeGraph: null
  }

  record.runtimeGraph = buildAgentRuntimeGraph(record)
  return record
}

export class ChatDetailShellDatasource {
  async loadSnapshot(): Promise<ChatDetailShellSnapshot> {
    return createEmptySnapshot()
  }

  async getConversationDetail(requestId: string): Promise<ChatDetailShellRecord> {
    if (!requestId) {
      throw new Error('Missing requestId for chat detail.')
    }

    const detail = await window.api.normalChat.getRequestDebugSnapshot({ requestId }).then(unwrap)
    return toRecord(detail)
  }
}
