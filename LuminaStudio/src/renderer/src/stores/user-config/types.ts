/**
 * User Config Store 本地类型定义（UI 层）
 */

import type { ApiKeyEntry, ApiKeysConfig } from '@preload/types'

export interface UserConfigState {
  apiKeys: ApiKeysConfig
  isLoaded: boolean
}

/**
 * 渲染层表单使用的 provider 分组结构。
 *
 * 这里不重新发 IPC，直接基于完整 registry 做只读筛选即可。
 */
export interface ApiKeyEntriesByProvider {
  providerId: string
  entries: ApiKeyEntry[]
}
