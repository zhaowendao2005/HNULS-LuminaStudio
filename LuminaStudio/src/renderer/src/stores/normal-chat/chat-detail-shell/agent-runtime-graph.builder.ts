import type {
  ChatDetailRuntimeDrawerSection,
  ChatDetailRuntimeDrawerSectionId,
  ChatDetailRuntimeEdge,
  ChatDetailRuntimeGraph,
  ChatDetailRuntimeNode,
  ChatDetailRuntimeNodeTone,
  ChatDetailShellCallItem,
  ChatDetailShellDocItem,
  ChatDetailShellFunctioncallItem,
  ChatDetailShellRecord,
  ChatDetailShellSubagentItem
} from './chat-detail-shell.types'
import {
  layoutRuntimeGraph,
  type RuntimeLayoutEdgeInput,
  type RuntimeLayoutNodeInput
} from './agent-runtime-graph.layout'

const NODE_HEIGHT = 164
const USER_WIDTH = 292
const WORK_WIDTH = 320
const SUBAGENT_WIDTH = 344
const HUB_WIDTH = 344

const SUBAGENT_PALETTE = ['#8b5cf6', '#0ea5e9', '#14b8a6', '#ec4899', '#f59e0b', '#10b981']

interface RuntimeWorkDescriptor {
  id: string
  kind: 'llm-call' | 'action' | 'functioncall' | 'subagent'
  createdAt: string
  depth: number
  roundIndex: number
  batchIndex: number
  parallelIndex: number
}

function hashSeed(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

function pickSubagentColor(seed: string): string {
  return SUBAGENT_PALETTE[hashSeed(seed) % SUBAGENT_PALETTE.length] ?? SUBAGENT_PALETTE[0]
}

function hexToRgb(value: string): { red: number; green: number; blue: number } {
  const sanitized = value.replace('#', '')
  const normalized =
    sanitized.length === 3
      ? sanitized
          .split('')
          .map((item) => `${item}${item}`)
          .join('')
      : sanitized
  const numeric = Number.parseInt(normalized, 16)
  return {
    red: (numeric >> 16) & 255,
    green: (numeric >> 8) & 255,
    blue: numeric & 255
  }
}

function withAlpha(color: string, alpha: number): string {
  const { red, green, blue } = hexToRgb(color)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function resolveTonePalette(
  tone: ChatDetailRuntimeNodeTone,
  accentOverride?: string
): {
  accent: string
  border: string
} {
  if (accentOverride) {
    return {
      accent: accentOverride,
      border: withAlpha(accentOverride, 0.5)
    }
  }

  switch (tone) {
    case 'active':
      return { accent: '#0ea5e9', border: 'rgba(14, 165, 233, 0.32)' }
    case 'success':
      return { accent: '#14b8a6', border: 'rgba(20, 184, 166, 0.32)' }
    case 'warning':
      return { accent: '#f59e0b', border: 'rgba(245, 158, 11, 0.32)' }
    case 'danger':
      return { accent: '#ef4444', border: 'rgba(239, 68, 68, 0.32)' }
    case 'neutral':
    default:
      return { accent: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' }
  }
}

function resolveStatusTone(statusLabel: string): ChatDetailRuntimeNodeTone {
  if (/running|进行中|思考中/i.test(statusLabel)) {
    return 'active'
  }
  if (/completed|success|已完成/i.test(statusLabel)) {
    return 'success'
  }
  if (/error|failed|失败/i.test(statusLabel)) {
    return 'danger'
  }
  if (/aborted|queued|排队|等待/i.test(statusLabel)) {
    return 'warning'
  }
  return 'neutral'
}

function buildWorkDescriptors(record: ChatDetailShellRecord): RuntimeWorkDescriptor[] {
  return [
    ...record.calls.map((item) => ({
      id: `llm:${item.id}`,
      kind: 'llm-call' as const,
      createdAt: item.createdAt,
      depth: item.depth,
      roundIndex: item.roundIndex,
      batchIndex: 0,
      parallelIndex: 0
    })),
    ...record.functioncalls.map((item) => ({
      id: `${item.actionKind === 'functioncall' ? 'functioncall' : 'action'}:${item.id}`,
      kind: item.actionKind === 'functioncall' ? ('functioncall' as const) : ('action' as const),
      createdAt: item.createdAt,
      depth: item.part.depth,
      roundIndex: item.roundIndex,
      batchIndex: item.batchIndex,
      parallelIndex: item.parallelIndex
    })),
    ...record.subagents.map((item) => ({
      id: `subagent:${item.partId}`,
      kind: 'subagent' as const,
      createdAt: `${item.roundIndex}:${item.batchIndex}:${item.parallelIndex}`,
      depth: item.depth,
      roundIndex: item.roundIndex,
      batchIndex: item.batchIndex,
      parallelIndex: item.parallelIndex
    }))
  ].sort((left, right) => {
    return (
      left.depth - right.depth ||
      left.roundIndex - right.roundIndex ||
      left.batchIndex - right.batchIndex ||
      left.parallelIndex - right.parallelIndex ||
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id)
    )
  })
}

function classifyLlmDocuments(call: ChatDetailShellCallItem): {
  requestDocs: ChatDetailShellDocItem[]
  streamDocs: ChatDetailShellDocItem[]
  responseDocs: ChatDetailShellDocItem[]
  promptDocs: ChatDetailShellDocItem[]
} {
  const requestItems = call.groups.find((group) => group.id === 'request')?.items ?? []
  const responseItems = call.groups.find((group) => group.id === 'response')?.items ?? []
  const schemaItems = call.groups.find((group) => group.id === 'schema_debug')?.items ?? []

  return {
    requestDocs: requestItems.filter(
      (item) =>
        item.id === 'request.request_meta' ||
        item.id === 'request.raw_provider_request' ||
        item.id === 'request.context.loaded_actions' ||
        item.id === 'request.context.action_results'
    ),
    streamDocs: responseItems.filter((item) => item.id === 'response.stream_text'),
    responseDocs: responseItems.filter((item) => item.id !== 'response.stream_text'),
    promptDocs: [
      ...requestItems.filter(
        (item) => item.id.startsWith('request.prompt.') || item.id.startsWith('request.context.')
      ),
      ...schemaItems
    ]
  }
}

function createDrawerSection(
  input: ChatDetailRuntimeDrawerSection
): ChatDetailRuntimeDrawerSection {
  return input
}

function createNode(
  input: Omit<ChatDetailRuntimeNode, 'accentColor' | 'borderColor'> & { accentColor?: string }
): ChatDetailRuntimeNode {
  const palette = resolveTonePalette(input.tone, input.accentColor)
  return {
    ...input,
    accentColor: palette.accent,
    borderColor: palette.border
  }
}

function createLlmNode(call: ChatDetailShellCallItem): ChatDetailRuntimeNode {
  const documents = classifyLlmDocuments(call)
  const tone = resolveStatusTone(call.statusLabel)

  return createNode({
    id: `llm:${call.id}`,
    kind: 'llm-call',
    x: 0,
    y: 0,
    width: WORK_WIDTH,
    height: NODE_HEIGHT,
    title: call.title,
    subtitle: call.summary,
    meta: `Round ${call.roundIndex + 1} · depth ${call.depth}`,
    statusLabel: call.statusLabel,
    tone,
    agentRunId: call.agentRunId,
    childAgentRunId: null,
    drawerTitle: call.title,
    drawerSubtitle: `${call.contextText} · ${call.statusLabel}`,
    drawerSections: [
      createDrawerSection({
        id: 'summary',
        title: 'Summary',
        description: '本次 LLM 调用的执行坐标和状态。',
        kind: 'structured',
        payload: {
          requestId: call.contextText,
          agentRunId: call.agentRunId,
          parentActionRunId: call.parentActionRunId,
          roundIndex: call.roundIndex,
          depth: call.depth,
          status: call.status,
          badge: call.badge
        }
      }),
      createDrawerSection({
        id: 'request',
        title: 'Request',
        description: '原始出网请求与上下文摘要。',
        kind: 'documents',
        documents: documents.requestDocs
      }),
      createDrawerSection({
        id: 'stream',
        title: 'Streaming',
        description: '流式累计内容。',
        kind: 'documents',
        documents: documents.streamDocs
      }),
      createDrawerSection({
        id: 'response',
        title: 'Response',
        description: '解析后的响应包与最终回答。',
        kind: 'documents',
        documents: documents.responseDocs
      }),
      createDrawerSection({
        id: 'prompt',
        title: 'Prompt',
        description: '提示词、上下文与 schema 调试信息。',
        kind: 'documents',
        documents: documents.promptDocs
      })
    ]
  })
}

function createFunctionNode(
  item: ChatDetailShellFunctioncallItem,
  kind: 'action' | 'functioncall'
): ChatDetailRuntimeNode {
  const tone = resolveStatusTone(item.statusLabel)
  const label = kind === 'action' ? 'System Action' : 'Functioncall'

  return createNode({
    id: `${kind}:${item.id}`,
    kind,
    x: 0,
    y: 0,
    width: WORK_WIDTH,
    height: NODE_HEIGHT,
    title: item.title,
    subtitle: `${label} · ${item.summary}`,
    meta: `Round ${item.roundIndex + 1} · batch ${item.batchIndex + 1} · parallel ${item.parallelIndex + 1}`,
    statusLabel: item.statusLabel,
    tone,
    agentRunId: item.agentRunId,
    childAgentRunId: item.childAgentRunId,
    drawerTitle: item.title,
    drawerSubtitle: `${item.contextText} · ${item.statusLabel}`,
    drawerSections: [
      createDrawerSection({
        id: 'summary',
        title: 'Summary',
        description: '动作分类、执行状态与子代理挂载信息。',
        kind: 'structured',
        payload: {
          actionKey: item.actionKey,
          actionKind: item.actionKind,
          mode: item.mode,
          status: item.statusLabel,
          agentRunId: item.agentRunId,
          childAgentRunId: item.childAgentRunId,
          autofilledKeys: item.autofilledKeys
        }
      }),
      createDrawerSection({
        id: 'request',
        title: 'Request',
        description: '规范化后的动作输入。',
        kind: 'structured',
        payload: item.requestPayload,
        highlightKeys: item.autofilledKeys
      }),
      createDrawerSection({
        id: 'response',
        title: 'Response',
        description: '动作输出、错误和收口状态。',
        kind: 'structured',
        payload: item.responsePayload
      })
    ]
  })
}

function createSubagentNode(item: ChatDetailShellSubagentItem): ChatDetailRuntimeNode {
  const tone =
    item.status === 'completed'
      ? 'success'
      : item.status === 'failed'
        ? 'danger'
        : item.status === 'running'
          ? 'active'
          : 'warning'
  const accent = pickSubagentColor(item.childAgentRunId ?? item.partId)

  return createNode({
    id: `subagent:${item.partId}`,
    kind: 'subagent',
    x: 0,
    y: 0,
    width: SUBAGENT_WIDTH,
    height: NODE_HEIGHT,
    title: 'Subagent Branch',
    subtitle: item.goal,
    meta: `Round ${item.roundIndex + 1} · depth ${item.depth + 1}`,
    statusLabel: item.status,
    tone,
    accentColor: accent,
    agentRunId: null,
    childAgentRunId: item.childAgentRunId,
    drawerTitle: 'Subagent Branch',
    drawerSubtitle: `目标：${item.goal}`,
    drawerSections: [
      createDrawerSection({
        id: 'summary',
        title: 'Summary',
        description: '子代理目标、来源与当前状态。',
        kind: 'structured',
        payload: {
          goal: item.goal,
          status: item.status,
          childAgentRunId: item.childAgentRunId,
          sourceFunctioncallId: item.sourceFunctioncallId,
          roundIndex: item.roundIndex,
          batchIndex: item.batchIndex,
          parallelIndex: item.parallelIndex,
          depth: item.depth
        }
      })
    ]
  })
}

function createHubNode(record: ChatDetailShellRecord): ChatDetailRuntimeNode {
  const tone =
    record.requestStatus === 'succeeded'
      ? 'success'
      : record.requestStatus === 'failed'
        ? 'danger'
        : record.requestStatus === 'running'
          ? 'active'
          : record.requestStatus === 'queued'
            ? 'warning'
            : 'neutral'

  return createNode({
    id: `runtime:${record.requestId}`,
    kind: 'runtime-hub',
    x: 0,
    y: 0,
    width: HUB_WIDTH,
    height: 164,
    title:
      record.requestStatus === 'running'
        ? '正在思考中...'
        : record.requestStatus === 'succeeded'
          ? '已完成'
          : record.requestStatus === 'failed'
            ? '运行失败'
            : 'Agent Runtime',
    subtitle: record.description,
    meta: `${record.topicTitle} · watermark ${record.highWatermark}`,
    statusLabel: record.requestPhase || record.requestStatus,
    tone,
    agentRunId: record.agentTree?.rootAgentId ?? null,
    childAgentRunId: null,
    drawerTitle: 'Runtime Hub',
    drawerSubtitle: `${record.topicTitle} · ${record.requestPhase}`,
    drawerSections: [
      createDrawerSection({
        id: 'summary',
        title: 'Summary',
        description: '当前 request 的总体运行状态。',
        kind: 'structured',
        payload: {
          requestId: record.requestId,
          requestStatus: record.requestStatus,
          requestPhase: record.requestPhase,
          highWatermark: record.highWatermark,
          agentSummary: record.agentSummary,
          rootAgentId: record.agentTree?.rootAgentId ?? null,
          fallbackTriggered: record.agentSummary?.fallbackTriggered ?? false
        }
      })
    ]
  })
}

function createUserNode(record: ChatDetailShellRecord): ChatDetailRuntimeNode {
  return createNode({
    id: `user:${record.requestId}`,
    kind: 'user-query',
    x: 0,
    y: 0,
    width: USER_WIDTH,
    height: 148,
    title: '用户问题',
    subtitle: record.requestInput || '当前 request 没有可用输入。',
    meta: `${record.assistantName} · ${record.topicTitle}`,
    statusLabel: 'Request',
    tone: 'neutral',
    agentRunId: null,
    childAgentRunId: null,
    drawerTitle: 'User Request',
    drawerSubtitle: `${record.assistantName} / ${record.topicTitle}`,
    drawerSections: [
      createDrawerSection({
        id: 'summary',
        title: 'Summary',
        description: '请求输入与当前上下文。',
        kind: 'structured',
        payload: {
          requestId: record.requestId,
          assistantName: record.assistantName,
          topicTitle: record.topicTitle,
          requestStatus: record.requestStatus,
          requestPhase: record.requestPhase
        }
      }),
      createDrawerSection({
        id: 'request',
        title: 'Request',
        description: '用户输入正文。',
        kind: 'text',
        payload: record.requestInput
      })
    ]
  })
}

function createEdge(
  id: string,
  source: string,
  target: string,
  label: string,
  stroke: string,
  dashed = true
): RuntimeLayoutEdgeInput {
  return { id, source, target, label, dashed, stroke }
}

function buildLayoutNodeInputs(
  nodes: ChatDetailRuntimeNode[],
  record: ChatDetailShellRecord
): RuntimeLayoutNodeInput[] {
  const workDescriptors = buildWorkDescriptors(record)
  const descriptorOrder = new Map(workDescriptors.map((item, index) => [item.id, index + 1]))
  const normalized = nodes.map((node) => {
    let sourceActionNodeId: string | null = null
    if (node.kind === 'subagent') {
      const subagent = record.subagents.find((item) => `subagent:${item.partId}` === node.id)
      sourceActionNodeId = subagent?.sourceFunctioncallId
        ? `action:${subagent.sourceFunctioncallId}`
        : null
    }

    return {
      id: node.id,
      kind: node.kind,
      width: node.width,
      height: node.height,
      appearanceOrder:
        node.kind === 'user-query'
          ? 0
          : node.kind === 'runtime-hub'
            ? workDescriptors.length + 1
            : (descriptorOrder.get(node.id) ?? workDescriptors.length + 1),
      agentRunId: node.agentRunId,
      childAgentRunId: node.childAgentRunId,
      sourceActionNodeId
    }
  })

  return normalized.sort((left, right) => left.appearanceOrder - right.appearanceOrder)
}

function buildLayoutEdges(
  record: ChatDetailShellRecord,
  nodes: ChatDetailRuntimeNode[]
): RuntimeLayoutEdgeInput[] {
  const edges: RuntimeLayoutEdgeInput[] = []
  const outgoing = new Set<string>()
  const nodeIds = new Set(nodes.map((node) => node.id))
  const userNodeId = `user:${record.requestId}`
  const hubNodeId = `runtime:${record.requestId}`

  for (const call of record.calls) {
    const target = `llm:${call.id}`
    if (!nodeIds.has(target)) {
      continue
    }

    let source = userNodeId
    let label = call.depth > 0 ? '子代理推理' : '用户请求'
    let stroke = 'rgba(148, 163, 184, 0.7)'

    if (call.parentActionRunId) {
      const actionSource = record.functioncalls.find((item) => item.id === call.parentActionRunId)
      if (actionSource) {
        const prefix = actionSource.actionKind === 'functioncall' ? 'functioncall' : 'action'
        source = `${prefix}:${actionSource.id}`
        label = actionSource.actionKey
        stroke = 'rgba(14, 165, 233, 0.72)'
      }
    } else if (call.agentRunId) {
      const sourceSubagent = record.subagents.find(
        (item) => item.childAgentRunId === call.agentRunId
      )
      if (sourceSubagent) {
        source = `subagent:${sourceSubagent.partId}`
        label = '专项分支'
        stroke = withAlpha(
          pickSubagentColor(sourceSubagent.childAgentRunId ?? sourceSubagent.partId),
          0.78
        )
      }
    }

    if (nodeIds.has(source)) {
      edges.push(createEdge(`edge:${source}:${target}`, source, target, label, stroke))
      outgoing.add(source)
    }
  }

  for (const item of record.functioncalls) {
    const kind = item.actionKind === 'functioncall' ? 'functioncall' : 'action'
    const target = `${kind}:${item.id}`
    if (!nodeIds.has(target)) {
      continue
    }

    const source = record.calls
      .filter(
        (call) =>
          call.agentRunId === item.agentRunId && call.createdAt.localeCompare(item.createdAt) <= 0
      )
      .sort((left, right) => left.seq - right.seq)
      .at(-1)?.id

    const sourceId = source ? `llm:${source}` : userNodeId
    const label = kind === 'action' ? 'action' : 'functioncall'
    const stroke = kind === 'action' ? 'rgba(99, 102, 241, 0.72)' : 'rgba(20, 184, 166, 0.72)'
    if (nodeIds.has(sourceId)) {
      edges.push(createEdge(`edge:${sourceId}:${target}`, sourceId, target, label, stroke))
      outgoing.add(sourceId)
    }
  }

  for (const item of record.subagents) {
    const target = `subagent:${item.partId}`
    const source = item.sourceFunctioncallId ? `action:${item.sourceFunctioncallId}` : userNodeId
    if (!nodeIds.has(target) || !nodeIds.has(source)) {
      continue
    }

    edges.push(
      createEdge(
        `edge:${source}:${target}`,
        source,
        target,
        'subagent',
        withAlpha(pickSubagentColor(item.childAgentRunId ?? item.partId), 0.78)
      )
    )
    outgoing.add(source)
  }

  const terminalNodes = nodes.filter(
    (node) => node.kind !== 'user-query' && node.kind !== 'runtime-hub' && !outgoing.has(node.id)
  )

  if (terminalNodes.length === 0 && nodeIds.has(userNodeId) && nodeIds.has(hubNodeId)) {
    edges.push(
      createEdge(
        `edge:${userNodeId}:${hubNodeId}`,
        userNodeId,
        hubNodeId,
        '汇总',
        'rgba(148, 163, 184, 0.56)'
      )
    )
  } else {
    terminalNodes.forEach((node) => {
      if (!nodeIds.has(hubNodeId)) {
        return
      }
      edges.push(
        createEdge(
          `edge:${node.id}:${hubNodeId}`,
          node.id,
          hubNodeId,
          node.kind === 'subagent' ? '分支回流' : '状态汇总',
          node.kind === 'subagent' ? withAlpha(node.accentColor, 0.78) : 'rgba(14, 165, 233, 0.72)'
        )
      )
    })
  }

  return edges
}

export function buildAgentRuntimeGraph(
  record: ChatDetailShellRecord
): ChatDetailRuntimeGraph | null {
  const userNode = createUserNode(record)
  const runtimeNodes: ChatDetailRuntimeNode[] = [userNode]

  record.calls.forEach((call) => {
    runtimeNodes.push(createLlmNode(call))
  })

  record.functioncalls.forEach((item) => {
    const kind = item.actionKind === 'functioncall' ? 'functioncall' : 'action'
    runtimeNodes.push(createFunctionNode(item, kind))
  })

  record.subagents.forEach((item) => {
    runtimeNodes.push(createSubagentNode(item))
  })

  runtimeNodes.push(createHubNode(record))

  const layoutInputNodes = buildLayoutNodeInputs(runtimeNodes, record)
  const layoutInputEdges = buildLayoutEdges(record, runtimeNodes)
  const layout = layoutRuntimeGraph(layoutInputNodes, layoutInputEdges)
  const positionById = new Map(layout.nodes.map((node) => [node.id, node]))

  const nodes = runtimeNodes.map((node) => {
    const position = positionById.get(node.id)
    return {
      ...node,
      x: position?.x ?? 0,
      y: position?.y ?? 0
    }
  })

  const edges: ChatDetailRuntimeEdge[] = layout.edges

  return {
    nodes,
    edges,
    canvasWidth: layout.canvasWidth,
    canvasHeight: layout.canvasHeight
  }
}

export function findPreferredRuntimeNodeId(
  graph: ChatDetailRuntimeGraph | null,
  focusAgentRunId: string
): string {
  if (!graph || graph.nodes.length === 0) {
    return ''
  }

  if (focusAgentRunId) {
    const preferred =
      graph.nodes.find((node) => node.childAgentRunId === focusAgentRunId) ??
      graph.nodes.find(
        (node) => node.agentRunId === focusAgentRunId && node.kind !== 'runtime-hub'
      ) ??
      graph.nodes.find((node) => node.agentRunId === focusAgentRunId)
    if (preferred) {
      return preferred.id
    }
  }

  return (
    graph.nodes.find((node) => node.kind === 'runtime-hub')?.id ??
    graph.nodes.find((node) => node.kind === 'llm-call')?.id ??
    graph.nodes[0]?.id ??
    ''
  )
}

export function findNodeById(
  graph: ChatDetailRuntimeGraph | null,
  nodeId: string
): ChatDetailRuntimeNode | null {
  if (!graph || !nodeId) {
    return null
  }
  return graph.nodes.find((node) => node.id === nodeId) ?? null
}

export function getFirstDrawerSectionId(
  node: ChatDetailRuntimeNode | null
): ChatDetailRuntimeDrawerSectionId {
  return node?.drawerSections[0]?.id ?? 'summary'
}
