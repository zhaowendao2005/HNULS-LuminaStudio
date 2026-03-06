/**
 * OrchestraFlow 工作流编辑器 Store
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  OFControlMode,
  OFBlockEnum,
  OFNodeRunningStatus,
  buildLLMOutputVariables,
  buildIterationOutputVariables,
  normalizeOFVariableNamespace
} from '@shared/Orchestraflow-types'
import type {
  OFNode,
  OFEdge,
  OFStartNodeData,
  OFLLMNodeData,
  OFIterationNodeData,
  OFIfElseNodeData,
  OFEndNodeData
} from '@shared/Orchestraflow-types'
import type { NodeChange, EdgeChange } from '@vue-flow/core'
import { WorkflowEditorDataSource } from './workflow-editor.datasource'

const datasource = WorkflowEditorDataSource

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getDefaultNodeTitle(type: OFBlockEnum): string {
  switch (type) {
    case OFBlockEnum.LLM:
      return 'llm'
    case OFBlockEnum.Iteration:
      return '迭代'
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

function normalizeNode(node: OFNode): OFNode {
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
        title,
        desc: data.desc || '',
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
    return {
      ...node,
      data: {
        title,
        desc: data.desc || '',
        type: OFBlockEnum.Iteration,
        iterationMode: data.iterationMode || 'fixed-count',
        iterationCount: Math.max(1, Number(data.iterationCount || 3)),
        iterationSource: data.iterationSource || '',
        mockTemplateId: data.mockTemplateId || 'llm-summary',
        preview: data.preview || {
          label: '迭代开始',
          nodes: [
            { id: 'preview-start', type: 'start', title: '开始' },
            {
              id: 'preview-llm',
              type: 'llm',
              title: 'LLM 2',
              subtitle: 'Pro/moonshotai/Ki...'
            }
          ]
        },
        mockRun: data.mockRun || {
          iterations: [
            {
              index: 1,
              title: '第 1 轮',
              input: '提取候选信息',
              outputSummary: '生成第一轮摘要并筛选重点',
              status: OFNodeRunningStatus.Succeeded
            },
            {
              index: 2,
              title: '第 2 轮',
              input: '补充缺失上下文',
              outputSummary: '收敛到最终摘要',
              status: OFNodeRunningStatus.Succeeded
            }
          ],
          summary: '已完成 2 轮模拟迭代，输出合并摘要。',
          finalOutput: '这是迭代节点的最终模拟输出。'
        },
        output: {
          variables: buildIterationOutputVariables(title, `iteration_${node.id}`)
        }
      } as OFIterationNodeData
    }
  }

  if (node.data.type === OFBlockEnum.IfElse) {
    const data = node.data as Partial<OFIfElseNodeData>
    return {
      ...node,
      data: {
        title: normalizeNodeTitle(OFBlockEnum.IfElse, data.title),
        desc: data.desc || '',
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
            mockRun: {
              ...data.mockRun,
              summary: replacePromptNamespace(
                data.mockRun?.summary || '',
                oldNamespace,
                newNamespace
              ),
              finalOutput: replacePromptNamespace(
                data.mockRun?.finalOutput || '',
                oldNamespace,
                newNamespace
              ),
              iterations: (data.mockRun?.iterations || []).map((item) => ({
                ...item,
                input: replacePromptNamespace(item.input || '', oldNamespace, newNamespace),
                outputSummary: replacePromptNamespace(
                  item.outputSummary || '',
                  oldNamespace,
                  newNamespace
                )
              }))
            },
            output: {
              variables: buildIterationOutputVariables(newNamespace, `iteration_${node.id}`)
            }
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
    nodes.value = data.nodes.map(normalizeNode)
    edges.value = data.edges
  }

  async function saveWorkflow() {
    if (!currentWorkflowId.value) return
    // 深拷贝去除 Vue 响应式属性和 VueFlow 内部属性
    const nodesData = JSON.parse(JSON.stringify(nodes.value))
    const edgesData = JSON.parse(JSON.stringify(edges.value))
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
          iterationMode: 'fixed-count',
          iterationCount: 3,
          iterationSource: '',
          mockTemplateId: 'llm-summary',
          preview: {
            label: '迭代开始',
            nodes: [
              { id: 'preview-start', type: 'start', title: '开始' },
              {
                id: 'preview-llm',
                type: 'llm',
                title: 'LLM 2',
                subtitle: 'Pro/moonshotai/Ki...'
              }
            ]
          },
          mockRun: {
            iterations: [
              {
                index: 1,
                title: '第 1 轮',
                input: '读取输入上下文并拆解任务',
                outputSummary: '完成第一轮候选答案整理',
                status: OFNodeRunningStatus.Succeeded
              },
              {
                index: 2,
                title: '第 2 轮',
                input: '继续补齐缺失信息',
                outputSummary: '收敛为最终摘要',
                status: OFNodeRunningStatus.Succeeded
              }
            ],
            summary: '模拟执行 2 轮内部循环。',
            finalOutput: '这是迭代节点的默认模拟输出。'
          },
          output: { variables: buildIterationOutputVariables(title, `iteration_${id}`) }
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

    const newNode: OFNode = { id, type: vueFlowType, position, data: nodeData }
    nodes.value = [...nodes.value, newNode]
    scheduleSave()
    return id
  }

  // 更新节点数据
  function updateNode(nodeId: string, data: Partial<OFNode['data']>) {
    const currentNode = nodes.value.find((node) => node.id === nodeId)
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
      const iterationPatch = data as Partial<OFIterationNodeData>
      const iterationData = {
        ...(currentNode.data as OFIterationNodeData),
        ...nextData
      } as OFIterationNodeData
      if (typeof nextData.title === 'string' || iterationPatch.mockRun) {
        nextData = {
          ...nextData,
          output: {
            variables: buildIterationOutputVariables(iterationData.title, `iteration_${nodeId}`)
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

    nodes.value = nodes.value.map((node) =>
      node.id === nodeId
        ? normalizeNode({
            ...node,
            data: {
              ...node.data,
              ...nextData
            }
          } as OFNode)
        : node
    )

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
    const exists = nodes.value.some((n) => n.id === nodeId)
    if (!exists) return

    nodes.value = nodes.value.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            data: {
              ...node.data,
              _runningStatus: status
            }
          }
        : node
    )
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
    nodes.value = nodes.value.filter((n) => n.id !== nodeId)
    edges.value = edges.value.filter((e) => e.source !== nodeId && e.target !== nodeId)
    scheduleSave()
  }

  // 添加边
  function addEdge(edge: OFEdge) {
    edges.value = [...edges.value, edge]
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
    const exists = nodes.value.some((n) => n.id === nodeId)
    if (exists) {
      nodes.value = nodes.value.map((node) => (node.id === nodeId ? { ...node, position } : node))
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
          nodes.value = nodes.value.filter((n) => n.id !== change.id)
          edges.value = edges.value.filter((e) => e.source !== change.id && e.target !== change.id)
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
    unloadWorkflow,
    updateNodePosition,
    applyNodeChanges,
    applyEdgeChanges
  }
})
