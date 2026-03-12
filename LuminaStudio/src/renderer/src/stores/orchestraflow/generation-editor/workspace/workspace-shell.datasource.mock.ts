/**
 * workspace 域当前只管理前端 UI 状态，没有后端接入。
 * 按项目约定，这里显式保留 mock datasource。
 */
export const WorkspaceShellDataSourceMock = {
  createDefaults() {
    return {
      activeMenu: 'analysis' as const,
      activeRightPanel: null as 'analysis' | 'design' | 'verify' | null,
      isLeftSidebarCollapsed: false,
      isRightPanelFullscreen: false,
      showConfigDrawer: false,
      showModelSelector: false,
      configDrawerTab: 'analysis' as const
    }
  }
}
