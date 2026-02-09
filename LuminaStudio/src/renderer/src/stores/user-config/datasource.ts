/**
 * User Config DataSource
 *
 * 数据源适配器：负责 Renderer ↔ Preload API 之间的数据读取与写入
 */
import type { ApiKeysConfig } from '@preload/types'

export const UserConfigDataSource = {
  async getApiKeys(): Promise<ApiKeysConfig> {
    return await window.api.userSettings.getApiKeys()
  },

  async updateApiKeys(keys: Partial<ApiKeysConfig>): Promise<ApiKeysConfig> {
    return await window.api.userSettings.updateApiKeys(keys)
  }
}
