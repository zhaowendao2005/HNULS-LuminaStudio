import type { NormalChatLayoutSnapshot } from './layout-shell.types'
import { layoutShellMock } from './layout-shell.mock'

/**
 * NormalChat 布局数据源
 * 说明：
 * - store 只跟 datasource 交互，保持 SSOT 单入口
 * - 这里先返回 mock，后续可无缝替换为 IPC / 本地存储
 */
export class LayoutShellDatasource {
  async loadSnapshot(): Promise<NormalChatLayoutSnapshot> {
    return structuredClone(layoutShellMock)
  }

  async saveSnapshot(_snapshot: NormalChatLayoutSnapshot): Promise<void> {
    // 预留：未来可接入持久化
  }
}
