/**
 * OrchestraFlow 变量选择器 Store
 * 计算当前节点可引用的上游变量
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useWorkflowEditorStore } from '../workflow-editor.store'
import type {
  OFAvailableVariable,
  OFAvailableVariableGroup,
  OFVariableSelectorMechanismGuidance,
  VariableSelectorTargetType
} from './variable-selector.types'
import type {
  OFEdge,
  OFJsonSchemaProperty,
  OFIterationNodeData,
  OFLoopNodeData,
  OFNode,
  OFVariable
} from '@shared/Orchestraflow-types'
import {
  OFBlockEnum,
  OFVarType,
  OF_LOOP_COUNT_VARIABLE_NAME,
  OF_LOOP_INDEX_VARIABLE_NAME,
  getOFEdgeSourcePortId,
  getOFPathFromRef,
  getOFSelectorFromRef,
  resolveOFMechanismDefinition,
  resolveOFNodeDefinition
} from '@shared/Orchestraflow-types'

const selectorMechanismDefinition = resolveOFMechanismDefinition('selector-ref')

const SYSTEM_VARIABLES: Array<{
  variable: string
  label: string
  type: OFVarType
}> = [
  { variable: 'sys.user_id', label: 'sys.user_id', type: OFVarType.String },
  { variable: 'sys.app_id', label: 'sys.app_id', type: OFVarType.String },
  { variable: 'sys.workflow_id', label: 'sys.workflow_id', type: OFVarType.String },
  { variable: 'sys.workflow_run_id', label: 'sys.workflow_run_id', type: OFVarType.String },
  { variable: 'sys.timestamp', label: 'sys.timestamp', type: OFVarType.Number }
]

function selectorToPath(selector: string[]): string {
  return selector.join('.')
}

function getReachableNodeIds(startNodeId: string, edges: OFEdge[]): Set<string> {
  const reachable = new Set<string>()
  const queue = [startNodeId]

  while (queue.length > 0) {
    const currentId = queue.shift()
    if (!currentId || reachable.has(currentId)) continue
    reachable.add(currentId)

    edges
      .filter((edge) => edge.source === currentId)
      .forEach((edge) => {
        if (!reachable.has(edge.target)) {
          queue.push(edge.target)
        }
      })
  }

  return reachable
}

function getSchemaNodeType(schema: OFJsonSchemaProperty): OFVarType {
  switch (schema.type) {
    case 'boolean':
      return OFVarType.Boolean
    case 'number':
      return OFVarType.Number
    case 'object':
      return OFVarType.Object
    case 'string':
    default:
      return OFVarType.String
  }
}

function toStructuredSchema(
  schema: OFJsonSchemaProperty | null | undefined
): OFAvailableVariable['schema'] {
  if (!schema) return null
  return schema.type === 'object' ? schema : null
}

function buildSchemaChildren(
  base: OFAvailableVariable,
  schema: OFJsonSchemaProperty | null | undefined,
  selector: string[]
): OFAvailableVariable[] {
  if (!schema) return []

  if (schema.type === 'object') {
    return Object.entries(schema.properties || {}).map(([fieldName, fieldSchema]) => {
      const fieldSelector = [...selector, fieldName]
      const children = buildSchemaChildren(base, fieldSchema, fieldSelector)
      return {
        id: `${base.id}:${fieldSelector.join('.')}`,
        variable: fieldName,
        path: selectorToPath(fieldSelector),
        label: fieldName,
        nodeId: base.nodeId,
        nodeType: base.nodeType,
        nodeTitle: base.nodeTitle,
        valueSelector: fieldSelector,
        type: getSchemaNodeType(fieldSchema),
        schema: toStructuredSchema(fieldSchema),
        selectable: true,
        expandable: children.length > 0,
        children
      }
    })
  }

  return []
}

function matchesKeyword(variable: OFAvailableVariable, keyword: string): boolean {
  const lowered = keyword.toLowerCase()
  return [
    variable.label,
    variable.variable,
    variable.path,
    variable.nodeTitle,
    String(variable.type || '')
  ].some((item) => item.toLowerCase().includes(lowered))
}

function filterVariable(
  variable: OFAvailableVariable,
  keyword: string
): OFAvailableVariable | null {
  const filteredChildren = (variable.children || [])
    .map((child) => filterVariable(child, keyword))
    .filter(Boolean) as OFAvailableVariable[]

  if (!keyword || matchesKeyword(variable, keyword) || filteredChildren.length > 0) {
    return {
      ...variable,
      children: filteredChildren,
      expandable: filteredChildren.length > 0 || variable.expandable
    }
  }

  return null
}

export const useVariableSelectorStore = defineStore('orchestraflow-variable-selector', () => {
  // 这里显式消费 selector mechanism，避免变量选择器只“偷偷”依赖 helper。
  // 后续 UI 文案、错误提示、示例说明都从共享 mechanism 真相层读取。
  const visible = ref(false)
  const targetNodeId = ref<string | null>(null)
  const targetType = ref<VariableSelectorTargetType>('prompt')
  const targetBranchSourceNodeId = ref<string | null>(null)
  const targetBranchSourceHandleId = ref<string | null>(null)
  const searchKeyword = ref('')
  const cursorPosition = ref(0)
  const anchorRect = ref<DOMRect | null>(null)
  const anchorPoint = ref<{ x: number; y: number } | null>(null)

  const editorStore = useWorkflowEditorStore()

  function extractNodeOutputs(node: OFNode): OFAvailableVariableGroup[] {
    const data = node.data
    const nodeType = data.type as OFBlockEnum
    const nodeTitle = data.title || '未命名节点'
    const nodeId = node.id

    const variables: OFVariable[] =
      resolveOFNodeDefinition(nodeType).variables.getSelectableVariables(node)

    if (!variables.length) {
      return []
    }

    const items = variables.map((variable) => {
      const selector = getOFSelectorFromRef(variable.value_ref) || []
      const fallbackSelector = selector.length ? selector : [variable.variable]
      const path = variable.value_ref
        ? getOFPathFromRef(variable.value_ref)
        : selectorToPath(fallbackSelector)
      const base: OFAvailableVariable = {
        id: `${nodeId}:${path}`,
        variable: variable.variable,
        path,
        label: variable.label || variable.variable,
        nodeId,
        nodeType,
        nodeTitle,
        valueSelector: fallbackSelector,
        type: variable.type,
        schema: variable.schema,
        selectable: true,
        expandable: Boolean(variable.type === OFVarType.Object && variable.schema),
        children: []
      }
      const schema = variable.schema || null
      const children = buildSchemaChildren(base, schema, fallbackSelector)
      return {
        ...base,
        children,
        expandable: children.length > 0
      }
    })

    return [
      {
        id: `group:${nodeId}`,
        title: nodeTitle,
        nodeId,
        nodeType,
        items
      }
    ]
  }

  function buildSystemVariableGroup(): OFAvailableVariableGroup {
    return {
      id: 'group:system',
      title: 'SYSTEM',
      nodeId: 'system',
      isSystem: true,
      items: SYSTEM_VARIABLES.map((item) => ({
        id: `system:${item.variable}`,
        variable: item.variable,
        path: item.variable,
        label: item.label,
        nodeId: 'system',
        nodeTitle: 'SYSTEM',
        valueSelector: [item.variable],
        type: item.type,
        selectable: true,
        expandable: false,
        children: [],
        isSystem: true
      }))
    }
  }

  function buildLoopLocalVariableGroup(loopNodeId: string | null): OFAvailableVariableGroup | null {
    if (!loopNodeId) return null
    const loopNode = editorStore.findNodeById(loopNodeId)
    if (!loopNode || loopNode.data.type !== OFBlockEnum.Loop) return null

    const data = loopNode.data as OFLoopNodeData
    const items: OFAvailableVariable[] = (data.loop_variables || []).map((item) => ({
      id: `loop:${loopNodeId}:${item.variable}`,
      variable: item.variable,
      path: item.variable,
      label: item.label || item.variable,
      nodeId: loopNodeId,
      nodeType: OFBlockEnum.Loop,
      nodeTitle: 'LOOP',
      valueSelector: [item.variable],
      type: item.type || OFVarType.String,
      schema: item.schema || null,
      selectable: true,
      expandable: false,
      children: []
    }))

    items.push(
      {
        id: `loop:${loopNodeId}:${OF_LOOP_INDEX_VARIABLE_NAME}`,
        variable: OF_LOOP_INDEX_VARIABLE_NAME,
        path: OF_LOOP_INDEX_VARIABLE_NAME,
        label: OF_LOOP_INDEX_VARIABLE_NAME,
        nodeId: loopNodeId,
        nodeType: OFBlockEnum.Loop,
        nodeTitle: 'LOOP',
        valueSelector: [OF_LOOP_INDEX_VARIABLE_NAME],
        type: OFVarType.Number,
        selectable: true,
        expandable: false,
        children: []
      },
      {
        id: `loop:${loopNodeId}:${OF_LOOP_COUNT_VARIABLE_NAME}`,
        variable: OF_LOOP_COUNT_VARIABLE_NAME,
        path: OF_LOOP_COUNT_VARIABLE_NAME,
        label: OF_LOOP_COUNT_VARIABLE_NAME,
        nodeId: loopNodeId,
        nodeType: OFBlockEnum.Loop,
        nodeTitle: 'LOOP',
        valueSelector: [OF_LOOP_COUNT_VARIABLE_NAME],
        type: OFVarType.Number,
        selectable: true,
        expandable: false,
        children: []
      }
    )

    return {
      id: `group:loop:${loopNodeId}`,
      title: 'LOOP',
      nodeId: loopNodeId,
      nodeType: OFBlockEnum.Loop,
      items
    }
  }

  function findUpstreamNodes(nodeId: string, nodes: OFNode[], edges: OFEdge[]): OFNode[] {
    const upstreamIds = new Set<string>()
    const queue = [nodeId]

    while (queue.length > 0) {
      const currentId = queue.shift()!
      const incomingEdges = edges.filter((edge) => edge.target === currentId)

      for (const edge of incomingEdges) {
        if (!upstreamIds.has(edge.source)) {
          upstreamIds.add(edge.source)
          queue.push(edge.source)
        }
      }
    }

    return nodes.filter((node) => upstreamIds.has(node.id))
  }

  const selectorMechanismGuidance = computed<OFVariableSelectorMechanismGuidance>(() => {
    const contextNotesByTarget: Record<VariableSelectorTargetType, string[]> = {
      prompt: ['Prompt 场景通常读取开始节点输入或上游节点输出。'],
      output: ['输出变量应尽量选择稳定的上游字段，避免引用临时中间值。'],
      condition: ['条件判断左值建议优先选择单值字段，减少歧义。'],
      'iteration-input': ['这里必须选择数组变量，供 iteration 逐项展开。'],
      'iteration-output': [
        '这里应选择 iteration 子图内部可达的业务输出，不要手写内部 start 字段。'
      ],
      'variable-assign-source': ['变量赋值来源可以是上游变量或结构化字段。'],
      'variable-assign-target': ['目标变量名建议稳定，便于后续 selector 复用。'],
      'loop-variable-init': ['Loop 局部变量可引用上游值，也可改回常量初始化。'],
      'loop-condition-left': ['左值通常使用 loop 局部变量或上游输出。'],
      'loop-condition-right': ['右值若切到变量模式，建议引用与左值同类型字段。']
    }

    return {
      id: selectorMechanismDefinition.id,
      targetType: targetType.value,
      title: selectorMechanismDefinition.title,
      summary: selectorMechanismDefinition.summary,
      hardRules: [...selectorMechanismDefinition.hard_rules],
      examples: selectorMechanismDefinition.examples.map((item) => `${item.label}：${item.value}`),
      failureModes: [...selectorMechanismDefinition.failure_modes],
      contextNotes: contextNotesByTarget[targetType.value] || []
    }
  })

  const availableGroups = computed<OFAvailableVariableGroup[]>(() => {
    if (!targetNodeId.value) return []
    const targetNode = editorStore.findNodeById(targetNodeId.value)
    const activeLoopNodeId =
      targetNode?.data.type === OFBlockEnum.Loop
        ? targetNode.id
        : editorStore.findParentIterationNodeId(targetNodeId.value)
    const localLoopGroup =
      targetType.value === 'loop-condition-left' || targetType.value === 'loop-condition-right'
        ? buildLoopLocalVariableGroup(activeLoopNodeId)
        : null

    if (
      targetType.value === 'iteration-output' &&
      targetNode?.data.type === OFBlockEnum.Iteration
    ) {
      const iterationData = targetNode.data as OFIterationNodeData
      const subgraphNodes = iterationData.subgraph?.nodes || []
      const subgraphEdges = iterationData.subgraph?.edges || []

      const targetNodeIds =
        targetBranchSourceNodeId.value && targetBranchSourceHandleId.value
          ? (() => {
              const branchTargets = subgraphEdges
                .filter(
                  (edge) =>
                    edge.source === targetBranchSourceNodeId.value &&
                    getOFEdgeSourcePortId(edge) === targetBranchSourceHandleId.value
                )
                .map((edge) => edge.target)
              const reachableNodeIds = new Set<string>()
              branchTargets.forEach((branchTargetId) => {
                getReachableNodeIds(branchTargetId, subgraphEdges).forEach((nodeId) => {
                  reachableNodeIds.add(nodeId)
                })
              })
              return reachableNodeIds
            })()
          : null

      const internalGroups = subgraphNodes
        .filter((node) => !targetNodeIds || targetNodeIds.has(node.id))
        .flatMap((node) => extractNodeOutputs(node))
        .filter((group) => group.items.length > 0)

      const groups = [...(localLoopGroup ? [localLoopGroup] : []), ...internalGroups]

      if (!searchKeyword.value.trim()) {
        return groups
      }

      const keyword = searchKeyword.value.trim().toLowerCase()
      return groups
        .map((group) => {
          const filteredItems = group.items
            .map((item) => filterVariable(item, keyword))
            .filter(Boolean) as OFAvailableVariable[]

          if (!filteredItems.length && !group.title.toLowerCase().includes(keyword)) {
            return null
          }

          return {
            ...group,
            items: filteredItems
          }
        })
        .filter(Boolean) as OFAvailableVariableGroup[]
    }

    const parentIterationId = editorStore.findParentIterationNodeId(targetNodeId.value)
    const localUpstreamNodes = parentIterationId
      ? (() => {
          const localNodes = editorStore.nodes.filter(
            (node) => node.id === parentIterationId || node.parentNode === parentIterationId
          )
          const localNodeIds = new Set(localNodes.map((node) => node.id))
          const localEdges = editorStore.edges.filter(
            (edge) => localNodeIds.has(edge.source) && localNodeIds.has(edge.target)
          )
          return findUpstreamNodes(targetNodeId.value, localNodes, localEdges)
        })()
      : findUpstreamNodes(targetNodeId.value, editorStore.nodes, editorStore.edges)
    const outerUpstreamNodes = parentIterationId
      ? findUpstreamNodes(parentIterationId, editorStore.nodes, editorStore.edges)
      : []

    const upstreamGroups = [...localUpstreamNodes, ...outerUpstreamNodes]
      .flatMap((node) => extractNodeOutputs(node))
      .filter((group) => group.items.length > 0)

    const groups = [
      ...(localLoopGroup ? [localLoopGroup] : []),
      ...upstreamGroups,
      buildSystemVariableGroup()
    ]

    if (!searchKeyword.value.trim()) {
      return groups
    }

    const keyword = searchKeyword.value.trim().toLowerCase()
    return groups
      .map((group) => {
        const filteredItems = group.items
          .map((item) => filterVariable(item, keyword))
          .filter(Boolean) as OFAvailableVariable[]

        if (!filteredItems.length && !group.title.toLowerCase().includes(keyword)) {
          return null
        }

        return {
          ...group,
          items: filteredItems
        }
      })
      .filter(Boolean) as OFAvailableVariableGroup[]
  })

  const availableVariables = computed<OFAvailableVariable[]>(() => {
    const result: OFAvailableVariable[] = []

    const walk = (items: OFAvailableVariable[]) => {
      for (const item of items) {
        if (item.selectable) {
          result.push(item)
        }
        if (item.children?.length) {
          walk(item.children)
        }
      }
    }

    for (const group of availableGroups.value) {
      walk(group.items)
    }

    return result
  })

  function openSelector(
    nodeId: string,
    type: VariableSelectorTargetType,
    positionOrAnchor?: number | DOMRect,
    maybeAnchor?: DOMRect,
    point?: { x: number; y: number },
    options?: {
      branchSourceNodeId?: string
      branchSourceHandleId?: string
    }
  ) {
    targetNodeId.value = nodeId
    targetType.value = type
    targetBranchSourceNodeId.value = options?.branchSourceNodeId || null
    targetBranchSourceHandleId.value = options?.branchSourceHandleId || null
    if (typeof positionOrAnchor === 'number') {
      cursorPosition.value = positionOrAnchor
      anchorRect.value = maybeAnchor || null
      anchorPoint.value = point || null
    } else {
      cursorPosition.value = 0
      anchorRect.value = positionOrAnchor || null
      anchorPoint.value = point || null
    }
    searchKeyword.value = ''
    visible.value = true
  }

  function closeSelector() {
    visible.value = false
    targetNodeId.value = null
    targetBranchSourceNodeId.value = null
    targetBranchSourceHandleId.value = null
    searchKeyword.value = ''
    anchorRect.value = null
    anchorPoint.value = null
  }

  function setSearchKeyword(keyword: string) {
    searchKeyword.value = keyword
  }

  function setCursorPosition(position: number) {
    cursorPosition.value = position
  }

  return {
    visible,
    targetNodeId,
    targetType,
    targetBranchSourceNodeId,
    targetBranchSourceHandleId,
    searchKeyword,
    cursorPosition,
    anchorRect,
    anchorPoint,
    availableGroups,
    availableVariables,
    selectorMechanismGuidance,
    openSelector,
    closeSelector,
    setSearchKeyword,
    setCursorPosition,
    findUpstreamNodes,
    extractNodeOutputs
  }
})
