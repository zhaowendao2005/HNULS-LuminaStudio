/**
 * Sources DataSource
 *
 * 负责 Renderer ↔ Preload API 之间的类型映射与数据转换
 */
import type {
  KnowledgeDatabaseListDocsRequest,
  KnowledgeDatabaseConnectionStatus
} from '@preload/types'
import type {
  KnowledgeBaseInfo,
  DocumentInfo,
  DocumentEmbeddingItem
} from '@shared/knowledge-database-api.types'
import type {
  SourceKnowledgeBase,
  SourceDocument,
  EmbeddingConfigStatus,
  DocumentStatusSummary,
  ConnectionState
} from './sources.types'

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
 * 映射单个嵌入配置到 UI 模型
 */
function mapEmbeddingConfig(item: DocumentEmbeddingItem, isDefault: boolean): EmbeddingConfigStatus {
  return {
    configId: item.embeddingConfigId,
    dimensions: item.dimensions,
    status: item.status,
    chunkCount: item.chunkCount,
    updatedAt: item.updatedAt,
    isDefault,
    selected: false
  }
}

/**
 * 计算推荐的默认嵌入配置（用于 UI 默认展示顺序/标记，不会自动选中）
 * 优先级：completed > dimensions 大 > updatedAt 新
 */
function determineDefaultEmbedding(embeddings: DocumentEmbeddingItem[]): { configId: string; dimensions: number } | null {
  if (!embeddings || embeddings.length === 0) return null

  const completed = embeddings.filter((e) => e.status === 'completed')
  const candidates = completed.length > 0 ? completed : embeddings

  const sorted = [...candidates].sort((a, b) => {
    if (a.dimensions !== b.dimensions) return b.dimensions - a.dimensions
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })

  return { configId: sorted[0].embeddingConfigId, dimensions: sorted[0].dimensions }
}

/**
 * 计算文档状态摘要
 */
function computeStatusSummary(embeddings: EmbeddingConfigStatus[]): DocumentStatusSummary {
  const totalConfigs = embeddings.length
  const completedConfigs = embeddings.filter((e) => e.status === 'completed').length
  const hasRunning = embeddings.some((e) => e.status === 'running')
  const hasFailed = embeddings.some((e) => e.status === 'failed')
  const allCompleted = totalConfigs > 0 && completedConfigs === totalConfigs

  return {
    hasEmbeddings: totalConfigs > 0,
    allCompleted,
    hasRunning,
    hasFailed,
    totalConfigs,
    completedConfigs
  }
}

/**
 * 映射外部 API 文档到 UI 文档模型
 */
function mapDocument(doc: DocumentInfo): SourceDocument {
  const defaultEmbedding = determineDefaultEmbedding(doc.embeddings)
  const embeddings = doc.embeddings
    .map((item) =>
      mapEmbeddingConfig(
        item,
        !!defaultEmbedding && item.embeddingConfigId === defaultEmbedding.configId && item.dimensions === defaultEmbedding.dimensions
      )
    )
    // 推荐配置排前面（仅影响展示顺序）
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))

  const statusSummary = computeStatusSummary(embeddings)

  return {
    id: doc.id,
    name: doc.fileName,
    fileKey: doc.fileKey,
    type: mapFileType(doc.fileType),
    embeddings,
    statusSummary,
    expanded: false,
    selectedEmbedding: null,
    hasSelectedEmbedding: false,
    updatedAt: doc.updatedAt
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
