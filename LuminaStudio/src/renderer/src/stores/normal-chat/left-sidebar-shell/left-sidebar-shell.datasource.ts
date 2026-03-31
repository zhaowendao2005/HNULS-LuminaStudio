/**
 * @deprecated Unused legacy shell datasource. This directory is not wired into the current normal-chat renderer flow.
 */
import type { LeftSidebarSnapshot } from './left-sidebar-shell.types'

function createDefaultSnapshot(): LeftSidebarSnapshot {
  return {
    activeTab: 'assistants',
    activeAssistantId: '',
    activeTopicId: '',
    assistants: [],
    drawSectionLabel: 'Drawers',
    toolsSectionLabel: 'Tools',
    tools: [],
    topics: []
  }
}

export class LeftSidebarShellDatasource {
  async loadSnapshot(): Promise<LeftSidebarSnapshot> {
    return createDefaultSnapshot()
  }

  async saveSnapshot(_snapshot: LeftSidebarSnapshot): Promise<void> {
    // Reserved for future persistence.
  }
}
