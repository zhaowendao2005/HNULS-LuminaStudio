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
  VariableSelectorTargetType
} from './variable-selector.types'
import type {
  OFEdge,
  OFEndNodeData,
  OFLLMNodeData,
  OFNode,
  OFStartNodeData,
  OFVariable
} from '@shared/Orchestraflow-types'
import { OFBlockEnum, OFVarType } from '@shared/Orchestraflow-types'

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

function buildObjectChildren(base: OFAvailableVariable, variable: OFVariable): OFAvailableVariable[] {
  if (variable.type !== OFVarType.Object || !variable.schema) {
    return []
  }

  return Object.entries(variable.schema.properties || {}).map(([fieldName, fieldSchema]) => {
    const selector = [...(variable.value_selector || [variable.variable]), fieldName]
    return {
      id: `${base.id}:${fieldName}`,
      variable: fieldName,
      path: selectorToPath(selector),
      label: fieldName,
      nodeId: base.nodeId,
      nodeType: base.nodeType,
      nodeTitle: base.nodeTitle,
      valueSelector: selector,
      type:
        fieldSchema.type === 'boolean'
          ? OFVarType.Boolean
          : fieldSchema.type === 'number'
            ? OFVarType.Number
            : OFVarType.String,
      selectable: true,
      expandable: false,
      children: []
    }
  })
}

function matchesKeyword(variable: OFAvailableVariable, keyword: string): boolean {
  const lowered = keyword.toLowerCase()
  return [variable.label, variable.variable, variable.path, variable.nodeTitle, String(variable.type || '')].some(
    (item) => item.toLowerCase().includes(lowered)
  )
}

function filterVariable(variable: OFAvailableVariable, keyword: string): OFAvailableVariable | null {
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
  const visible = ref(false)
  const targetNodeId = ref<string | null>(null)
  const targetType = ref<VariableSelectorTargetType>('prompt')
  const searchKeyword = ref('')
  const cursorPosition = ref(0)
  const anchorRect = ref<DOMRect | null>(null)

  const editorStore = useWorkflowEditorStore()

  function extractNodeOutputs(node: OFNode): OFAvailableVariableGroup[] {
    const data = node.data
    const nodeType = data.type as OFBlockEnum
    const nodeTitle = data.title || '未命名节点'
    const nodeId = node.id

    let variables: OFVariable[] = []

    if (nodeType === OFBlockEnum.Start) {
      variables = ((data as OFStartNodeData).input?.variables || []).map((item) => ({
        ...item,
        value_selector: item.value_selector?.length ? item.value_selector : [item.variable]
      }))
    } else if (nodeType === OFBlockEnum.LLM || nodeType === OFBlockEnum.End) {
      variables = (((data as OFLLMNodeData | OFEndNodeData).output?.variables || []) as OFVariable[]).map(
        (item) => ({
          ...item,
          value_selector: item.value_selector?.length ? item.value_selector : [item.variable]
        })
      )
    }

    if (!variables.length) {
      return []
    }

    const items = variables.map((variable) => {
      const selector = variable.value_selector?.length ? variable.value_selector : [variable.variable]
      const base: OFAvailableVariable = {
        id: `${nodeId}:${selectorToPath(selector)}`,
        variable: variable.variable,
        path: selectorToPath(selector),
        label: variable.label || variable.variable,
        nodeId,
        nodeType,
        nodeTitle,
        valueSelector: selector,
        type: variable.type,
        schema: variable.schema,
        selectable: true,
        expandable: Boolean(variable.type === OFVarType.Object && variable.schema),
        children: []
      }
      const children = buildObjectChildren(base, variable)
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

  const availableGroups = computed<OFAvailableVariableGroup[]>(() => {
    if (!targetNodeId.value) return []

    const upstreamNodes = findUpstreamNodes(targetNodeId.value, editorStore.nodes, editorStore.edges)
    const upstreamGroups = upstreamNodes
      .flatMap((node) => extractNodeOutputs(node))
      .filter((group) => group.items.length > 0)

    const groups = [...upstreamGroups, buildSystemVariableGroup()]

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
    maybeAnchor?: DOMRect
  ) {
    targetNodeId.value = nodeId
    targetType.value = type
    if (typeof positionOrAnchor === 'number') {
      cursorPosition.value = positionOrAnchor
      anchorRect.value = maybeAnchor || null
    } else {
      cursorPosition.value = 0
      anchorRect.value = positionOrAnchor || null
    }
    searchKeyword.value = ''
    visible.value = true
  }

  function closeSelector() {
    visible.value = false
    targetNodeId.value = null
    searchKeyword.value = ''
    anchorRect.value = null
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
    searchKeyword,
    cursorPosition,
    anchorRect,
    availableGroups,
    availableVariables,
    openSelector,
    closeSelector,
    setSearchKeyword,
    setCursorPosition,
    findUpstreamNodes,
    extractNodeOutputs
  }
})
