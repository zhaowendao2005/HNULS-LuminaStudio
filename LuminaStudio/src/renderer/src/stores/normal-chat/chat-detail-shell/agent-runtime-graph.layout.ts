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
  triggerLlmNodeId: string | null
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

interface RuntimeCorridor {
  id: string
  parentCorridorId: string | null
  ownerRunId: string | null
  baselineY: number
  usedUp: number
  usedDown: number
  nextDirection: 'down' | 'up'
}

interface BranchAnchorState {
  centerY: number
  usedUp: number
  usedDown: number
  nextDirection: 'down' | 'up'
}

const LEFT_PADDING = 64
const RIGHT_PADDING = 160
const TOP_PADDING = 80
const BOTTOM_PADDING = 120
const COLUMN_STEP_X = 384
const MAIN_AXIS_BASELINE_Y = 360
const CHILD_CORRIDOR_STEP_Y = 296
const BRANCH_RING_STEP_Y = 216

function buildNodeById(nodes: RuntimeLayoutNodeInput[]): Map<string, RuntimeLayoutNodeInput> {
  return new Map(nodes.map((node) => [node.id, node]))
}

function reserveChildCorridorBaseline(parentCorridor: RuntimeCorridor): number {
  const direction = parentCorridor.nextDirection
  parentCorridor.nextDirection = direction === 'down' ? 'up' : 'down'

  if (direction === 'down') {
    parentCorridor.usedDown += 1
    return parentCorridor.baselineY + parentCorridor.usedDown * CHILD_CORRIDOR_STEP_Y
  }

  parentCorridor.usedUp += 1
  return parentCorridor.baselineY - parentCorridor.usedUp * CHILD_CORRIDOR_STEP_Y
}

function resolveParentCorridorId(
  node: RuntimeLayoutNodeInput,
  nodeById: Map<string, RuntimeLayoutNodeInput>,
  corridorIdByRunId: Map<string, string>
): string {
  if (node.sourceActionNodeId) {
    const sourceActionNode = nodeById.get(node.sourceActionNodeId)
    const parentRunId = sourceActionNode?.agentRunId
    if (parentRunId) {
      return corridorIdByRunId.get(parentRunId) ?? 'main-corridor'
    }
  }

  if (node.triggerLlmNodeId) {
    const triggerLlmNode = nodeById.get(node.triggerLlmNodeId)
    const parentRunId = triggerLlmNode?.agentRunId
    if (parentRunId) {
      return corridorIdByRunId.get(parentRunId) ?? 'main-corridor'
    }
  }

  return 'main-corridor'
}

function buildCorridorMap(nodes: RuntimeLayoutNodeInput[]): {
  corridorById: Map<string, RuntimeCorridor>
  corridorIdByRunId: Map<string, string>
} {
  const nodeById = buildNodeById(nodes)
  const corridorById = new Map<string, RuntimeCorridor>()
  const corridorIdByRunId = new Map<string, string>()

  corridorById.set('main-corridor', {
    id: 'main-corridor',
    parentCorridorId: null,
    ownerRunId: null,
    baselineY: MAIN_AXIS_BASELINE_Y,
    usedUp: 0,
    usedDown: 0,
    nextDirection: 'down'
  })

  const subagentNodes = [...nodes]
    .filter((node) => node.kind === 'subagent')
    .sort((left, right) => left.appearanceOrder - right.appearanceOrder)

  for (const node of subagentNodes) {
    const corridorId = `corridor:${node.id}`
    const parentCorridorId = resolveParentCorridorId(node, nodeById, corridorIdByRunId)
    const parentCorridor = corridorById.get(parentCorridorId) ?? corridorById.get('main-corridor')
    if (!parentCorridor) {
      continue
    }

    corridorById.set(corridorId, {
      id: corridorId,
      parentCorridorId,
      ownerRunId: node.childAgentRunId,
      baselineY: reserveChildCorridorBaseline(parentCorridor),
      usedUp: 0,
      usedDown: 0,
      nextDirection: 'down'
    })

    if (node.childAgentRunId) {
      corridorIdByRunId.set(node.childAgentRunId, corridorId)
    }
  }

  return { corridorById, corridorIdByRunId }
}

function resolveCorridorIdForNode(
  node: RuntimeLayoutNodeInput,
  corridorIdByRunId: Map<string, string>
): string {
  if (node.kind === 'user-query' || node.kind === 'runtime-hub') {
    return 'main-corridor'
  }

  if (node.kind === 'subagent') {
    return node.childAgentRunId
      ? (corridorIdByRunId.get(node.childAgentRunId) ?? 'main-corridor')
      : 'main-corridor'
  }

  if (!node.agentRunId) {
    return 'main-corridor'
  }

  return corridorIdByRunId.get(node.agentRunId) ?? 'main-corridor'
}

function reserveBranchCenterY(
  stateByAnchorId: Map<string, BranchAnchorState>,
  anchorId: string,
  anchorCenterY: number
): number {
  const state = stateByAnchorId.get(anchorId) ?? {
    centerY: anchorCenterY,
    usedUp: 0,
    usedDown: 0,
    nextDirection: 'down' as const
  }

  state.centerY = anchorCenterY

  const direction = state.nextDirection
  state.nextDirection = direction === 'down' ? 'up' : 'down'

  let centerY = anchorCenterY
  if (direction === 'down') {
    state.usedDown += 1
    centerY += state.usedDown * BRANCH_RING_STEP_Y
  } else {
    state.usedUp += 1
    centerY -= state.usedUp * BRANCH_RING_STEP_Y
  }

  stateByAnchorId.set(anchorId, state)
  return centerY
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
  const { corridorById, corridorIdByRunId } = buildCorridorMap(nodes)
  const orderedNodes = [...nodes].sort(
    (left, right) => left.appearanceOrder - right.appearanceOrder
  )
  const positions: RuntimeLayoutNodeResult[] = []
  const positionById = new Map<string, RuntimeLayoutNodeResult>()
  const branchStateByAnchorId = new Map<string, BranchAnchorState>()
  let maxRight = 0
  let minTop = Number.POSITIVE_INFINITY
  let maxBottom = 0

  for (const node of orderedNodes) {
    const corridorId = resolveCorridorIdForNode(node, corridorIdByRunId)
    const corridor = corridorById.get(corridorId) ?? corridorById.get('main-corridor')!
    const x = LEFT_PADDING + node.appearanceOrder * COLUMN_STEP_X

    let centerY = corridor.baselineY
    if (node.kind === 'action' || node.kind === 'functioncall') {
      const anchorNode = node.triggerLlmNodeId ? nodeById.get(node.triggerLlmNodeId) : null
      const anchorPosition = node.triggerLlmNodeId ? positionById.get(node.triggerLlmNodeId) : null
      const anchorCenterY =
        anchorNode && anchorPosition ? anchorPosition.y + anchorNode.height / 2 : corridor.baselineY
      centerY = reserveBranchCenterY(
        branchStateByAnchorId,
        node.triggerLlmNodeId ?? `branch:${corridorId}`,
        anchorCenterY
      )
    }

    const y = centerY - node.height / 2
    positions.push({ id: node.id, x, y })
    positionById.set(node.id, { id: node.id, x, y })
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
