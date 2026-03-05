/**
 * OrchestraFlow 变量选择器 Store
 * 计算当前节点可引用的上游变量
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useWorkflowEditorStore } from '../workflow-editor.store'
import type { OFAvailableVariable, VariableSelectorState } from './variable-selector.types'
import type {
  OFNode,
  OFEdge,
  OFStartNodeData,
  OFLLMNodeData,
  OFEndNodeData
} from '@shared/Orchestraflow-types'
import { OFBlockEnum } from '@shared/Orchestraflow-types'

export const useVariableSelectorStore = defineStore('orchestraflow-variable-selector', () => {
  // State
  const visible = ref(false)
  const targetNodeId = ref<string | null>(null)
  const targetType = ref<'prompt' | 'output'>('prompt')
  const searchKeyword = ref('')
  const cursorPosition = ref(0)

  // 获取 editor store
  const editorStore = useWorkflowEditorStore()

  // 解析节点数据获取可引用变量
  function extractNodeOutputs(node: OFNode): OFAvailableVariable[] {
    const data = node.data
    const nodeType = data.type as OFBlockEnum
    const nodeTitle = data.title || '未命名节点'
    const nodeId = node.id

    const variables: OFAvailableVariable[] = []

    // Start 节点：使用 input.variables 作为可引用变量（用户输入）
    if (nodeType === OFBlockEnum.Start) {
      const inputConfig = (data as OFStartNodeData).input
      if (inputConfig?.variables) {
        for (const v of inputConfig.variables) {
          variables.push({
            id: `${nodeId}:${v.variable}`,
            variable: v.variable,
            label: v.label || v.variable,
            nodeId,
            nodeType,
            nodeTitle,
            // Start 节点本身没有上游，直接用变量名作为 selector
            valueSelector: [v.variable]
          })
        }
      }

      return variables
    }

    // 其它节点（LLM / End）：统一从 output.variables 获取输出变量
    const outputConfig = (data as OFLLMNodeData | OFEndNodeData).output
    if (outputConfig?.variables) {
      for (const v of outputConfig.variables) {
        variables.push({
          id: `${nodeId}:${v.variable}`,
          variable: v.variable,
          label: v.label || v.variable,
          nodeId,
          nodeType,
          nodeTitle,
          // 如果 value_selector 为空，用变量名作为 selector
          valueSelector: v.value_selector?.length ? v.value_selector : [v.variable]
        })
      }
    }

    return variables
  }

  // 找到从指定节点出发的所有上游节点（通过边反向追溯）
  function findUpstreamNodes(nodeId: string, nodes: OFNode[], edges: OFEdge[]): OFNode[] {
    const upstreamIds = new Set<string>()
    const queue = [nodeId]

    while (queue.length > 0) {
      const currentId = queue.shift()!

      // 找到所有指向当前节点的边
      const incomingEdges = edges.filter((e) => e.target === currentId)

      for (const edge of incomingEdges) {
        if (!upstreamIds.has(edge.source)) {
          upstreamIds.add(edge.source)
          queue.push(edge.source)
        }
      }
    }

    // 返回所有上游节点
    return nodes.filter((n) => upstreamIds.has(n.id))
  }

  // 计算当前目标节点可引用的变量列表
  const availableVariables = computed<OFAvailableVariable[]>(() => {
    if (!targetNodeId.value) return []

    const nodes = editorStore.nodes
    const edges = editorStore.edges

    // 找到所有上游节点
    const upstreamNodes = findUpstreamNodes(targetNodeId.value, nodes, edges)

    // 提取所有上游节点的输出变量
    let variables: OFAvailableVariable[] = []
    for (const node of upstreamNodes) {
      variables = variables.concat(extractNodeOutputs(node))
    }

    // 根据搜索关键词过滤
    if (searchKeyword.value) {
      const keyword = searchKeyword.value.toLowerCase()
      variables = variables.filter(
        (v) =>
          v.variable.toLowerCase().includes(keyword) ||
          v.label.toLowerCase().includes(keyword) ||
          v.nodeTitle.toLowerCase().includes(keyword)
      )
    }

    return variables
  })

  // 打开变量选择器
  function openSelector(nodeId: string, type: 'prompt' | 'output', position?: number) {
    targetNodeId.value = nodeId
    targetType.value = type
    cursorPosition.value = position || 0
    searchKeyword.value = ''
    visible.value = true
  }

  // 关闭变量选择器
  function closeSelector() {
    visible.value = false
    targetNodeId.value = null
    searchKeyword.value = ''
  }

  // 更新搜索关键词
  function setSearchKeyword(keyword: string) {
    searchKeyword.value = keyword
  }

  // 更新光标位置
  function setCursorPosition(position: number) {
    cursorPosition.value = position
  }

  return {
    // State
    visible,
    targetNodeId,
    targetType,
    searchKeyword,
    cursorPosition,
    // Computed
    availableVariables,
    // Actions
    openSelector,
    closeSelector,
    setSearchKeyword,
    setCursorPosition,
    // 供外部调用的计算方法
    findUpstreamNodes,
    extractNodeOutputs
  }
})
