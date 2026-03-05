/**
 * OrchestraFlow 工作流编辑器 UI 状态 Store
 *
 * 本模块专门管理以下全局 UI 状态：
 * - 面板显示/隐藏（系统变量面板、各节点配置面板）
 * - 当前选中的节点（用于面板关联）
 * - Tab 切换（设置/上次运行）
 * - 面板宽度
 * - 其他与业务逻辑无关的界面显示状态
 *
 * 注意：配置面板内部的表单字段不在此处管理，它们是临时性质的局部状态。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { OFBlockEnum } from '@shared/Orchestraflow-types'

/**
 * 面板类型枚举
 */
export enum PanelType {
  SystemVariables = 'system-variables',
  StartNode = 'start-node',
  LLMNode = 'llm-node',
  EndNode = 'end-node'
}

/**
 * Tab 类型
 */
export enum PanelTab {
  Settings = 'settings',
  LastRun = 'last-run'
}

export type PanelInstanceId = 'node-config' | 'system-variables' | 'workflow-run'

export interface PanelInstanceState {
  id: PanelInstanceId
  open: boolean
  order: number
  zIndex: number
  offsetX: number
}

const PANEL_IDS: PanelInstanceId[] = ['node-config', 'system-variables', 'workflow-run']
const PANEL_BASE_Z_INDEX = 30
const PANEL_STACK_OFFSET = 36

export const useWorkflowEditorUIStore = defineStore('orchestraflow-workflow-editor-ui', () => {
  // ===== State =====

  const panelInstances = ref<Record<PanelInstanceId, PanelInstanceState>>({
    'node-config': {
      id: 'node-config',
      open: false,
      order: 0,
      zIndex: PANEL_BASE_Z_INDEX,
      offsetX: 0
    },
    'system-variables': {
      id: 'system-variables',
      open: false,
      order: 0,
      zIndex: PANEL_BASE_Z_INDEX,
      offsetX: 0
    },
    'workflow-run': {
      id: 'workflow-run',
      open: false,
      order: 0,
      zIndex: PANEL_BASE_Z_INDEX,
      offsetX: 0
    }
  })
  const activePanelId = ref<PanelInstanceId | null>(null)
  let panelOrderSeed = 0

  /**
   * 系统变量面板显示状态
   */
  const showSystemVariablesPanel = computed(
    () => panelInstances.value['system-variables'].open
  )

  /**
   * 节点配置面板显示状态
   */
  const showNodeConfigPanel = computed(() => panelInstances.value['node-config'].open)

  /**
   * 当前面板类型
   */
  const currentPanelType = ref<PanelType | null>(null)

  /**
   * 当前选中的节点 ID
   */
  const selectedNodeId = ref<string | null>(null)

  /**
   * 当前选中的节点类型
   */
  const selectedNodeType = ref<OFBlockEnum | null>(null)

  /**
   * 当前激活的 Tab
   */
  const activeTab = ref<PanelTab>(PanelTab.Settings)

  /**
   * 面板宽度
   */
  const panelWidth = ref(420)

  /**
   * 面板是否正在调整宽度
   */
  const isResizing = ref(false)

  /**
   * 运行结果面板显示状态
   */
  const showWorkflowRunPanel = computed(() => panelInstances.value['workflow-run'].open)

  const openPanelInstances = computed(() => {
    return PANEL_IDS.map((id) => panelInstances.value[id])
      .filter((instance) => instance.open)
      .sort((a, b) => a.zIndex - b.zIndex)
  })

  // ===== Computed =====

  /**
   * 当前是否显示了任何面板
   */
  const hasAnyPanelOpen = computed(() => {
    return openPanelInstances.value.length > 0
  })

  /**
   * 根据节点类型获取对应的面板类型
   */
  function getPanelTypeByNodeType(nodeType: OFBlockEnum): PanelType | null {
    switch (nodeType) {
      case OFBlockEnum.Start:
        return PanelType.StartNode
      case OFBlockEnum.LLM:
        return PanelType.LLMNode
      case OFBlockEnum.End:
        return PanelType.EndNode
      default:
        return null
    }
  }

  // ===== Actions =====

  function syncStackLayout() {
    const opened = PANEL_IDS.map((id) => panelInstances.value[id])
      .filter((instance) => instance.open)
      .sort((a, b) => a.order - b.order)

    opened.forEach((instance, index) => {
      const depthFromTop = opened.length - 1 - index
      instance.zIndex = PANEL_BASE_Z_INDEX + index
      instance.offsetX = depthFromTop * PANEL_STACK_OFFSET
    })

    const openedIds = new Set(opened.map((instance) => instance.id))
    PANEL_IDS.forEach((id) => {
      if (!openedIds.has(id)) {
        panelInstances.value[id].zIndex = PANEL_BASE_Z_INDEX
        panelInstances.value[id].offsetX = 0
      }
    })

    activePanelId.value = opened.length > 0 ? opened[opened.length - 1].id : null
  }

  function openPanel(panelId: PanelInstanceId) {
    const panel = panelInstances.value[panelId]
    panel.open = true
    panel.order = ++panelOrderSeed
    syncStackLayout()
  }

  function focusPanel(panelId: PanelInstanceId) {
    const panel = panelInstances.value[panelId]
    if (!panel.open) {
      openPanel(panelId)
      return
    }
    panel.order = ++panelOrderSeed
    syncStackLayout()
  }

  function closePanel(panelId: PanelInstanceId) {
    const panel = panelInstances.value[panelId]
    if (!panel.open) return
    panel.open = false
    panel.order = 0
    panel.zIndex = PANEL_BASE_Z_INDEX
    panel.offsetX = 0
    syncStackLayout()
  }

  function isPanelActive(panelId: PanelInstanceId): boolean {
    return activePanelId.value === panelId
  }

  function getPanelStyle(panelId: PanelInstanceId): { zIndex: number; offsetX: number } {
    const panel = panelInstances.value[panelId]
    return {
      zIndex: panel.zIndex,
      offsetX: panel.offsetX
    }
  }

  /**
   * 打开系统变量面板
   */
  function openSystemVariablesPanel() {
    currentPanelType.value = PanelType.SystemVariables
    openPanel('system-variables')
  }

  /**
   * 关闭系统变量面板
   */
  function closeSystemVariablesPanel() {
    closePanel('system-variables')
    if (currentPanelType.value === PanelType.SystemVariables) {
      currentPanelType.value = null
    }
  }

  /**
   * 打开节点配置面板
   */
  function openNodeConfigPanel(nodeId: string, nodeType: OFBlockEnum) {
    selectedNodeId.value = nodeId
    selectedNodeType.value = nodeType
    const panelType = getPanelTypeByNodeType(nodeType)

    if (panelType) {
      currentPanelType.value = panelType
      openPanel('node-config')
    }
  }

  /**
   * 关闭节点配置面板
   */
  function closeNodeConfigPanel() {
    closePanel('node-config')
    selectedNodeId.value = null
    selectedNodeType.value = null
    if (
      currentPanelType.value === PanelType.StartNode ||
      currentPanelType.value === PanelType.LLMNode ||
      currentPanelType.value === PanelType.EndNode
    ) {
      currentPanelType.value = null
    }
  }

  /**
   * 关闭所有面板
   */
  function closeAllPanels() {
    closePanel('system-variables')
    closePanel('node-config')
    closePanel('workflow-run')
    selectedNodeId.value = null
    selectedNodeType.value = null
    currentPanelType.value = null
  }

  /**
   * 切换 Tab
   */
  function setActiveTab(tab: PanelTab) {
    activeTab.value = tab
  }

  /**
   * 设置面板宽度
   */
  function setPanelWidth(width: number) {
    panelWidth.value = Math.max(320, Math.min(600, width))
  }

  /**
   * 开始调整宽度
   */
  function startResize() {
    isResizing.value = true
  }

  /**
   * 结束调整宽度
   */
  function endResize() {
    isResizing.value = false
  }

  /**
   * 打开运行结果面板
   */
  function openWorkflowRunPanel() {
    openPanel('workflow-run')
  }

  /**
   * 关闭运行结果面板
   */
  function closeWorkflowRunPanel() {
    closePanel('workflow-run')
  }

  return {
    // State
    showSystemVariablesPanel,
    showNodeConfigPanel,
    currentPanelType,
    selectedNodeId,
    selectedNodeType,
    activeTab,
    panelWidth,
    isResizing,
    showWorkflowRunPanel,
    panelInstances,
    activePanelId,

    // Computed
    hasAnyPanelOpen,
    openPanelInstances,

    // Actions
    openPanel,
    focusPanel,
    closePanel,
    isPanelActive,
    getPanelStyle,
    syncStackLayout,
    openSystemVariablesPanel,
    closeSystemVariablesPanel,
    openNodeConfigPanel,
    closeNodeConfigPanel,
    closeAllPanels,
    setActiveTab,
    setPanelWidth,
    startResize,
    endResize,
    getPanelTypeByNodeType,
    openWorkflowRunPanel,
    closeWorkflowRunPanel
  }
})
