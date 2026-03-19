/**
 * NormalChat 布局层类型
 * 说明：
 * - 这一组状态只负责「页面外壳」布局，不承载聊天业务数据
 * - 通过独立类型约束，避免组件里散落魔法字符串
 */
export type NormalChatLeftTab = 'conversation' | 'sources' | 'settings' | 'history'

export type NormalChatRightPage = 'studio' | 'dev'

export interface NormalChatLayoutSnapshot {
  leftCollapsed: boolean
  rightCollapsed: boolean
  leftTab: NormalChatLeftTab
  rightPage: NormalChatRightPage
}
