/**
 * Sources DataSource
 *
 * 负责 Renderer ↔ Preload API 之间的类型映射与数据转换
 */
import type {
  KnowledgeDatabaseListDocsRequest,
  KnowledgeDatabaseConnectionStatus
} from '@preload/types'
import type { KnowledgeBaseInfo, DocumentInfo } from '@shared/knowledge-database-api.types'
import type { SourceKnowledgeBase, SourceDocument, DocumentStatus, ConnectionState } from './sources.types'

/**
 * 从嵌入状态映射到 UI 文档状态
 */
function mapEmbeddingStatusToDocStatus(embeddingStatus: string): DocumentStatus {
  // 简化映射：如果有嵌入状态，视为已解析和分块
  const embedded = embeddingStatus === 'completed'
  const chunked = embeddingStatus !== 'none' && embeddingStatus !== 'pending'
  const parsed = embeddingStatus !== 'none'

  return {
    parsed,
    chunked,
    embedded
  }
}

/**
 * 从文件类型推断 UI 类型
 */
function mapFileType(fileType: string): 'pdf' | 'md' | 'txt' | 'other' {
  const normalized = fileType.toLowerCase()
  if (normalized === 'pdf') return 'pdf'
  if (normalized === 'md' || normalized === 'markdown') return 'md'
  if (normalized === 'txt' || normalized === 'text') return 'txt'
  return 'other'
}

/**
 * 映射外部 API 文档到 UI 文档模型
 */
function mapDocument(doc: DocumentInfo): SourceDocument {
  return {
    id: doc.id,
    name: doc.fileName,
    type: mapFileType(doc.fileType),
    status: mapEmbeddingStatusToDocStatus(doc.embeddingStatus),
    selected: false
  }
}

/**
 * 映射外部 API 知识库到 UI 知识库模型
 */
function mapKnowledgeBase(kb: KnowledgeBaseInfo): SourceKnowledgeBase {
  return {
    id: kb.id,
    name: kb.name,
    description: kb.description,
    color: kb.color || '#10b981', // 默认 emerald 颜色
    icon: kb.icon || 'book',
    documents: [],
    documentsLoaded: false,
    documentsLoading: false
  }
}

/**
 * 映射连接状态
 */
function mapConnectionStatus(status: KnowledgeDatabaseConnectionStatus): ConnectionState {
  return {
    connected: status.connected,
    baseUrl: status.baseUrl,
    error: status.error?.message,
    checking: false
  }
}

export const SourcesDataSource = {
  /**
   * 检查连接状态
   */
  async checkConnection(): Promise<ConnectionState> {
    const res = await window.api.knowledgeDatabase.checkConnection()
    if (!res.success || !res.data) {
      return {
        connected: false,
        error: res.error || 'Failed to check connection',
        checking: false
      }
    }
    return mapConnectionStatus(res.data)
  },

  /**
   * 获取所有知识库列表
   */
  async listKnowledgeBases(): Promise<SourceKnowledgeBase[]> {
    const res = await window.api.knowledgeDatabase.listKnowledgeBases()
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to load knowledge bases')
    }
    return res.data.knowledgeBases.map(mapKnowledgeBase)
  },

  /**
   * 获取指定知识库下的文档列表
   */
  async listDocuments(request: KnowledgeDatabaseListDocsRequest): Promise<{
    documents: SourceDocument[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }> {
    const res = await window.api.knowledgeDatabase.listDocuments(request)
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to load documents')
    }

    return {
      documents: res.data.documents.map(mapDocument),
      total: res.data.total,
      page: res.data.page,
      pageSize: res.data.pageSize,
      totalPages: res.data.totalPages
    }
  }
}
