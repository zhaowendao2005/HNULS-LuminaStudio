import type { OFJsonSchemaProperty, OFStructuredJsonSchema } from './Orchestraflow-types/core-types'

/**
 * knowledge-retrieval 节点共享契约。
 * 这里只放纯类型与纯常量，避免掺入运行时实现。
 */

export const KNOWLEDGE_RETRIEVAL_NODE_TYPE = 'knowledge-retrieval' as const
export const KNOWLEDGE_RETRIEVAL_AUTHORING_TOKEN = 'knowledge-retrieval' as const

/**
 * 检索数据来源提供方。
 * 共享层只描述能力，不绑定具体实现。
 */
export interface KnowledgeRetrievalProviderDescriptor {
  id: string
  label: string
  kind: 'knowledge-base'
  supportsMultipleScopes: boolean
  supportsFileFilter: boolean
  supportsKeywordFilter: boolean
  supportsRerank: boolean
  notes?: string[]
}

/**
 * 单个可检索 scope 的描述。
 */
export interface KnowledgeRetrievalScopeDescriptor {
  scopeId: string
  knowledgeBaseId?: number | null
  tableName?: string | null
  label: string
  description?: string
  fileKeys?: string[]
  metadata?: Record<string, unknown>
}

/**
 * authoring / editor 可用的权限树。
 * 这里不绑定某个 UI 组件，仅表达结构。
 */
export interface KnowledgeRetrievalPermissionTreeNode {
  id: string
  label: string
  kind: 'provider' | 'knowledge-base' | 'scope' | 'file'
  checked?: boolean
  disabled?: boolean
  description?: string
  knowledgeBaseId?: number | null
  knowledge_base_id?: number | null
  fileKey?: string | null
  file_key?: string | null
  metadata?: Record<string, unknown>
  children?: KnowledgeRetrievalPermissionTreeNode[]
}

export interface KnowledgeRetrievalPermissionTree {
  providers: KnowledgeRetrievalPermissionTreeNode[]
  /**
   * 旧结构：单知识库目标。
   * 仍然保留，避免历史工作流数据失效。
   */
  knowledgeBaseId?: number | null
  /**
   * 新结构：显式多知识库目标（仅目标，不含文档细粒度规则）。
   */
  knowledgeBaseIds?: number[]
}

/**
 * 运行时 permission tree。
 *
 * 当前 renderer 面板和 main 进程解析器还处在并行演进阶段，
 * 因此这里先兼容两类信息：
 * 1. renderer 侧展示用的 providers 树
 * 2. main 检索服务实际消费的 effect / documents 规则
 */
export type KnowledgeRetrievalPermissionEffect = 'allow' | 'deny' | 'inherit'

export interface OFKnowledgeRetrievalEmbeddingRule {
  embeddingConfigId: string
  dimensions: number
  effect?: KnowledgeRetrievalPermissionEffect
}

export interface OFKnowledgeRetrievalDocumentRule {
  fileKey: string
  effect?: KnowledgeRetrievalPermissionEffect
  embeddings?: OFKnowledgeRetrievalEmbeddingRule[]
}

/**
 * 新结构：按知识库分层声明 permission 规则。
 * - effect/documents 规则优先应用在 knowledgeBaseId 对应的库上
 * - 若只选中知识库但不配 documents，执行层默认该库全量文档可检索
 */
export interface OFKnowledgeRetrievalKnowledgeBaseRule {
  knowledgeBaseId?: number | null
  knowledge_base_id?: number | null
  effect?: KnowledgeRetrievalPermissionEffect
  documents?: OFKnowledgeRetrievalDocumentRule[]
}

export interface OFKnowledgePermissionTree extends KnowledgeRetrievalPermissionTree {
  effect?: KnowledgeRetrievalPermissionEffect
  documents?: OFKnowledgeRetrievalDocumentRule[]
  /**
   * 新结构：按知识库拆分规则。
   */
  knowledgeBases?: OFKnowledgeRetrievalKnowledgeBaseRule[]
  /**
   * 兼容字段：部分旧序列化可能使用 snake_case。
   */
  knowledge_base_rules?: OFKnowledgeRetrievalKnowledgeBaseRule[]
}

/**
 * 节点配置里的检索 scope。
 */
export interface KnowledgeRetrievalScopeInput {
  scope_id: string
  label?: string
  knowledge_base_id?: number | null
  table_name?: string | null
  file_keys?: string[]
}

export type KnowledgeRetrievalPromptRole = 'system' | 'user' | 'assistant'

export interface KnowledgeRetrievalPromptItem {
  id: string
  role: KnowledgeRetrievalPromptRole
  text: string
}

/**
 * 节点配置 DTO。
 */
export interface KnowledgeRetrievalNodeConfigDTO {
  query_template: KnowledgeRetrievalPromptItem[]
  permission_tree: OFKnowledgePermissionTree
  top_k: number
  ef: number | null
  rerank_enabled: boolean
  rerank_model_id: string | null
  rerank_top_n: number | null
}

/**
 * 单条命中结果。
 */
export interface KnowledgeRetrievalItem {
  scope_id: string
  knowledge_base_id?: number | null
  table_name?: string | null
  file_key?: string
  chunk_id?: string
  title?: string
  snippet: string
  score?: number | null
  metadata?: Record<string, unknown>
}

/**
 * 标准化输出结构。
 * result 与知识节点的主变量结构保持一致，便于工作流下游统一读取。
 */
export interface KnowledgeRetrievalNormalizedResult {
  query: string
  total_scopes: number
  total_hits: number
  partial_failure: boolean
  items: KnowledgeRetrievalItem[]
}

/**
 * 显式暴露变量集合。
 */
export interface KnowledgeRetrievalOutputPayload extends KnowledgeRetrievalNormalizedResult {
  result: KnowledgeRetrievalNormalizedResult
}

/**
 * 供 shared definition 直接复用的对象 schema。
 */
export const knowledgeRetrievalResultSchema: OFStructuredJsonSchema = {
  type: 'object',
  required: ['query', 'total_scopes', 'total_hits', 'partial_failure', 'items'],
  additionalProperties: false,
  properties: {
    query: {
      type: 'string',
      description: '本次检索执行使用的查询文本。'
    },
    total_scopes: {
      type: 'number',
      description: '本次实际参与检索的 scope 数量。'
    },
    total_hits: {
      type: 'number',
      description: '所有 scope 命中的总条数。'
    },
    partial_failure: {
      type: 'boolean',
      description: '是否存在部分 scope 失败但整体仍返回结果。'
    },
    items: {
      type: 'array',
      description: '标准化后的命中列表。',
      items: {
        type: 'object',
        required: ['scope_id', 'snippet'],
        additionalProperties: false,
        properties: {
          scope_id: { type: 'string', description: '命中记录所属的 scope id。' },
          knowledge_base_id: { type: 'number', description: '知识库 id。' },
          table_name: { type: 'string', description: '向量表名。' },
          file_key: { type: 'string', description: '源文件 key。' },
          chunk_id: { type: 'string', description: '切片 id。' },
          title: { type: 'string', description: '可选标题。' },
          snippet: { type: 'string', description: '命中的正文片段。' },
          score: { type: 'number', description: '可选得分。' },
          metadata: {
            type: 'object',
            description: '附加元数据。',
            required: [],
            additionalProperties: false,
            properties: {}
          }
        }
      }
    }
  }
}

/**
 * 精简版 schema，便于单字段变量复用。
 */
export const knowledgeRetrievalItemSchema: OFJsonSchemaProperty =
  knowledgeRetrievalResultSchema.properties.items
