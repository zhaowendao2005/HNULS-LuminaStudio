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

export const useWorkflowEditorUIStore = defineStore('orchestraflow-workflow-editor-ui', () => {
  // ===== State =====

  /**
   * 系统变量面板显示状态
   */
  const showSystemVariablesPanel = ref(false)

  /**
   * 节点配置面板显示状态
   */
  const showNodeConfigPanel = ref(false)

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
  const showWorkflowRunPanel = ref(false)

  // ===== Computed =====

  /**
   * 当前是否显示了任何面板
   */
  const hasAnyPanelOpen = computed(() => {
    return showSystemVariablesPanel.value || showNodeConfigPanel.value
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

  /**
   * 打开系统变量面板
   */
  function openSystemVariablesPanel() {
    showSystemVariablesPanel.value = true
    showNodeConfigPanel.value = false
    currentPanelType.value = PanelType.SystemVariables
  }

  /**
   * 关闭系统变量面板
   */
  function closeSystemVariablesPanel() {
    showSystemVariablesPanel.value = false
    currentPanelType.value = null
  }

  /**
   * 打开节点配置面板
   */
  function openNodeConfigPanel(nodeId: string, nodeType: OFBlockEnum) {
    selectedNodeId.value = nodeId
    selectedNodeType.value = nodeType
    const panelType = getPanelTypeByNodeType(nodeType)

    if (panelType) {
      showNodeConfigPanel.value = true
      showSystemVariablesPanel.value = false
      currentPanelType.value = panelType
    }
  }

  /**
   * 关闭节点配置面板
   */
  function closeNodeConfigPanel() {
    showNodeConfigPanel.value = false
    selectedNodeId.value = null
    selectedNodeType.value = null
    currentPanelType.value = null
  }

  /**
   * 关闭所有面板
   */
  function closeAllPanels() {
    showSystemVariablesPanel.value = false
    showNodeConfigPanel.value = false
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
    showWorkflowRunPanel.value = true
  }

  /**
   * 关闭运行结果面板
   */
  function closeWorkflowRunPanel() {
    showWorkflowRunPanel.value = false
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

    // Computed
    hasAnyPanelOpen,

    // Actions
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
