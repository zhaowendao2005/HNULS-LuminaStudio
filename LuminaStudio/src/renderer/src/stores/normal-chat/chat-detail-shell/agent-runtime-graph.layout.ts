import type { ChatDetailRuntimeNodeKind } from './chat-detail-shell.types'

export type RuntimeEdgeAnchorSide = 'left' | 'right'

export interface RuntimeLayoutNodeInput {
  id: string
  kind: ChatDetailRuntimeNodeKind
  width: number
  height: number
  appearanceOrder: number
  agentRunId: string | null
  childAgentRunId: string | null
  sourceActionNodeId: string | null
}

export interface RuntimeLayoutEdgeInput {
  id: string
  source: string
  target: string
  label: string
  dashed: boolean
  stroke: string
}

export interface RuntimeLayoutNodeResult {
  id: string
  x: number
  y: number
}

export interface RuntimeLayoutEdgeResult extends RuntimeLayoutEdgeInput {
  sourceAnchorSide: RuntimeEdgeAnchorSide
  targetAnchorSide: RuntimeEdgeAnchorSide
}

export interface RuntimeLayoutResult {
  nodes: RuntimeLayoutNodeResult[]
  edges: RuntimeLayoutEdgeResult[]
  canvasWidth: number
  canvasHeight: number
}

interface RuntimeAxis {
  id: string
  parentAxisId: string | null
  nodeId: string | null
  ownerRunId: string | null
  baselineY: number
  reservedUp: number
  reservedDown: number
  usedUp: number
  usedDown: number
  nextDirection: 'down' | 'up'
}

const LEFT_PADDING = 64
const RIGHT_PADDING = 160
const TOP_PADDING = 80
const BOTTOM_PADDING = 120
const COLUMN_STEP_X = 384
const AXIS_CORRIDOR_HEIGHT = 220
const AXIS_OUTER_GAP_Y = 56
const INITIAL_RESERVED_CHILD_CORRIDOR_PER_SIDE = 1
const NOISE_AMPLITUDE_Y = 18
const BUCKET_STACK_STEP_Y = 28
const MAIN_AXIS_BASELINE_Y = 360

function hashSeed(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function computeNoise(seed: string): number {
  const normalized = hashSeed(seed) / 0xffffffff
  return Math.round((normalized * 2 - 1) * NOISE_AMPLITUDE_Y)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function buildNodeById(nodes: RuntimeLayoutNodeInput[]): Map<string, RuntimeLayoutNodeInput> {
  return new Map(nodes.map((node) => [node.id, node]))
}

function buildAxisMap(nodes: RuntimeLayoutNodeInput[]): Map<string, RuntimeAxis> {
  const axisById = new Map<string, RuntimeAxis>()
  const axisByRunId = new Map<string, string>()

  axisById.set('main-axis', {
    id: 'main-axis',
    parentAxisId: null,
    nodeId: null,
    ownerRunId: null,
    baselineY: MAIN_AXIS_BASELINE_Y,
    reservedUp: INITIAL_RESERVED_CHILD_CORRIDOR_PER_SIDE,
    reservedDown: INITIAL_RESERVED_CHILD_CORRIDOR_PER_SIDE,
    usedUp: 0,
    usedDown: 0,
    nextDirection: 'down'
  })

  const subagentNodes = [...nodes]
    .filter((node) => node.kind === 'subagent')
    .sort((left, right) => left.appearanceOrder - right.appearanceOrder)

  for (const node of subagentNodes) {
    const parentAxisId =
      node.sourceActionNodeId != null
        ? (axisByRunId.get(node.sourceActionNodeId) ??
          resolveParentAxisId(node.sourceActionNodeId, nodes, axisByRunId))
        : 'main-axis'

    const resolvedParentAxisId = parentAxisId ?? 'main-axis'
    const parentAxis = axisById.get(resolvedParentAxisId)
    if (!parentAxis) {
      continue
    }

    const baselineY = reserveAxisBaseline(parentAxis)
    const axisId = `axis:${node.id}`
    axisById.set(axisId, {
      id: axisId,
      parentAxisId: resolvedParentAxisId,
      nodeId: node.id,
      ownerRunId: node.childAgentRunId,
      baselineY,
      reservedUp: INITIAL_RESERVED_CHILD_CORRIDOR_PER_SIDE,
      reservedDown: INITIAL_RESERVED_CHILD_CORRIDOR_PER_SIDE,
      usedUp: 0,
      usedDown: 0,
      nextDirection: 'down'
    })

    if (node.childAgentRunId) {
      axisByRunId.set(node.childAgentRunId, axisId)
    }
  }

  return axisById
}

function resolveParentAxisId(
  sourceActionNodeId: string,
  nodes: RuntimeLayoutNodeInput[],
  axisByRunId: Map<string, string>
): string | null {
  const sourceAction = nodes.find((node) => node.id === sourceActionNodeId)
  if (!sourceAction) {
    return null
  }

  if (!sourceAction.agentRunId) {
    return 'main-axis'
  }

  return axisByRunId.get(sourceAction.agentRunId) ?? 'main-axis'
}

function reserveAxisBaseline(parentAxis: RuntimeAxis): number {
  const direction = parentAxis.nextDirection
  parentAxis.nextDirection = direction === 'down' ? 'up' : 'down'

  if (direction === 'down') {
    parentAxis.usedDown += 1
    const distance = parentAxis.usedDown * (AXIS_CORRIDOR_HEIGHT + AXIS_OUTER_GAP_Y)
    return parentAxis.baselineY + distance
  }

  parentAxis.usedUp += 1
  const distance = parentAxis.usedUp * (AXIS_CORRIDOR_HEIGHT + AXIS_OUTER_GAP_Y)
  return parentAxis.baselineY - distance
}

function resolveAxisIdForNode(
  node: RuntimeLayoutNodeInput,
  nodes: RuntimeLayoutNodeInput[],
  axisById: Map<string, RuntimeAxis>
): string {
  if (node.kind === 'runtime-hub' || node.kind === 'user-query') {
    return 'main-axis'
  }

  if (node.kind === 'subagent') {
    return `axis:${node.id}`
  }

  if (!node.agentRunId) {
    return 'main-axis'
  }

  for (const axis of axisById.values()) {
    if (axis.ownerRunId === node.agentRunId) {
      return axis.id
    }
  }

  const sourceSubagent = nodes.find((item) => item.childAgentRunId === node.agentRunId)
  return sourceSubagent ? `axis:${sourceSubagent.id}` : 'main-axis'
}

export function layoutRuntimeGraph(
  nodes: RuntimeLayoutNodeInput[],
  edges: RuntimeLayoutEdgeInput[]
): RuntimeLayoutResult {
  if (nodes.length === 0) {
    return {
      nodes: [],
      edges: [],
      canvasWidth: LEFT_PADDING + RIGHT_PADDING,
      canvasHeight: 0
    }
  }

  const nodeById = buildNodeById(nodes)
  const axisById = buildAxisMap(nodes)
  const positions: RuntimeLayoutNodeResult[] = []
  const bucketIndexByAxisAndOrder = new Map<string, number>()
  let maxRight = 0
  let minTop = Number.POSITIVE_INFINITY
  let maxBottom = 0

  const orderedNodes = [...nodes].sort(
    (left, right) => left.appearanceOrder - right.appearanceOrder
  )

  for (const node of orderedNodes) {
    const axisId = resolveAxisIdForNode(node, orderedNodes, axisById)
    const axis = axisById.get(axisId) ?? axisById.get('main-axis')!
    const bucketKey = `${axisId}:${node.appearanceOrder}`
    const bucketIndex = bucketIndexByAxisAndOrder.get(bucketKey) ?? 0
    bucketIndexByAxisAndOrder.set(bucketKey, bucketIndex + 1)

    const laneOffset = bucketIndex * BUCKET_STACK_STEP_Y
    const centeredOffset = bucketIndex % 2 === 0 ? laneOffset / 2 : -(laneOffset / 2)
    const unclampedY = axis.baselineY - node.height / 2 + centeredOffset + computeNoise(node.id)
    const minY = axis.baselineY - AXIS_CORRIDOR_HEIGHT / 2
    const maxY = axis.baselineY + AXIS_CORRIDOR_HEIGHT / 2 - node.height
    const y = clamp(unclampedY, minY, maxY)
    const x = LEFT_PADDING + node.appearanceOrder * COLUMN_STEP_X

    positions.push({ id: node.id, x, y })
    maxRight = Math.max(maxRight, x + node.width)
    minTop = Math.min(minTop, y)
    maxBottom = Math.max(maxBottom, y + node.height)
  }

  const layoutEdges: RuntimeLayoutEdgeResult[] = edges
    .filter((edge) => nodeById.has(edge.source) && nodeById.has(edge.target))
    .map((edge) => ({
      ...edge,
      sourceAnchorSide: 'right',
      targetAnchorSide: 'left'
    }))

  return {
    nodes: positions,
    edges: layoutEdges,
    canvasWidth: Math.max(maxRight + RIGHT_PADDING, LEFT_PADDING + RIGHT_PADDING),
    canvasHeight: Math.max(
      maxBottom - minTop + TOP_PADDING + BOTTOM_PADDING,
      MAIN_AXIS_BASELINE_Y + BOTTOM_PADDING
    )
  }
}
