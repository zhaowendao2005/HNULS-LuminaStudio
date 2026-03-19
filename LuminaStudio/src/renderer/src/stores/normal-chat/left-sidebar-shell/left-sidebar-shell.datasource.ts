import { leftSidebarShellMock } from './left-sidebar-shell.mock'
import type { LeftSidebarSnapshot } from './left-sidebar-shell.types'

/**
 * 左侧栏数据源
 * 说明：
 * - store 只依赖 datasource，后续替换数据来源时不用改组件
 * - 当前先走 mock，满足快调阶段 UI 验证
 */
export class LeftSidebarShellDatasource {
  async loadSnapshot(): Promise<LeftSidebarSnapshot> {
    return structuredClone(leftSidebarShellMock)
  }

  async saveSnapshot(_snapshot: LeftSidebarSnapshot): Promise<void> {
    // 预留：未来可接本地缓存或后端接口
  }
}
