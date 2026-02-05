/**
 * Knowledge Database 跨进程类型定义（Preload 权威来源）
 *
 * 注意：
 * - 这些类型是 Renderer ↔ Preload ↔ Main 之间通信的契约
 * - 外部 API 的 DTO 定义在 @shared/knowledge-database-api.types.ts
 */

import type { ApiResponse } from './base.types'
import type {
  KnowledgeBaseInfo,
  DocumentInfo,
  ExternalApiErrorInfo
} from '@shared/knowledge-database-api.types'

// ==================== 请求类型 ====================

/**
 * 获取知识库列表请求（无需参数）
 */
export type KnowledgeDatabaseListBasesRequest = void

/**
 * 获取指定知识库下的文档列表请求
 */
export interface KnowledgeDatabaseListDocsRequest {
  knowledgeBaseId: number
  page?: number
  pageSize?: number
}

// ==================== 响应类型 ====================

/**
 * 知识库列表响应
 */
export interface KnowledgeDatabaseListBasesResponse {
  knowledgeBases: KnowledgeBaseInfo[]
}

/**
 * 文档列表响应
 */
export interface KnowledgeDatabaseListDocsResponse {
  documents: DocumentInfo[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * 连接状态响应
 */
export interface KnowledgeDatabaseConnectionStatus {
  connected: boolean
  baseUrl?: string
  error?: ExternalApiErrorInfo
}

// ==================== API 接口定义 ====================

/**
 * Knowledge Database API 契约
 */
export interface KnowledgeDatabaseAPI {
  /**
   * 检查与外部服务的连接状态
   */
  checkConnection: () => Promise<ApiResponse<KnowledgeDatabaseConnectionStatus>>

  /**
   * 获取所有知识库列表
   */
  listKnowledgeBases: () => Promise<ApiResponse<KnowledgeDatabaseListBasesResponse>>

  /**
   * 获取指定知识库下的文档列表
   */
  listDocuments: (
    request: KnowledgeDatabaseListDocsRequest
  ) => Promise<ApiResponse<KnowledgeDatabaseListDocsResponse>>
}
