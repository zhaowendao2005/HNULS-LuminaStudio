import type { OFBlueprintEdge, OFBlueprintNode, OFBlueprintWorkflow } from './types'

export interface OFBlueprintScopeTarget {
  containerNodeId?: string
}

export interface OFBlueprintNodePatchOperation {
  type: 'patch-node'
  nodeId: string
  patch: Partial<Omit<OFBlueprintNode, 'id' | 'type'>> & {
    config?: Record<string, unknown>
  }
  scope?: OFBlueprintScopeTarget
}

export interface OFBlueprintAddNodeOperation {
  type: 'add-node'
  node: OFBlueprintNode
  scope?: OFBlueprintScopeTarget
}

export interface OFBlueprintRemoveNodeOperation {
  type: 'remove-node'
  nodeId: string
  scope?: OFBlueprintScopeTarget
}

export interface OFBlueprintRenameNodeOperation {
  type: 'rename-node'
  nodeId: string
  nextNodeId: string
  scope?: OFBlueprintScopeTarget
}

export interface OFBlueprintAddEdgeOperation {
  type: 'add-edge'
  edge: OFBlueprintEdge
  scope?: OFBlueprintScopeTarget
}

export interface OFBlueprintRemoveEdgeOperation {
  type: 'remove-edge'
  edgeId?: string
  fromNodeId?: string
  toNodeId?: string
  scope?: OFBlueprintScopeTarget
}

export interface OFBlueprintPatchEdgeOperation {
  type: 'patch-edge'
  edgeId?: string
  fromNodeId?: string
  toNodeId?: string
  patch: Partial<OFBlueprintEdge>
  scope?: OFBlueprintScopeTarget
}

export interface OFBlueprintUpdateSelectorOperation {
  type: 'update-selector'
  nodeId: string
  configPath: string[]
  selector: string[]
  scope?: OFBlueprintScopeTarget
}

export interface OFBlueprintRenameVariableOperation {
  type: 'rename-variable'
  current: string
  next: string
  scope?: OFBlueprintScopeTarget
}

export interface OFBlueprintEnterSubgraphOperation {
  type: 'enter-subgraph'
  nodeId: string
}

export interface OFBlueprintExitSubgraphOperation {
  type: 'exit-subgraph'
}

export type OFBlueprintEditOperation =
  | OFBlueprintNodePatchOperation
  | OFBlueprintAddNodeOperation
  | OFBlueprintRemoveNodeOperation
  | OFBlueprintRenameNodeOperation
  | OFBlueprintAddEdgeOperation
  | OFBlueprintRemoveEdgeOperation
  | OFBlueprintPatchEdgeOperation
  | OFBlueprintUpdateSelectorOperation
  | OFBlueprintRenameVariableOperation
  | OFBlueprintEnterSubgraphOperation
  | OFBlueprintExitSubgraphOperation

function cloneBlueprint(workflow: OFBlueprintWorkflow): OFBlueprintWorkflow {
  return JSON.parse(JSON.stringify(workflow)) as OFBlueprintWorkflow
}

function getGraphByScope(
  workflow: OFBlueprintWorkflow,
  scope?: OFBlueprintScopeTarget
): OFBlueprintWorkflow | NonNullable<OFBlueprintNode['subgraph']> {
  if (!scope?.containerNodeId) {
    return workflow
  }
  const container = findNodeById(workflow.nodes, scope.containerNodeId)
  if (!container?.subgraph) {
    throw new Error(`Container node not found for scope: ${scope.containerNodeId}`)
  }
  return container.subgraph
}

function findNodeById(nodes: OFBlueprintNode[], nodeId: string): OFBlueprintNode | undefined {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node
    }
    if (node.subgraph) {
      const nested = findNodeById(node.subgraph.nodes, nodeId)
      if (nested) {
        return nested
      }
    }
  }
  return undefined
}

function rewriteRootSegment(segment: string, current: string, next: string): string {
  if (segment === current) {
    return next
  }
  if (segment.startsWith(`${current}.`)) {
    return `${next}${segment.slice(current.length)}`
  }
  return segment
}

function replaceSelectorRoot(value: unknown, current: string, next: string): unknown {
  if (Array.isArray(value)) {
    return value.map((item, index) => {
      if (index === 0 && typeof item === 'string') {
        return rewriteRootSegment(item, current, next)
      }
      return replaceSelectorRoot(item, current, next)
    })
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return Object.fromEntries(
      Object.entries(record).map(([key, child]) => [key, replaceSelectorRoot(child, current, next)])
    )
  }
  if (typeof value === 'string') {
    return rewriteRootSegment(value, current, next)
  }
  return value
}

function renameVariableFields(value: unknown, current: string, next: string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => renameVariableFields(item, current, next))
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const nextRecord = Object.fromEntries(
      Object.entries(record).map(([key, child]) => [
        key,
        renameVariableFields(child, current, next)
      ])
    )
    for (const key of ['variable', 'target_variable', 'label', 'target_label']) {
      if (nextRecord[key] === current) {
        nextRecord[key] = next
      }
    }
    return nextRecord
  }
  return value === current ? next : value
}

function updateConfigPath(
  target: Record<string, unknown>,
  configPath: string[],
  value: unknown
): Record<string, unknown> {
  const nextTarget = JSON.parse(JSON.stringify(target)) as Record<string, unknown>
  let cursor: Record<string, unknown> = nextTarget
  configPath.forEach((segment, index) => {
    if (index === configPath.length - 1) {
      cursor[segment] = value
      return
    }
    if (!cursor[segment] || typeof cursor[segment] !== 'object' || Array.isArray(cursor[segment])) {
      cursor[segment] = {}
    }
    cursor = cursor[segment] as Record<string, unknown>
  })
  return nextTarget
}

function matchEdge(
  edge: OFBlueprintEdge,
  operation: OFBlueprintRemoveEdgeOperation | OFBlueprintPatchEdgeOperation
): boolean {
  if (operation.edgeId && edge.id === operation.edgeId) {
    return true
  }
  return edge.from.node === operation.fromNodeId && edge.to.node === operation.toNodeId
}

export function applyOFBlueprintEditOperation(
  workflow: OFBlueprintWorkflow,
  operation: OFBlueprintEditOperation
): OFBlueprintWorkflow {
  const nextWorkflow = cloneBlueprint(workflow)
  const graph = getGraphByScope(nextWorkflow, 'scope' in operation ? operation.scope : undefined)
  const nodes = graph.nodes
  const edges = graph.edges

  switch (operation.type) {
    case 'add-node':
      nodes.push(operation.node)
      return nextWorkflow
    case 'patch-node': {
      const node = nodes.find((item) => item.id === operation.nodeId)
      if (!node) return nextWorkflow
      Object.assign(node, {
        ...operation.patch,
        config: operation.patch.config
          ? {
              ...node.config,
              ...operation.patch.config
            }
          : node.config
      })
      return nextWorkflow
    }
    case 'remove-node': {
      const remainingNodeIds = new Set(
        nodes.filter((item) => item.id !== operation.nodeId).map((item) => item.id)
      )
      graph.nodes = nodes.filter((item) => item.id !== operation.nodeId)
      graph.edges = edges.filter(
        (edge) => remainingNodeIds.has(edge.from.node) && remainingNodeIds.has(edge.to.node)
      )
      return nextWorkflow
    }
    case 'rename-node': {
      const node = nodes.find((item) => item.id === operation.nodeId)
      if (!node) return nextWorkflow
      node.id = operation.nextNodeId
      graph.edges = edges.map((edge) => ({
        ...edge,
        id: edge.id,
        from: {
          ...edge.from,
          node: edge.from.node === operation.nodeId ? operation.nextNodeId : edge.from.node
        },
        to: {
          ...edge.to,
          node: edge.to.node === operation.nodeId ? operation.nextNodeId : edge.to.node
        }
      }))
      nextWorkflow.nodes = renameNodeSelectors(
        nextWorkflow.nodes,
        operation.nodeId,
        operation.nextNodeId
      )
      return nextWorkflow
    }
    case 'add-edge':
      edges.push(operation.edge)
      return nextWorkflow
    case 'remove-edge':
      graph.edges = edges.filter((edge) => !matchEdge(edge, operation))
      return nextWorkflow
    case 'patch-edge':
      graph.edges = edges.map((edge) =>
        matchEdge(edge, operation) ? { ...edge, ...operation.patch } : edge
      )
      return nextWorkflow
    case 'update-selector': {
      const node = nodes.find((item) => item.id === operation.nodeId)
      if (!node) return nextWorkflow
      node.config = updateConfigPath(node.config, operation.configPath, operation.selector)
      return nextWorkflow
    }
    case 'rename-variable':
      nextWorkflow.nodes = renameVariableAcrossNodes(
        nextWorkflow.nodes,
        operation.current,
        operation.next
      )
      return nextWorkflow
    case 'enter-subgraph':
    case 'exit-subgraph':
      return nextWorkflow
    default:
      return nextWorkflow
  }
}

function renameNodeSelectors(
  nodes: OFBlueprintNode[],
  current: string,
  next: string
): OFBlueprintNode[] {
  return nodes.map((node) => ({
    ...node,
    config: replaceSelectorRoot(node.config, current, next) as Record<string, unknown>,
    subgraph: node.subgraph
      ? {
          nodes: renameNodeSelectors(node.subgraph.nodes, current, next),
          edges: node.subgraph.edges.map((edge) => ({
            ...edge,
            from: {
              ...edge.from,
              node: edge.from.node === current ? next : edge.from.node
            },
            to: {
              ...edge.to,
              node: edge.to.node === current ? next : edge.to.node
            }
          }))
        }
      : undefined
  }))
}

function renameVariableAcrossNodes(
  nodes: OFBlueprintNode[],
  current: string,
  next: string
): OFBlueprintNode[] {
  return nodes.map((node) => ({
    ...node,
    config: renameVariableFields(node.config, current, next) as Record<string, unknown>,
    subgraph: node.subgraph
      ? {
          nodes: renameVariableAcrossNodes(node.subgraph.nodes, current, next),
          edges: node.subgraph.edges
        }
      : undefined
  }))
}

export function applyOFBlueprintEditOperations(
  workflow: OFBlueprintWorkflow,
  operations: OFBlueprintEditOperation[]
): OFBlueprintWorkflow {
  return operations.reduce((currentWorkflow, operation) => {
    return applyOFBlueprintEditOperation(currentWorkflow, operation)
  }, workflow)
}
