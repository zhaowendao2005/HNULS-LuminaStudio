import type { NormalChatLayoutSnapshot } from './layout-shell.types'

/**
 * NormalChat 布局 mock
 * 说明：当前是快调阶段，先固定默认布局，后续 datasource 可切换到真实持久化。
 */
export const layoutShellMock: NormalChatLayoutSnapshot = {
  leftCollapsed: true,
  rightCollapsed: true,
  leftTab: 'conversation',
  rightPage: 'studio'
}
