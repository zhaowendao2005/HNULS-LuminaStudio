/**
 * Rerank Model 跨进程类型定义（Preload 权威来源）
 *
 * 用于从 KnowledgeDatabase 外部服务获取可用的重排模型列表
 */

import type { ApiResponse } from './base.types'

// ==================== 数据类型 ====================

/**
 * 重排模型信息（脱敏，仅供展示和选择）
 */
export interface RerankModelInfo {
  /** 模型唯一标识，用于 API 调用 */
  id: string
  /** 显示名称 */
  displayName: string
  /** 模型分组（如 provider 名称） */
  group?: string
  /** 提供商名称 */
  providerName?: string
}

// ==================== 响应类型 ====================

/**
 * 重排模型列表响应
 */
export interface RerankModelListResponse {
  models: RerankModelInfo[]
}

// ==================== API 接口定义 ====================

/**
 * Rerank Model API 契约
 */
export interface RerankModelAPI {
  /**
   * 获取可用的重排模型列表
   */
  listRerankModels: () => Promise<ApiResponse<RerankModelListResponse>>
}
