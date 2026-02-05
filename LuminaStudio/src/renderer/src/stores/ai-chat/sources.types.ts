/**
 * Sources Store UI 类型定义
 *
 * 注意：跨进程类型定义在 @preload/types 中
 */

/**
 * 文档状态信息 (UI展示用)
 */
export interface DocumentStatus {
  parsed: boolean
  chunked: boolean
  embedded: boolean
}

/**
 * 文档 UI 模型
 */
export interface SourceDocument {
  id: string
  name: string
  type: 'pdf' | 'md' | 'txt' | 'other'
  status: DocumentStatus
  selected: boolean
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
