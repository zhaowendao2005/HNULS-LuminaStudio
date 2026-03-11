import {
  OFBlockEnum,
  OFNodeRunningStatus,
  getOFDefaultNodeTitle,
  normalizeOFNodeTitle,
  replaceOFValueSourceRoot,
  replaceOFVariableRefRoot,
  resolveOFNodeDefinition,
  type OFEdge,
  type OFIfElseNodeData,
  type OFLoopNodeData,
  type OFLoopStartNodeData,
  type OFNode,
  type OFVariableAssignNodeData
} from '@shared/Orchestraflow-types'
import type { EdgeChange, NodeChange } from '@vue-flow/core'
import {
  cloneEdge,
  cloneNode,
  createDefaultNodeData,
  dedupeEdges,
  dedupeNodes,
  normalizeNode
} from './workflow-editor.shared'

interface WorkflowEditorActionsDeps {
  getNodes: () => OFNode[]
  getEdges: () => OFEdge[]
  getSelectedNodeId: () => string | null
  setNodes: (nextNodes: OFNode[]) => void
  setEdges: (nextEdges: OFEdge[]) => void
  setSelectedNodeId: (nodeId: string | null) => void
  scheduleSave: () => void
  findNodeById: (nodeId: string) => OFNode | null
  findParentIterationNodeId: (nodeId: string) => string | null
  isIterationLocalStart: (nodeId: string) => boolean
  collectCascadeNodeIds: (rootNodeId: string) => Set<string>
  isDuplicateEdgeCandidate: (edge: OFEdge) => boolean
  buildIterationEdgeData: (edge: OFEdge, sourceNodes?: OFNode[]) => OFEdge
  updateNodeCollection: (
    sourceNodes: OFNode[],
    targetNodeId: string,
    patch: Partial<OFNode['data']>
  ) => OFNode[]
  updateNodePositionCollection: (
    sourceNodes: OFNode[],
    targetNodeId: string,
    position: { x: number; y: number }
  ) => OFNode[]
  syncIterationSubgraphSnapshot: (iterationNodeId: string) => void
  syncExpandedSubgraphChildren: (iterationNodeId: string) => void
  syncIterationContainerSize: (iterationNodeId: string) => void
}

export function createWorkflowEditorActionsModule(deps: WorkflowEditorActionsDeps) {
  function getUniqueNodeTitle(
    type: OFBlockEnum,
    desiredTitle?: string,
    excludeNodeId?: string
  ): string {
    const baseTitle = normalizeOFNodeTitle(type, desiredTitle)
    const existingTitles = new Set(
      deps
        .getNodes()
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

  // loop 局部变量改名后，容器内部依赖这些变量的节点引用也要一起被重写。
  function syncLoopVariableReferences(
    loopNodeId: string,
    previousVariables: OFLoopNodeData['loop_variables'],
    nextVariables: OFLoopNodeData['loop_variables']
  ) {
    const renamePairs = previousVariables
      .map((previousItem, index) => {
        const matchedById = previousItem.id
          ? nextVariables.find((item) => item.id && item.id === previousItem.id)
          : undefined
        const nextItem = matchedById || nextVariables[index]
        if (!nextItem) return null
        if (
          !previousItem.variable ||
          !nextItem.variable ||
          previousItem.variable === nextItem.variable
        ) {
          return null
        }
        return { oldVariable: previousItem.variable, newVariable: nextItem.variable }
      })
      .filter(Boolean) as Array<{ oldVariable: string; newVariable: string }>

    if (!renamePairs.length) return

    const localNodeIds = new Set(
      deps
        .getNodes()
        .filter((node) => node.id === loopNodeId || node.parentNode === loopNodeId)
        .map((node) => node.id)
    )

    deps.setNodes(
      deps.getNodes().map((node) => {
        if (!localNodeIds.has(node.id)) return node

        let nextNode = cloneNode(node)
        renamePairs.forEach(({ oldVariable, newVariable }) => {
          if (nextNode.data.type === OFBlockEnum.LoopStart) {
            const data = nextNode.data as OFLoopStartNodeData
            nextNode = {
              ...nextNode,
              data: {
                ...data,
                input: {
                  variables: (data.input?.variables || []).map((item) => ({
                    ...item,
                    variable: item.variable === oldVariable ? newVariable : item.variable,
                    label: item.label === oldVariable ? newVariable : item.label,
                    value_ref: replaceOFVariableRefRoot(item.value_ref, oldVariable, newVariable)
                  }))
                }
              } as OFLoopStartNodeData
            }
          }

          if (nextNode.data.type === OFBlockEnum.Loop) {
            const data = nextNode.data as OFLoopNodeData
            nextNode = {
              ...nextNode,
              data: {
                ...data,
                break_conditions: (data.break_conditions || []).map((condition) => ({
                  ...condition,
                  variable_ref: replaceOFVariableRefRoot(
                    condition.variable_ref,
                    oldVariable,
                    newVariable
                  ),
                  compare_ref: replaceOFVariableRefRoot(
                    condition.compare_ref,
                    oldVariable,
                    newVariable
                  )
                }))
              } as OFLoopNodeData
            }
          }

          if (nextNode.data.type === OFBlockEnum.IfElse) {
            const data = nextNode.data as OFIfElseNodeData
            nextNode = {
              ...nextNode,
              data: {
                ...data,
                cases: (data.cases || []).map((item) => ({
                  ...item,
                  conditions: (item.conditions || []).map((condition) => ({
                    ...condition,
                    variable_ref: replaceOFVariableRefRoot(
                      condition.variable_ref,
                      oldVariable,
                      newVariable
                    ),
                    compare_ref: replaceOFVariableRefRoot(
                      condition.compare_ref,
                      oldVariable,
                      newVariable
                    )
                  }))
                }))
              } as OFIfElseNodeData
            }
          }

          if (nextNode.data.type === OFBlockEnum.VariableAssign) {
            const data = nextNode.data as OFVariableAssignNodeData
            nextNode = {
              ...nextNode,
              data: {
                ...data,
                rules: (data.rules || []).map((rule) => ({
                  ...rule,
                  source: replaceOFValueSourceRoot(rule.source, oldVariable, newVariable)
                }))
              } as OFVariableAssignNodeData
            }
          }
        })

        return nextNode
      })
    )
  }

  function addNode(type: OFBlockEnum): string {
    const id = `node_${type}_${Date.now()}`
    const position = { x: 200 + Math.random() * 100, y: 200 + Math.random() * 100 }
    const definition = resolveOFNodeDefinition(type)
    const title = getUniqueNodeTitle(type, getOFDefaultNodeTitle(type))
    const nodeData = createDefaultNodeData(type, id, title)
    const newNode = normalizeNode({
      id,
      type: definition.meta.vueFlowType,
      position,
      data: nodeData as OFNode['data']
    })
    const nextNodes = [...deps.getNodes(), newNode]
    const nextEdges = [...deps.getEdges()]

    if (definition.meta.kind === 'container' && 'subgraph' in nodeData) {
      const iterationSubgraph = nodeData.subgraph
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

    deps.setNodes(dedupeNodes(nextNodes))
    deps.setEdges(dedupeEdges(nextEdges))
    if (definition.meta.kind === 'container') {
      deps.syncIterationContainerSize(id)
    }
    deps.scheduleSave()
    return id
  }

  function updateNode(nodeId: string, data: Partial<OFNode['data']>) {
    const currentNode = deps.findNodeById(nodeId)
    if (!currentNode) return

    let nextData: Partial<OFNode['data']> = { ...data }
    if (typeof data.title === 'string') {
      nextData = {
        ...nextData,
        title: getUniqueNodeTitle(currentNode.data.type, data.title, nodeId)
      }
    }

    deps.setNodes(deps.updateNodeCollection(deps.getNodes(), nodeId, nextData))

    if (currentNode.data.type === OFBlockEnum.Loop) {
      deps.syncExpandedSubgraphChildren(nodeId)
      const updatedNode = deps.findNodeById(nodeId)
      if (Object.prototype.hasOwnProperty.call(nextData, 'loop_variables') && updatedNode) {
        syncLoopVariableReferences(
          nodeId,
          (currentNode.data as OFLoopNodeData).loop_variables || [],
          ((updatedNode.data as OFLoopNodeData).loop_variables ||
            []) as OFLoopNodeData['loop_variables']
        )
      }
    }

    if (currentNode.parentNode) {
      const parentIterationId = deps.findParentIterationNodeId(nodeId)
      if (parentIterationId) {
        deps.syncIterationSubgraphSnapshot(parentIterationId)
      }
    }

    deps.scheduleSave()
  }

  function updateNodeRunningStatus(nodeId: string, status: OFNodeRunningStatus) {
    const exists = deps.findNodeById(nodeId)
    if (!exists) return

    deps.setNodes(
      deps.updateNodeCollection(deps.getNodes(), nodeId, {
        _runningStatus: status
      })
    )
  }

  function resetAllNodeRunningStatus(status: OFNodeRunningStatus) {
    deps.setNodes(
      deps.getNodes().map((node) => ({
        ...node,
        data: {
          ...node.data,
          _runningStatus: status
        }
      }))
    )
  }

  function removeNode(nodeId: string) {
    if (deps.isIterationLocalStart(nodeId)) return

    const removedNodeIds = deps.collectCascadeNodeIds(nodeId)
    deps.setNodes(deps.getNodes().filter((node) => !removedNodeIds.has(node.id)))
    deps.setEdges(
      deps
        .getEdges()
        .filter((edge) => !removedNodeIds.has(edge.source) && !removedNodeIds.has(edge.target))
    )
    if (deps.getSelectedNodeId() && removedNodeIds.has(deps.getSelectedNodeId()!)) {
      deps.setSelectedNodeId(null)
    }
    deps.scheduleSave()
  }

  function addEdge(edge: OFEdge) {
    if (deps.isDuplicateEdgeCandidate(edge)) return
    deps.setEdges([...deps.getEdges(), deps.buildIterationEdgeData(edge)])
    deps.scheduleSave()
  }

  function removeEdge(edgeId: string) {
    deps.setEdges(deps.getEdges().filter((edge) => edge.id !== edgeId))
  }

  function updateNodePosition(nodeId: string, position: { x: number; y: number }) {
    const exists = deps.findNodeById(nodeId)
    if (!exists) return

    deps.setNodes(deps.updateNodePositionCollection(deps.getNodes(), nodeId, position))
    deps.scheduleSave()
  }

  // VueFlow 的 changes 先在这里转成 store 自己的增删改动作，避免入口继续膨胀。
  function applyNodeChanges(changes: NodeChange[]) {
    for (const change of changes) {
      switch (change.type) {
        case 'add':
          if (change.item) {
            deps.setNodes([...deps.getNodes(), change.item as OFNode])
          }
          break
        case 'remove':
          removeNode(change.id)
          break
        case 'select':
          break
        case 'position':
          break
        case 'dimensions':
          break
      }
    }
    deps.scheduleSave()
  }

  function applyEdgeChanges(changes: EdgeChange[]) {
    for (const change of changes) {
      switch (change.type) {
        case 'add':
          if (change.item) {
            deps.setEdges([...deps.getEdges(), change.item as OFEdge])
          }
          break
        case 'remove':
          deps.setEdges(deps.getEdges().filter((edge) => edge.id !== change.id))
          break
        case 'select':
          break
      }
    }
    deps.scheduleSave()
  }

  return {
    addNode,
    updateNode,
    updateNodeRunningStatus,
    resetAllNodeRunningStatus,
    removeNode,
    addEdge,
    removeEdge,
    updateNodePosition,
    applyNodeChanges,
    applyEdgeChanges
  }
}
