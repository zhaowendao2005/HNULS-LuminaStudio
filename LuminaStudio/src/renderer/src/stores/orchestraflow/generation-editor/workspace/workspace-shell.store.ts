import { ref } from 'vue'
import { defineStore } from 'pinia'
import { WorkspaceShellDataSourceMock } from './workspace-shell.datasource.mock'
import type { GenerateCopilotMode, GenerateMenuValue } from '../generation-editor.types'
import type { GenerationStageKey } from '@preload/types'

export const useGenerationWorkspaceShellStore = defineStore('of-generation-workspace-shell', () => {
  const defaults = WorkspaceShellDataSourceMock.createDefaults()
  const activeMenu = ref<GenerateMenuValue>(defaults.activeMenu)
  const activeRightPanel = ref<GenerateCopilotMode | null>(defaults.activeRightPanel)
  const isLeftSidebarCollapsed = ref(defaults.isLeftSidebarCollapsed)
  const isRightPanelFullscreen = ref(defaults.isRightPanelFullscreen)
  const showConfigDrawer = ref(defaults.showConfigDrawer)
  const showModelSelector = ref(defaults.showModelSelector)
  const configDrawerTab = ref<GenerationStageKey>(defaults.configDrawerTab)

  return {
    activeMenu,
    activeRightPanel,
    isLeftSidebarCollapsed,
    isRightPanelFullscreen,
    showConfigDrawer,
    showModelSelector,
    configDrawerTab
  }
})
