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

  // 解析节点数据获取输出变量
  function extractNodeOutputs(node: OFNode): OFAvailableVariable[] {
    const data = node.data
    const nodeType = data.type as OFBlockEnum
    const nodeTitle = data.title || '未命名节点'
    const nodeId = node.id

    const variables: OFAvailableVariable[] = []

    switch (nodeType) {
      case OFBlockEnum.Start:
        // Start 节点：inputs 定义输入变量
        const startData = data as OFStartNodeData
        if (startData.inputs) {
          for (const input of startData.inputs) {
            variables.push({
              id: `${nodeId}:${input.variable}`,
              variable: `inputs.${input.variable}`,
              label: input.label || input.variable,
              nodeId,
              nodeType,
              nodeTitle,
              valueSelector: ['inputs', input.variable]
            })
          }
        }
        break

      case OFBlockEnum.LLM:
        // LLM 节点：outputs 定义输出变量（如果有的话）
        const llmData = data as OFLLMNodeData
        if ((llmData as any).outputs) {
          for (const output of (llmData as any).outputs as Array<{
            variable: string
            value_selector?: string[]
          }>) {
            variables.push({
              id: `${nodeId}:${output.variable}`,
              variable: `outputs.${output.variable}`,
              label: output.variable,
              nodeId,
              nodeType,
              nodeTitle,
              valueSelector: output.value_selector || ['outputs', output.variable]
            })
          }
        }
        break

      case OFBlockEnum.End:
        // End 节点：outputs 定义输出变量
        const endData = data as OFEndNodeData
        if (endData.outputs) {
          for (const output of endData.outputs) {
            variables.push({
              id: `${nodeId}:${output.variable}`,
              variable: `outputs.${output.variable}`,
              label: output.variable,
              nodeId,
              nodeType,
              nodeTitle,
              valueSelector: output.value_selector
            })
          }
        }
        break
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
