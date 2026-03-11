import {
  OFBlockEnum,
  resolveOFNodeDefinition,
  type OFEdge,
  type OFNode
} from '@shared/Orchestraflow-types'

export const ITERATION_MIN_WIDTH = 560
export const ITERATION_MIN_HEIGHT = 360
export const ITERATION_RESIZE_PADDING_X = 36
export const ITERATION_RESIZE_PADDING_Y = 36

const NESTED_NODE_DEFAULT_SIZES: Record<string, { width: number; height: number }> = {
  'iteration-start': { width: 60, height: 60 },
  'loop-start': { width: 60, height: 60 },
  start: { width: 60, height: 60 },
  llm: { width: 312, height: 108 },
  'variable-assign': { width: 248, height: 124 },
  ifelse: { width: 240, height: 120 },
  end: { width: 180, height: 84 }
}

// 去重节点，避免同一个 id 被重复塞进当前画布状态。
export function dedupeNodes(sourceNodes: OFNode[]): OFNode[] {
  const nodeMap = new Map<string, OFNode>()
  sourceNodes.forEach((node) => {
    nodeMap.set(node.id, node)
  })
  return Array.from(nodeMap.values())
}

// 去重边，规则与节点一致，始终以最新一份为准。
export function dedupeEdges(sourceEdges: OFEdge[]): OFEdge[] {
  const edgeMap = new Map<string, OFEdge>()
  sourceEdges.forEach((edge) => {
    edgeMap.set(edge.id, edge)
  })
  return Array.from(edgeMap.values())
}

// 当前 store 里大量逻辑都需要深拷贝节点/边，统一收口避免重复写法。
export function cloneNode<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function cloneEdge(edge: OFEdge): OFEdge {
  return cloneNode(edge)
}

export function getNestedNodeFootprint(node: OFNode): { width: number; height: number } {
  const fromData = {
    width: Number(node.data.width || 0),
    height: Number(node.data.height || 0)
  }

  if (fromData.width > 0 && fromData.height > 0) {
    return fromData
  }

  return NESTED_NODE_DEFAULT_SIZES[node.type] || { width: 240, height: 96 }
}

export function createDefaultNodeData(
  type: OFBlockEnum,
  nodeId: string,
  title: string
): OFNode['data'] {
  const definition = resolveOFNodeDefinition(type)
  if (!('createDefaultData' in definition.editor)) {
    throw new Error(`Node type cannot be created directly from editor defaults: ${type}`)
  }

  return definition.editor.createDefaultData({ nodeId, title })
}

export function normalizeNode(node: OFNode): OFNode {
  const definition = resolveOFNodeDefinition(node.data.type)
  return {
    ...node,
    type: definition.meta.vueFlowType,
    data: definition.editor.normalizeData({
      node,
      helpers: {
        normalizeNode
      }
    })
  }
}
