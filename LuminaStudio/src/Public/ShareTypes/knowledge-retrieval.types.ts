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
 * 知识检索节点的显式选择状态。
 *
 * 这份状态是 renderer -> main -> utility 的主数据来源，
 * 运行时不再依赖 permission_tree 去反推“选了哪些知识库 / 文档”。
 */
export interface OFKnowledgeRetrievalSelectionState {
  knowledgeBaseIds: number[]
  selectedKnowledgeBaseIds: number[]
  selectedDocumentFileKeysByKnowledgeBase: Record<number, string[]>
}

function normalizeKnowledgeBaseId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const parsed = Number(value.trim())
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed
    }
  }
  return null
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const items = new Set<string>()
  for (const item of value) {
    if (typeof item !== 'string') {
      continue
    }
    const normalized = item.trim()
    if (normalized) {
      items.add(normalized)
    }
  }
  return [...items]
}

function normalizeSelectionMap(
  value: unknown,
  validKnowledgeBaseIds?: Set<number>
): Record<number, string[]> {
  if (!value || typeof value !== 'object') {
    return {}
  }

  const result: Record<number, string[]> = {}
  for (const [key, rawFileKeys] of Object.entries(value as Record<string, unknown>)) {
    const knowledgeBaseId = normalizeKnowledgeBaseId(key)
    if (!knowledgeBaseId) {
      continue
    }
    if (validKnowledgeBaseIds && !validKnowledgeBaseIds.has(knowledgeBaseId)) {
      continue
    }

    const normalizedFileKeys = normalizeStringArray(rawFileKeys)
    if (normalizedFileKeys.length === 0) {
      continue
    }
    result[knowledgeBaseId] = normalizedFileKeys.sort()
  }

  return result
}

/**
 * 统一归一化显式选择状态。
 *
 * 这里会同时清理知识库 id、文档 fileKey，并去重排序，
 * 方便 renderer / compiler / runtime 共享同一份结果。
 */
export function normalizeKnowledgeRetrievalSelection(
  input?: Partial<OFKnowledgeRetrievalSelectionState>,
  validKnowledgeBaseIds?: Set<number>
): OFKnowledgeRetrievalSelectionState {
  const knowledgeBaseIds = new Set<number>()
  const selectedKnowledgeBaseIds = new Set<number>()

  for (const value of input?.knowledgeBaseIds || []) {
    const knowledgeBaseId = normalizeKnowledgeBaseId(value)
    if (!knowledgeBaseId) {
      continue
    }
    if (validKnowledgeBaseIds && !validKnowledgeBaseIds.has(knowledgeBaseId)) {
      continue
    }
    knowledgeBaseIds.add(knowledgeBaseId)
  }

  for (const value of input?.selectedKnowledgeBaseIds || []) {
    const knowledgeBaseId = normalizeKnowledgeBaseId(value)
    if (!knowledgeBaseId) {
      continue
    }
    if (validKnowledgeBaseIds && !validKnowledgeBaseIds.has(knowledgeBaseId)) {
      continue
    }
    knowledgeBaseIds.add(knowledgeBaseId)
    selectedKnowledgeBaseIds.add(knowledgeBaseId)
  }

  const selectedDocumentFileKeysByKnowledgeBase = normalizeSelectionMap(
    input?.selectedDocumentFileKeysByKnowledgeBase,
    validKnowledgeBaseIds
  )

  for (const key of Object.keys(selectedDocumentFileKeysByKnowledgeBase)) {
    const knowledgeBaseId = Number(key)
    if (Number.isInteger(knowledgeBaseId) && knowledgeBaseId > 0) {
      knowledgeBaseIds.add(knowledgeBaseId)
      selectedKnowledgeBaseIds.add(knowledgeBaseId)
    }
  }

  const normalizedSelection: OFKnowledgeRetrievalSelectionState = {
    knowledgeBaseIds: [...knowledgeBaseIds].sort((left, right) => left - right),
    selectedKnowledgeBaseIds: [...selectedKnowledgeBaseIds].sort((left, right) => left - right),
    selectedDocumentFileKeysByKnowledgeBase
  }

  return normalizedSelection
}

/**
 * 从 permission tree 反推出显式选择状态。
 *
 * 这是旧数据兼容入口，主要用于 editor/compiler 迁移旧 workflow。
 * 运行时节点不再依赖它做主路径解析。
 */
export function buildKnowledgeRetrievalSelectionFromPermissionTree(
  permissionTree: OFKnowledgePermissionTree | undefined
): OFKnowledgeRetrievalSelectionState {
  if (!permissionTree) {
    return normalizeKnowledgeRetrievalSelection()
  }

  const knowledgeBaseIds = new Set<number>()
  const selectedKnowledgeBaseIds = new Set<number>()
  const selectedDocumentFileKeysByKnowledgeBase = new Map<number, Set<string>>()

  const appendKnowledgeBaseId = (value: unknown): void => {
    const knowledgeBaseId = normalizeKnowledgeBaseId(value)
    if (!knowledgeBaseId) {
      return
    }
    knowledgeBaseIds.add(knowledgeBaseId)
    selectedKnowledgeBaseIds.add(knowledgeBaseId)
  }

  const appendDocumentFileKey = (knowledgeBaseId: number, fileKey: unknown): void => {
    if (typeof fileKey !== 'string') {
      return
    }
    const normalizedFileKey = fileKey.trim()
    if (!normalizedFileKey) {
      return
    }

    knowledgeBaseIds.add(knowledgeBaseId)
    selectedKnowledgeBaseIds.add(knowledgeBaseId)
    const selectedFileKeys =
      selectedDocumentFileKeysByKnowledgeBase.get(knowledgeBaseId) ?? new Set<string>()
    selectedFileKeys.add(normalizedFileKey)
    selectedDocumentFileKeysByKnowledgeBase.set(knowledgeBaseId, selectedFileKeys)
  }

  appendKnowledgeBaseId(permissionTree.knowledgeBaseId)
  for (const item of permissionTree.knowledgeBaseIds || []) {
    appendKnowledgeBaseId(item)
  }

  const knowledgeBaseRules = [
    ...(permissionTree.knowledgeBases || []),
    ...(permissionTree.knowledge_base_rules || [])
  ]

  for (const rule of knowledgeBaseRules) {
    const knowledgeBaseId = normalizeKnowledgeBaseId(
      rule.knowledgeBaseId ?? rule.knowledge_base_id
    )
    if (!knowledgeBaseId) {
      continue
    }

    appendKnowledgeBaseId(knowledgeBaseId)
    const documentRules = Array.isArray(rule.documents) ? rule.documents : []
    if (documentRules.length === 0 && rule.effect !== 'deny') {
      continue
    }

    for (const documentRule of documentRules) {
      appendDocumentFileKey(knowledgeBaseId, documentRule.fileKey)
    }
  }

  const rootKnowledgeBaseId = normalizeKnowledgeBaseId(permissionTree.knowledgeBaseId)
  if (rootKnowledgeBaseId) {
    for (const documentRule of permissionTree.documents || []) {
      appendDocumentFileKey(rootKnowledgeBaseId, documentRule.fileKey)
    }
  }

  const walkLegacyTree = (
    nodes: OFKnowledgePermissionTree['providers'],
    currentKnowledgeBaseId?: number
  ): void => {
    for (const node of nodes || []) {
      const nodeKnowledgeBaseId =
        normalizeKnowledgeBaseId(node.knowledgeBaseId ?? node.knowledge_base_id) ??
        currentKnowledgeBaseId

      if ((node.kind === 'knowledge-base' || node.kind === 'scope') && nodeKnowledgeBaseId) {
        knowledgeBaseIds.add(nodeKnowledgeBaseId)
        selectedKnowledgeBaseIds.add(nodeKnowledgeBaseId)
      }

      if (node.kind === 'file' && node.checked !== false && nodeKnowledgeBaseId) {
        const fileKey =
          typeof node.fileKey === 'string'
            ? node.fileKey
            : typeof node.file_key === 'string'
              ? node.file_key
              : typeof node.id === 'string'
                ? node.id
                : null
        if (fileKey) {
          appendDocumentFileKey(nodeKnowledgeBaseId, fileKey)
        }
      }

      if (Array.isArray(node.children) && node.children.length > 0) {
        walkLegacyTree(node.children, nodeKnowledgeBaseId)
      }
    }
  }

  walkLegacyTree(permissionTree.providers || [])

  return normalizeKnowledgeRetrievalSelection({
    knowledgeBaseIds: [...knowledgeBaseIds],
    selectedKnowledgeBaseIds: [...selectedKnowledgeBaseIds],
    selectedDocumentFileKeysByKnowledgeBase: Object.fromEntries(
      [...selectedDocumentFileKeysByKnowledgeBase.entries()].map(([knowledgeBaseId, fileKeys]) => [
        knowledgeBaseId,
        [...fileKeys].sort()
      ])
    )
  })
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
  knowledge_base_ids: number[]
  selected_knowledge_base_ids: number[]
  selected_document_file_keys_by_knowledge_base: Record<number, string[]>
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
