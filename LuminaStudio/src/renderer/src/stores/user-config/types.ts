/**
 * User Config Store 本地类型定义（UI 层）
 */

import type { ApiKeysConfig } from '@preload/types'

export interface UserConfigState {
  apiKeys: ApiKeysConfig
  isLoaded: boolean
}
