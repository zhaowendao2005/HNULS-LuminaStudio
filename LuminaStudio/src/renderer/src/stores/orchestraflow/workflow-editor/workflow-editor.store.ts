/**
 * OrchestraFlow 工作流编辑器 Store
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  OFControlMode,
  OFBlockEnum,
  OFNodeRunningStatus,
  buildIterationInnerStartVariables,
  buildLLMOutputVariables,
  buildIterationOutputVariables,
  normalizeOFVariableNamespace
} from '@shared/Orchestraflow-types'
import type {
  OFNode,
  OFEdge,
  OFStartNodeData,
  OFIterationStartNodeData,
  OFLLMNodeData,
  OFIterationNodeData,
  OFIfElseNodeData,
  OFEndNodeData
} from '@shared/Orchestraflow-types'
import type { NodeChange, EdgeChange } from '@vue-flow/core'
import { WorkflowEditorDataSource } from './workflow-editor.datasource'

const datasource = WorkflowEditorDataSource
const ITERATION_MIN_WIDTH = 560
const ITERATION_MIN_HEIGHT = 360
const ITERATION_DEFAULT_WIDTH = 650
const ITERATION_DEFAULT_HEIGHT = 417
const ITERATION_RESIZE_PADDING_X = 36
const ITERATION_RESIZE_PADDING_Y = 36
const DEFAULT_SUBGRAPH_VIEWPORT = { x: 0, y: 0, zoom: 1 }

const NESTED_NODE_DEFAULT_SIZES: Record<string, { width: number; height: number }> = {
  'iteration-start': { width: 60, height: 60 },
  start: { width: 60, height: 60 },
  llm: { width: 312, height: 108 },
  ifelse: { width: 240, height: 120 },
  end: { width: 180, height: 84 }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getDefaultNodeTitle(type: OFBlockEnum): string {
  switch (type) {
    case OFBlockEnum.LLM:
      return 'llm'
    case OFBlockEnum.Iteration:
      return '迭代'
    case OFBlockEnum.IterationStart:
      return '迭代开始'
    case OFBlockEnum.IfElse:
      return '条件分支'
    case OFBlockEnum.Start:
      return '开始'
    case OFBlockEnum.End:
      return '结束'
    default:
      return 'node'
  }
}

function normalizeNodeTitle(type: OFBlockEnum, raw: string | undefined): string {
  const trimmed = String(raw || '').trim()
  if (type === OFBlockEnum.LLM) {
    return normalizeOFVariableNamespace(trimmed, 'llm')
  }
  return trimmed || getDefaultNodeTitle(type)
}

function createIterationStartNode(
  iterationNodeId: string,
  iterationTitle: string
): OFNode {
  return {
    id: `${iterationNodeId}-iteration-start`,
    type: 'iteration-start',
    parentNode: iterationNodeId,
    extent: 'parent',
    position: { x: 24, y: 82 },
    data: {
      title: '迭代开始',
      desc: '迭代开始',
      type: OFBlockEnum.IterationStart,
      input: {
        variables: buildIterationInnerStartVariables(iterationTitle, iterationNodeId)
      }
    } as OFIterationStartNodeData
  }
}

function createDefaultIterationSubgraph(
  iterationNodeId: string,
  iterationTitle: string
): OFIterationNodeData['subgraph'] {
  return {
    nodes: [createIterationStartNode(iterationNodeId, iterationTitle)],
    edges: [],
    viewport: { ...DEFAULT_SUBGRAPH_VIEWPORT }
  }
}

function dedupeNodes(sourceNodes: OFNode[]): OFNode[] {
  const nodeMap = new Map<string, OFNode>()
  sourceNodes.forEach((node) => {
    nodeMap.set(node.id, node)
  })
  return Array.from(nodeMap.values())
}

function dedupeEdges(sourceEdges: OFEdge[]): OFEdge[] {
  const edgeMap = new Map<string, OFEdge>()
  sourceEdges.forEach((edge) => {
    edgeMap.set(edge.id, edge)
  })
  return Array.from(edgeMap.values())
}

function cloneNode<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function getNestedNodeFootprint(node: OFNode): { width: number; height: number } {
  const fromData = {
    width: Number(node.data.width || 0),
    height: Number(node.data.height || 0)
  }

  if (fromData.width > 0 && fromData.height > 0) {
    return fromData
  }

  return NESTED_NODE_DEFAULT_SIZES[node.type] || { width: 240, height: 96 }
}

function buildCommonNodeShape<T extends { title?: string; desc?: string; width?: number; height?: number }>(
  raw: T,
  title: string,
  fallbackDesc = ''
) {
  return {
    title,
    desc: raw.desc || fallbackDesc,
    width: raw.width,
    height: raw.height
  }
}

function normalizeIterationStartNode(
  node: OFNode,
  iterationNodeId: string,
  iterationTitle: string
): OFNode {
  const data = node.data as Partial<OFIterationStartNodeData>

  return {
    ...node,
    type: 'iteration-start',
    parentNode: iterationNodeId,
    extent: 'parent',
    data: {
      ...buildCommonNodeShape(data, '迭代开始', '迭代开始'),
      type: OFBlockEnum.IterationStart,
      input: {
        variables: buildIterationInnerStartVariables(iterationTitle, iterationNodeId)
      }
    } as OFIterationStartNodeData
  }
}

function normalizeIterationSubgraph(
  iterationNodeId: string,
  iterationTitle: string,
  subgraph?: Partial<OFIterationNodeData['subgraph']> | null
): OFIterationNodeData['subgraph'] {
  const baseSubgraph =
    subgraph?.nodes?.length || subgraph?.edges?.length
      ? subgraph
      : createDefaultIterationSubgraph(iterationNodeId, iterationTitle)

  const normalizedNodes = (baseSubgraph.nodes || []).map((childNode) => {
    const normalizedChildNode = {
      ...cloneNode(childNode),
      parentNode: childNode.parentNode || iterationNodeId,
      extent: childNode.extent || 'parent'
    } as OFNode

    if (
      normalizedChildNode.data.type === OFBlockEnum.IterationStart ||
      normalizedChildNode.data.type === OFBlockEnum.Start
    ) {
      return normalizeIterationStartNode(normalizedChildNode, iterationNodeId, iterationTitle)
    }

    return normalizeNode(normalizedChildNode)
  })

  const startNode =
    normalizedNodes.find((childNode) => childNode.data.type === OFBlockEnum.IterationStart) ||
    createIterationStartNode(iterationNodeId, iterationTitle)

  const nextNodes = normalizedNodes.some((childNode) => childNode.id === startNode.id)
    ? normalizedNodes.map((childNode) =>
        childNode.id === startNode.id
          ? normalizeIterationStartNode(childNode, iterationNodeId, iterationTitle)
          : childNode
      )
    : [startNode, ...normalizedNodes]

  return {
    nodes: nextNodes,
    edges: (baseSubgraph.edges || []).map((edge) => cloneNode(edge)),
    viewport: baseSubgraph.viewport || { ...DEFAULT_SUBGRAPH_VIEWPORT }
  }
}

function normalizeNode(node: OFNode): OFNode {
  if (node.data.type === OFBlockEnum.IterationStart) {
    return normalizeIterationStartNode(
      node,
      node.parentNode || node.id,
      node.parentNode || getDefaultNodeTitle(OFBlockEnum.Iteration)
    )
  }

  if (node.data.type === OFBlockEnum.LLM) {
    const data = node.data as Partial<OFLLMNodeData>
    const title = normalizeNodeTitle(OFBlockEnum.LLM, data.title)
    const structuredOutput = data.structured_output || {
      enabled: false,
      schema: null
    }
    return {
      ...node,
      data: {
        ...buildCommonNodeShape(data, title),
        type: OFBlockEnum.LLM,
        model: data.model || {
          provider: '',
          name: '',
          completion_params: {
            temperature: 1,
            top_p: 1
          }
        },
        prompt_template: data.prompt_template || [],
        context: data.context,
        memory: data.memory,
        vision: data.vision,
        structured_output: structuredOutput,
        output: {
          variables: buildLLMOutputVariables(title, structuredOutput)
        }
      } as OFLLMNodeData
    }
  }

  if (node.data.type === OFBlockEnum.Iteration) {
    const data = node.data as Partial<OFIterationNodeData>
    const title = normalizeNodeTitle(OFBlockEnum.Iteration, data.title)
    const subgraph = normalizeIterationSubgraph(node.id, title, data.subgraph)
    const startNode =
      subgraph.nodes.find((childNode) => childNode.data.type === OFBlockEnum.IterationStart) ||
      createIterationStartNode(node.id, title)

    return {
      ...node,
      data: {
        ...buildCommonNodeShape(data, title),
        type: OFBlockEnum.Iteration,
        width: data.width || ITERATION_DEFAULT_WIDTH,
        height: data.height || ITERATION_DEFAULT_HEIGHT,
        iterator_selector: data.iterator_selector || [],
        output_selector: data.output_selector || [],
        start_node_id: startNode.id,
        subgraph,
        parallel_mode: data.parallel_mode || 'sequential',
        parallel_nums: Math.max(1, Number(data.parallel_nums || 1)),
        error_handle_mode: data.error_handle_mode || 'terminated',
        flatten_output: data.flatten_output ?? true,
        output: {
          variables: buildIterationOutputVariables(title, node.id)
        }
      } as OFIterationNodeData
    }
  }

  if (node.data.type === OFBlockEnum.IfElse) {
    const data = node.data as Partial<OFIfElseNodeData>
    return {
      ...node,
      data: {
        ...buildCommonNodeShape(data, normalizeNodeTitle(OFBlockEnum.IfElse, data.title)),
        type: OFBlockEnum.IfElse,
        cases: data.cases || [],
        elseCase: data.elseCase || {
          handleId: 'else',
          label: 'ELSE'
        }
      } as OFIfElseNodeData
    }
  }

  return node
}

export const useWorkflowEditorStore = defineStore('orchestraflow-workflow-editor', () => {
  // State
  const nodes = ref<OFNode[]>([])
  const edges = ref<OFEdge[]>([])
  const selectedNodeId = ref<string | null>(null)
  const panelWidth = ref(400)
  const controlMode = ref<OFControlMode>(OFControlMode.Pointer)
  const viewport = ref({ x: 0, y: 0, zoom: 1 })
  const currentWorkflowId = ref<string | null>(null)

  // 防抖定时器
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  function getUniqueNodeTitle(
    type: OFBlockEnum,
    desiredTitle?: string,
    excludeNodeId?: string
  ): string {
    const baseTitle = normalizeNodeTitle(type, desiredTitle)
    const existingTitles = new Set(
      nodes.value
        .filter((node) => node.id !== excludeNodeId)
        .map((node) =>
          String(node.data.title || '')
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
    )

    if (!existingTitles.has(baseTitle.toLowerCase())) {
      return baseTitle
    }

    let index = 2
    let candidate = `${baseTitle}${index}`
    while (existingTitles.has(candidate.toLowerCase())) {
      index += 1
      candidate = `${baseTitle}${index}`
    }
    return candidate
  }

  function replaceNamespace(
    selector: string[] | undefined,
    oldNamespace: string,
    newNamespace: string
  ): string[] {
    if (!selector?.length) return selector || []
    return selector.map((segment, index) => {
      if (index !== 0) return segment
      if (segment === oldNamespace) return newNamespace
      if (segment.startsWith(`${oldNamespace}.`)) {
        return `${newNamespace}${segment.slice(oldNamespace.length)}`
      }
      return segment
    })
  }

  function replacePromptNamespace(
    text: string,
    oldNamespace: string,
    newNamespace: string
  ): string {
    const pattern = new RegExp(`(\\{\\{\\s*)${escapeRegExp(oldNamespace)}(?=\\.)`, 'g')
    return text.replace(pattern, `$1${newNamespace}`)
  }

  function syncNodeNamespaceReferences(
    oldNamespace: string,
    newNamespace: string,
    renamedNodeId: string
  ) {
    if (!oldNamespace || oldNamespace === newNamespace) return

    nodes.value = nodes.value.map((node) => {
      if (node.id === renamedNodeId) {
        return node
      }

      if (node.data.type === OFBlockEnum.LLM) {
        const data = node.data as OFLLMNodeData
        return {
          ...node,
          data: {
            ...data,
            prompt_template: (data.prompt_template || []).map((item) => ({
              ...item,
              text: replacePromptNamespace(item.text || '', oldNamespace, newNamespace)
            }))
          }
        }
      }

      if (node.data.type === OFBlockEnum.Iteration) {
        const data = node.data as OFIterationNodeData
        return {
          ...node,
          data: {
            ...data,
            iterator_selector: replaceNamespace(data.iterator_selector, oldNamespace, newNamespace),
            output_selector: replaceNamespace(data.output_selector, oldNamespace, newNamespace)
          }
        }
      }

      if (node.data.type === OFBlockEnum.IfElse) {
        const data = node.data as OFIfElseNodeData
        return {
          ...node,
          data: {
            ...data,
            cases: (data.cases || []).map((item) => ({
              ...item,
              conditions: (item.conditions || []).map((condition) => ({
                ...condition,
                variable_selector: replaceNamespace(
                  condition.variable_selector,
                  oldNamespace,
                  newNamespace
                ),
                variable_path:
                  condition.variable_path === oldNamespace
                    ? newNamespace
                    : condition.variable_path?.startsWith(`${oldNamespace}.`)
                      ? `${newNamespace}${condition.variable_path.slice(oldNamespace.length)}`
                      : condition.variable_path
              }))
            }))
          }
        }
      }

      return node
    })
  }

  // Actions
  async function loadWorkflow(workflowId: string) {
    currentWorkflowId.value = workflowId
    const data = await datasource.get(workflowId)
    const normalizedNodes = data.nodes.map(normalizeNode)
    const inflatedNodes = [...normalizedNodes]
    const inflatedEdges = [...data.edges]

    normalizedNodes.forEach((node) => {
      if (node.data.type !== OFBlockEnum.Iteration) return
      const subgraph = (node.data as OFIterationNodeData).subgraph
      subgraph.nodes.forEach((childNode) => {
        inflatedNodes.push(cloneNode(childNode))
      })
      subgraph.edges.forEach((childEdge) => {
        inflatedEdges.push(cloneEdge(childEdge))
      })
    })

    nodes.value = dedupeNodes(inflatedNodes)
    edges.value = dedupeEdges(inflatedEdges)
    nodes.value
      .filter((node) => node.data.type === OFBlockEnum.Iteration)
      .forEach((node) => syncIterationContainerSize(node.id))
  }

  async function saveWorkflow() {
    if (!currentWorkflowId.value) return
    const rootNodes = nodes.value.filter((node) => !node.parentNode)
    const rootNodeIds = new Set(rootNodes.map((node) => node.id))

    const nodesData = cloneNode(
      rootNodes.map((node) => {
        if (node.data.type !== OFBlockEnum.Iteration) {
          return node
        }

        const childNodes = nodes.value
          .filter((candidate) => candidate.parentNode === node.id)
          .map((candidate) => cloneNode(candidate))
        const childNodeIds = new Set(childNodes.map((candidate) => candidate.id))
        const childEdges = edges.value
          .filter((edge) => childNodeIds.has(edge.source) && childNodeIds.has(edge.target))
          .map((edge) => cloneEdge(edge))

        return {
          ...node,
          data: {
            ...(node.data as OFIterationNodeData),
            subgraph: {
              ...(node.data as OFIterationNodeData).subgraph,
              nodes: childNodes,
              edges: childEdges
            }
          }
        }
      })
    )
    const edgesData = cloneNode(
      edges.value.filter((edge) => rootNodeIds.has(edge.source) && rootNodeIds.has(edge.target))
    )
    await datasource.update(currentWorkflowId.value, { nodes: nodesData, edges: edgesData })
  }

  // 防抖保存（用于拖拽等高频操作）
  function scheduleSave() {
    if (saveTimer) {
      clearTimeout(saveTimer)
    }
    saveTimer = setTimeout(() => {
      saveWorkflow()
      saveTimer = null
    }, 1000) // 1 秒防抖
  }

  function cloneEdge(edge: OFEdge): OFEdge {
    return cloneNode(edge)
  }

  function findNodeByIdFrom(nodeId: string, sourceNodes: OFNode[]): OFNode | null {
    return sourceNodes.find((node) => node.id === nodeId) || null
  }

  function getNodeAncestorPath(nodeId: string): string[] {
    const path: string[] = []
    let currentNode = findNodeByIdFrom(nodeId, nodes.value)

    while (currentNode?.parentNode) {
      path.unshift(currentNode.parentNode)
      currentNode = findNodeByIdFrom(currentNode.parentNode, nodes.value)
    }

    return path
  }

  function findParentIterationNodeId(nodeId: string): string | null {
    const ancestorPath = getNodeAncestorPath(nodeId)

    for (let index = ancestorPath.length - 1; index >= 0; index -= 1) {
      const ancestorNode = findNodeByIdFrom(ancestorPath[index], nodes.value)
      if (ancestorNode?.data.type === OFBlockEnum.Iteration) {
        return ancestorNode.id
      }
    }

    return null
  }

  function isIterationLocalStart(nodeId: string): boolean {
    const targetNode = findNodeByIdFrom(nodeId, nodes.value)
    return targetNode?.data.type === OFBlockEnum.IterationStart
  }

  function getIterationChildNodes(iterationNodeId: string): OFNode[] {
    return nodes.value.filter((node) => node.parentNode === iterationNodeId)
  }

  function getNodeLayerKey(nodeId: string): string {
    const ancestorPath = getNodeAncestorPath(nodeId)
    return ancestorPath.join('/') || 'root'
  }

  function collectCascadeNodeIds(rootNodeId: string): Set<string> {
    const removedNodeIds = new Set<string>([rootNodeId])
    const pendingNodeIds = [rootNodeId]

    while (pendingNodeIds.length > 0) {
      const currentNodeId = pendingNodeIds.pop()!
      const currentNode = findNodeByIdFrom(currentNodeId, nodes.value)
      const subgraphNodes = (currentNode?.data as { subgraph?: { nodes?: OFNode[] } } | undefined)?.subgraph
        ?.nodes

      ;(subgraphNodes || []).forEach((childNode) => {
        if (!removedNodeIds.has(childNode.id)) {
          removedNodeIds.add(childNode.id)
          pendingNodeIds.push(childNode.id)
        }
      })
    }

    let changed = true

    while (changed) {
      changed = false
      nodes.value.forEach((node) => {
        if (node.parentNode && removedNodeIds.has(node.parentNode) && !removedNodeIds.has(node.id)) {
          removedNodeIds.add(node.id)
          changed = true
        }
      })
    }

    return removedNodeIds
  }

  function isDuplicateEdgeCandidate(edge: OFEdge): boolean {
    const layerKey = getNodeLayerKey(edge.source)
    return edges.value.some((candidate) => {
      return (
        candidate.source === edge.source &&
        candidate.target === edge.target &&
        (candidate.sourceHandle || null) === (edge.sourceHandle || null) &&
        (candidate.targetHandle || null) === (edge.targetHandle || null) &&
        getNodeLayerKey(candidate.source) === layerKey &&
        getNodeLayerKey(candidate.target) === layerKey
      )
    })
  }

  function buildIterationEdgeData(edge: OFEdge): OFEdge {
    const sourceNode = findNodeByIdFrom(edge.source, nodes.value)
    const targetNode = findNodeByIdFrom(edge.target, nodes.value)
    const sourceAncestorPath = sourceNode ? getNodeAncestorPath(sourceNode.id) : []
    const targetAncestorPath = targetNode ? getNodeAncestorPath(targetNode.id) : []
    const iterationId =
      sourceAncestorPath[sourceAncestorPath.length - 1] ||
      targetAncestorPath[targetAncestorPath.length - 1] ||
      undefined

    if (!sourceNode || !targetNode) {
      return edge
    }

    return {
      ...edge,
      class: iterationId ? 'of-edge-iteration' : edge.class,
      zIndex: iterationId ? 7 : edge.zIndex,
      data: {
        ...edge.data,
        isInIteration: Boolean(iterationId),
        iterationId,
        sourceType: sourceNode.data.type,
        targetType: targetNode.data.type
      }
    }
  }

  function syncIterationContainerSize(iterationNodeId: string) {
    const iterationNode = findNodeByIdFrom(iterationNodeId, nodes.value)
    if (!iterationNode || iterationNode.data.type !== OFBlockEnum.Iteration) return

    const childNodes = getIterationChildNodes(iterationNodeId)
    let nextWidth = Math.max(Number(iterationNode.data.width || 0), ITERATION_MIN_WIDTH)
    let nextHeight = Math.max(Number(iterationNode.data.height || 0), ITERATION_MIN_HEIGHT)

    childNodes.forEach((childNode) => {
      const size = getNestedNodeFootprint(childNode)
      nextWidth = Math.max(nextWidth, Math.round(childNode.position.x + size.width + ITERATION_RESIZE_PADDING_X))
      nextHeight = Math.max(
        nextHeight,
        Math.round(childNode.position.y + size.height + ITERATION_RESIZE_PADDING_Y)
      )
    })

    nodes.value = updateNodeCollection(nodes.value, iterationNodeId, {
      width: nextWidth,
      height: nextHeight
    })
  }

  function updateNodeCollection(
    sourceNodes: OFNode[],
    targetNodeId: string,
    patch: Partial<OFNode['data']>
  ): OFNode[] {
    return sourceNodes.map((node) => {
      if (node.id === targetNodeId) {
        return normalizeNode({
          ...node,
          data: {
            ...node.data,
            ...patch
          }
        } as OFNode)
      }
      return node
    })
  }

  function updateNodePositionCollection(
    sourceNodes: OFNode[],
    targetNodeId: string,
    position: { x: number; y: number }
  ): OFNode[] {
    return sourceNodes.map((node) => {
      if (node.id === targetNodeId) {
        return {
          ...node,
          position
        }
      }
      return node
    })
  }

  function resizeIterationNode(nodeId: string, width: number, height: number) {
    const childNodes = getIterationChildNodes(nodeId)
    let minWidth = ITERATION_MIN_WIDTH
    let minHeight = ITERATION_MIN_HEIGHT

    childNodes.forEach((childNode) => {
      const size = getNestedNodeFootprint(childNode)
      minWidth = Math.max(minWidth, Math.round(childNode.position.x + size.width + ITERATION_RESIZE_PADDING_X))
      minHeight = Math.max(
        minHeight,
        Math.round(childNode.position.y + size.height + ITERATION_RESIZE_PADDING_Y)
      )
    })

    nodes.value = updateNodeCollection(nodes.value, nodeId, {
      width: Math.max(minWidth, Math.round(width)),
      height: Math.max(minHeight, Math.round(height))
    })
    scheduleSave()
  }

  function updateIterationViewport(nodeId: string, viewportValue: { x: number; y: number; zoom: number }) {
    const target = findNodeByIdFrom(nodeId, nodes.value)
    if (!target || target.data.type !== OFBlockEnum.Iteration) return

    nodes.value = updateNodeCollection(nodes.value, nodeId, {
      subgraph: {
        ...(target.data as OFIterationNodeData).subgraph,
        viewport: viewportValue
      }
    } as Partial<OFIterationNodeData>)
  }

  function updateIterationChildPosition(
    iterationNodeId: string,
    childNodeId: string,
    position: { x: number; y: number }
  ) {
    nodes.value = updateNodePositionCollection(nodes.value, childNodeId, position)
    syncIterationContainerSize(iterationNodeId)
    scheduleSave()
  }

  function addIterationEdge(iterationNodeId: string, edge: OFEdge) {
    if (isDuplicateEdgeCandidate(edge)) return
    edges.value = [...edges.value, buildIterationEdgeData(edge)]
    syncIterationContainerSize(iterationNodeId)
    scheduleSave()
  }

  function moveNodeIntoIterationNode(
    nodeId: string,
    iterationNodeId: string,
    dropPosition: { x: number; y: number }
  ) {
    const movingNode = findNodeByIdFrom(nodeId, nodes.value)
    const targetIteration = findNodeByIdFrom(iterationNodeId, nodes.value)
    if (!movingNode || !targetIteration || targetIteration.data.type !== OFBlockEnum.Iteration) return
    if (nodeId === iterationNodeId) return
    if (
      movingNode.data.type === OFBlockEnum.Start ||
      movingNode.data.type === OFBlockEnum.IterationStart ||
      movingNode.data.type === OFBlockEnum.End
    ) {
      return
    }

    const hasConnectedEdges = edges.value.some((edge) => edge.source === nodeId || edge.target === nodeId)
    if (hasConnectedEdges) return

    const parentIterationId = findParentIterationNodeId(nodeId)
    if (parentIterationId) return

    const detachedNode = normalizeNode({
      ...movingNode,
      parentNode: iterationNodeId,
      extent: 'parent',
      position: {
        x: Math.max(16, Math.round(dropPosition.x)),
        y: Math.max(16, Math.round(dropPosition.y))
      }
    })
    nodes.value = nodes.value.map((node) => (node.id === nodeId ? detachedNode : node))
    syncIterationContainerSize(iterationNodeId)
    scheduleSave()
  }

  function setNodes(newNodes: OFNode[]) {
    nodes.value = newNodes.map(normalizeNode)
  }
  function setEdges(newEdges: OFEdge[]) {
    edges.value = newEdges
  }
  function setSelectedNodeId(nodeId: string | null) {
    selectedNodeId.value = nodeId
  }
  function setPanelWidth(width: number) {
    panelWidth.value = width
  }
  function setControlMode(mode: OFControlMode) {
    controlMode.value = mode
  }
  function setViewport(x: number, y: number, zoom: number) {
    viewport.value = { x, y, zoom }
  }

  // 添加节点
  function addNode(type: OFBlockEnum): string {
    const id = `node_${type}_${Date.now()}`
    const position = { x: 200 + Math.random() * 100, y: 200 + Math.random() * 100 }
    const title = getUniqueNodeTitle(type, getDefaultNodeTitle(type))

    let nodeData:
      | OFStartNodeData
      | OFLLMNodeData
      | OFIterationNodeData
      | OFIfElseNodeData
      | OFEndNodeData
      | undefined

    switch (type) {
      case OFBlockEnum.Start:
        nodeData = {
          title,
          desc: '',
          type: OFBlockEnum.Start,
          input: { variables: [] }
        } as OFStartNodeData
        break
      case OFBlockEnum.LLM:
        nodeData = {
          title,
          desc: '',
          type: OFBlockEnum.LLM,
          model: {
            provider: '',
            name: '',
            completion_params: {
              temperature: 1,
              top_p: 1
            }
          },
          prompt_template: [],
          structured_output: {
            enabled: false,
            schema: null
          },
          output: { variables: buildLLMOutputVariables(title) }
        } as OFLLMNodeData
        break
      case OFBlockEnum.Iteration:
        nodeData = {
          title,
          desc: '',
          type: OFBlockEnum.Iteration,
          width: ITERATION_DEFAULT_WIDTH,
          height: ITERATION_DEFAULT_HEIGHT,
          iterator_selector: [],
          output_selector: [],
          start_node_id: `${id}-iteration-start`,
          subgraph: createDefaultIterationSubgraph(id, title),
          parallel_mode: 'sequential',
          parallel_nums: 1,
          error_handle_mode: 'terminated',
          flatten_output: true,
          output: { variables: buildIterationOutputVariables(title, id) }
        } as OFIterationNodeData
        break
      case OFBlockEnum.IfElse:
        nodeData = {
          title,
          desc: '',
          type: OFBlockEnum.IfElse,
          cases: [
            {
              id: `case_if_${Date.now()}`,
              kind: 'if',
              label: 'IF',
              handleId: 'if',
              conditions: [
                {
                  id: `condition_${Date.now()}`,
                  variable_selector: [],
                  operator: 'is'
                }
              ]
            }
          ],
          elseCase: {
            handleId: 'else',
            label: 'ELSE'
          }
        } as OFIfElseNodeData
        break
      case OFBlockEnum.End:
        nodeData = {
          title,
          desc: '',
          type: OFBlockEnum.End,
          output: { variables: [] }
        } as OFEndNodeData
        break
      default:
        throw new Error(`Unsupported node type: ${type}`)
    }

    // 根据节点类型设置正确的 VueFlow 节点类型
    let vueFlowType: string = 'llm'
    switch (type) {
      case OFBlockEnum.Start:
        vueFlowType = 'start'
        break
      case OFBlockEnum.LLM:
        vueFlowType = 'llm'
        break
      case OFBlockEnum.IfElse:
        vueFlowType = 'ifelse'
        break
      case OFBlockEnum.Iteration:
        vueFlowType = 'iteration'
        break
      case OFBlockEnum.End:
        vueFlowType = 'end'
        break
    }

    const newNode: OFNode = { id, type: vueFlowType, position, data: nodeData as OFNode['data'] }
    const nextNodes = [...nodes.value, newNode]
    const nextEdges = [...edges.value]

    if (type === OFBlockEnum.Iteration) {
      const iterationSubgraph = (nodeData as OFIterationNodeData).subgraph
      iterationSubgraph.nodes.forEach((childNode) => {
        nextNodes.push(
          normalizeNode({
            ...cloneNode(childNode),
            parentNode: childNode.parentNode || id,
            extent: childNode.extent || 'parent'
          })
        )
      })
      iterationSubgraph.edges.forEach((childEdge) => {
        nextEdges.push(cloneEdge(childEdge))
      })
    }

    nodes.value = dedupeNodes(nextNodes)
    edges.value = dedupeEdges(nextEdges)
    if (type === OFBlockEnum.Iteration) {
      syncIterationContainerSize(id)
    }
    scheduleSave()
    return id
  }

  // 更新节点数据
  function updateNode(nodeId: string, data: Partial<OFNode['data']>) {
    const currentNode = findNodeByIdFrom(nodeId, nodes.value)
    if (!currentNode) return

    let nextData: Partial<OFNode['data']> = { ...data }

    if (typeof data.title === 'string') {
      const uniqueTitle = getUniqueNodeTitle(currentNode.data.type, data.title, nodeId)
      nextData = {
        ...nextData,
        title: uniqueTitle
      }

      if (currentNode.data.type === OFBlockEnum.LLM) {
        const llmData = {
          ...(currentNode.data as OFLLMNodeData),
          ...nextData
        } as OFLLMNodeData
        nextData = {
          ...nextData,
          output: {
            variables: buildLLMOutputVariables(uniqueTitle, llmData.structured_output)
          }
        }
      }
    }

    if (currentNode.data.type === OFBlockEnum.Iteration) {
      const iterationData = {
        ...(currentNode.data as OFIterationNodeData),
        ...nextData
      } as OFIterationNodeData
      if (typeof nextData.title === 'string') {
        nextData = {
          ...nextData,
          output: {
            variables: buildIterationOutputVariables(iterationData.title, nodeId)
          }
        }
      }
    }

    const llmPatch = data as Partial<OFLLMNodeData>

    if (currentNode.data.type === OFBlockEnum.LLM && llmPatch.structured_output) {
      const llmData = currentNode.data as OFLLMNodeData
      const nextTitle = String((nextData.title as string | undefined) || llmData.title || 'llm')
      nextData = {
        ...nextData,
        output: {
          variables: buildLLMOutputVariables(nextTitle, llmPatch.structured_output)
        }
      }
    }

    const previousNamespace =
      currentNode.data.type === OFBlockEnum.LLM
        ? normalizeOFVariableNamespace(currentNode.data.title, 'llm')
        : currentNode.data.type === OFBlockEnum.Iteration
          ? normalizeOFVariableNamespace(currentNode.data.title, 'iteration')
          : ''

    nodes.value = updateNodeCollection(nodes.value, nodeId, nextData)

    if (currentNode.data.type === OFBlockEnum.LLM && typeof nextData.title === 'string') {
      const nextNamespace = normalizeOFVariableNamespace(nextData.title, 'llm')
      syncNodeNamespaceReferences(previousNamespace, nextNamespace, nodeId)
    }

    if (currentNode.data.type === OFBlockEnum.Iteration && typeof nextData.title === 'string') {
      const nextNamespace = normalizeOFVariableNamespace(nextData.title, 'iteration')
      syncNodeNamespaceReferences(previousNamespace, nextNamespace, nodeId)
    }

    scheduleSave()
  }

  // 更新节点运行状态
  function updateNodeRunningStatus(nodeId: string, status: OFNodeRunningStatus) {
    const exists = findNodeByIdFrom(nodeId, nodes.value)
    if (!exists) return

    nodes.value = updateNodeCollection(nodes.value, nodeId, {
      _runningStatus: status
    })
  }

  // 重置所有节点运行状态
  function resetAllNodeRunningStatus(status: OFNodeRunningStatus) {
    nodes.value = nodes.value.map((node) => ({
      ...node,
      data: {
        ...node.data,
        _runningStatus: status
      }
    }))
  }

  // 删除节点
  function removeNode(nodeId: string) {
    if (isIterationLocalStart(nodeId)) return

    const removedNodeIds = collectCascadeNodeIds(nodeId)

    nodes.value = nodes.value.filter((node) => !removedNodeIds.has(node.id))
    edges.value = edges.value.filter(
      (edge) => !removedNodeIds.has(edge.source) && !removedNodeIds.has(edge.target)
    )
    if (selectedNodeId.value && removedNodeIds.has(selectedNodeId.value)) {
      selectedNodeId.value = null
    }
    scheduleSave()
  }

  // 添加边
  function addEdge(edge: OFEdge) {
    if (isDuplicateEdgeCandidate(edge)) return
    edges.value = [...edges.value, buildIterationEdgeData(edge)]
    scheduleSave()
  }
  // 删除边
  function removeEdge(edgeId: string) {
    edges.value = edges.value.filter((e) => e.id !== edgeId)
  }

  // 卸载工作流
  function unloadWorkflow() {
    currentWorkflowId.value = null
    nodes.value = []
    edges.value = []
    selectedNodeId.value = null
  }

  // 更新节点位置（拖拽结束后调用）
  function updateNodePosition(nodeId: string, position: { x: number; y: number }) {
    const exists = findNodeByIdFrom(nodeId, nodes.value)
    if (exists) {
      nodes.value = updateNodePositionCollection(nodes.value, nodeId, position)
      scheduleSave()
    }
  }

  // 应用节点变化数组（来自 VueFlow @nodes-change）
  function applyNodeChanges(changes: NodeChange[]) {
    for (const change of changes) {
      switch (change.type) {
        case 'add':
          if (change.item) {
            nodes.value = [...nodes.value, change.item as OFNode]
          }
          break
        case 'remove':
          removeNode(change.id)
          break
        case 'select':
          // 选中状态变化不需要保存
          break
        case 'position':
          // 位置变化在 node-drag-stop 时单独处理，这里忽略
          break
        case 'dimensions':
          // 尺寸变化不需要保存
          break
      }
    }
    scheduleSave()
  }

  // 应用边变化数组（来自 VueFlow @edges-change）
  function applyEdgeChanges(changes: EdgeChange[]) {
    for (const change of changes) {
      switch (change.type) {
        case 'add':
          if (change.item) {
            edges.value = [...edges.value, change.item as OFEdge]
          }
          break
        case 'remove':
          edges.value = edges.value.filter((e) => e.id !== change.id)
          break
        case 'select':
          // 选中状态变化不需要保存
          break
      }
    }
    scheduleSave()
  }

  return {
    nodes,
    edges,
    selectedNodeId,
    panelWidth,
    controlMode,
    viewport,
    currentWorkflowId,
    loadWorkflow,
    saveWorkflow,
    setNodes,
    setEdges,
    setSelectedNodeId,
    setPanelWidth,
    setControlMode,
    setViewport,
    addNode,
    updateNode,
    updateNodeRunningStatus,
    resetAllNodeRunningStatus,
    removeNode,
    addEdge,
    removeEdge,
    findNodeById: (nodeId: string) => findNodeByIdFrom(nodeId, nodes.value),
    getNodeAncestorPath,
    findParentIterationNodeId,
    resizeIterationNode,
    updateIterationViewport,
    updateIterationChildPosition,
    addIterationEdge,
    moveNodeIntoIterationNode,
    unloadWorkflow,
    updateNodePosition,
    applyNodeChanges,
    applyEdgeChanges
  }
})
