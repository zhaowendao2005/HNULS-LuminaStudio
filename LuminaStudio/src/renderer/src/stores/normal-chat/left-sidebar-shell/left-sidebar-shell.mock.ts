/**
 * @deprecated Unused legacy shell mock. Kept only until the left-sidebar-shell directory is deleted.
 */
import type { LeftSidebarSnapshot } from './left-sidebar-shell.types'

/**
 * 左侧栏 mock 数据
 * 说明：和你给的 React 片段保持一致，先用于 UI 快速复刻。
 */
export const leftSidebarShellMock: LeftSidebarSnapshot = {
  activeTab: 'assistants',
  activeAssistantId: 'assistant-default',
  activeTopicId: 'topic-default',
  assistants: [
    {
      id: 'assistant-default',
      name: '默认助手',
      emoji: '🤪'
    }
  ],
  drawSectionLabel: '绘图',
  toolsSectionLabel: 'tools',
  tools: [
    { id: 'tool-1', title: '排版为表格' },
    { id: 'tool-2', title: '排版英语习题' },
    { id: 'tool-3', title: '内容校对' },
    { id: 'tool-4', title: '排版为表格-v2' }
  ],
  topics: [
    {
      id: 'topic-default',
      title: '默认话题'
    }
  ]
}
