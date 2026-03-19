import { assistantShellMock } from './assistant-shell.mock'
import type { AssistantShellSnapshot } from './assistant-shell.types'

/**
 * 助手壳层 datasource
 * 说明：当前走 mock，后续可替换为接口/本地持久化。
 */
export class AssistantShellDatasource {
  async loadSnapshot(): Promise<AssistantShellSnapshot> {
    return structuredClone(assistantShellMock)
  }

  async saveSnapshot(_snapshot: AssistantShellSnapshot): Promise<void> {
    // 预留：未来按业务接持久化
  }
}
