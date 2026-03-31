import type { NormalChatLayoutSnapshot } from './layout-shell.types'

function createDefaultSnapshot(): NormalChatLayoutSnapshot {
  return {
    leftCollapsed: false,
    rightCollapsed: false,
    leftTab: 'conversation',
    rightPage: 'studio'
  }
}

export class LayoutShellDatasource {
  async loadSnapshot(): Promise<NormalChatLayoutSnapshot> {
    return createDefaultSnapshot()
  }

  async saveSnapshot(_snapshot: NormalChatLayoutSnapshot): Promise<void> {
    // Reserved for future persistence.
  }
}
