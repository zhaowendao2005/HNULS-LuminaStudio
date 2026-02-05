/**
 * Sources Store UI 类型定义
 *
 * 注意：跨进程类型定义在 @preload/types 中
 */

import type { DocumentEmbeddingStatus } from '@shared/knowledge-database-api.types'

/**
 * 单个嵌入配置的状态信息 (UI展示用)
 */
export interface EmbeddingConfigStatus {
  /** 嵌入配置 ID */
  configId: string
  /** 向量维度 */
  dimensions: number
  /** 状态 */
  status: DocumentEmbeddingStatus
  /** 分片数量 */
  chunkCount: number
  /** 更新时间 */
  updatedAt: string
  /** 是否为推荐（默认）配置 */
  isDefault: boolean
  /** 当前是否被选中 */
  selected: boolean
}

/**
 * 文档整体状态摘要 (UI展示用)
 */
export interface DocumentStatusSummary {
  /** 是否有任何嵌入配置 */
  hasEmbeddings: boolean
  /** 是否所有配置都已完成 */
  allCompleted: boolean
  /** 是否有正在运行的配置 */
  hasRunning: boolean
  /** 是否有失败的配置 */
  hasFailed: boolean
  /** 嵌入配置总数 */
  totalConfigs: number
  /** 已完成配置数 */
  completedConfigs: number
}

/**
 * 文档 UI 模型
 */
export interface SourceDocument {
  id: string
  name: string
  fileKey: string
  type: 'pdf' | 'md' | 'txt' | 'other'
  /** 文档的所有嵌入配置状态列表 */
  embeddings: EmbeddingConfigStatus[]
  /** 文档状态摘要（聚合计算）*/
  statusSummary: DocumentStatusSummary
  /** UI：文档节点是否展开 */
  expanded: boolean
  /** 当前选中的嵌入（由点击子节点产生）；未选择时为 null */
  selectedEmbedding: { configId: string; dimensions: number } | null
  /** 是否已选择（等价于 selectedEmbedding != null，保留便于模板使用） */
  hasSelectedEmbedding: boolean
  updatedAt: string
}

/**
 * 知识库 UI 模型
 */
export interface SourceKnowledgeBase {
  id: number
  name: string
  description: string
  color: string
  icon: string
  documents: SourceDocument[]
  documentsLoaded: boolean
  documentsLoading: boolean
}

/**
 * 连接状态
 */
export interface ConnectionState {
  connected: boolean
  baseUrl?: string
  error?: string
  checking: boolean
}
