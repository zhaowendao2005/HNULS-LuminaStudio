/**
 * Rerank Model Store 本地类型定义（UI 层）
 */

/**
 * 重排模型信息
 */
export interface RerankModel {
  id: string
  displayName: string
  group?: string
  providerName?: string
}

/**
 * 按分组组织的重排模型
 */
export interface RerankModelGroups {
  [groupName: string]: RerankModel[]
}
