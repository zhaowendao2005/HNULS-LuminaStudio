import type { OFNodeEditorNormalizeParams } from '../../node-definition'
import type { OFNode, OFNodeOutput } from '../../core-types'
import { buildOFCommonNodeShape, resolveOFNodeOutputNamespace } from '../../node-definition'
import type {
  KnowledgeRetrievalNodeConfigDTO,
  KnowledgeRetrievalPromptItem,
  OFKnowledgePermissionTree
} from '../../../knowledge-retrieval.types'
import {
  KNOWLEDGE_RETRIEVAL_BLOCK_TYPE,
  KNOWLEDGE_RETRIEVAL_DEFAULT_NAMESPACE,
  knowledgeRetrievalNodeRuntimeDefinition
} from './runtime'

export type KnowledgeRetrievalNodeData = OFNode['data'] &
  KnowledgeRetrievalNodeConfigDTO & {
    type: typeof KNOWLEDGE_RETRIEVAL_BLOCK_TYPE
    output_namespace: string
    output: OFNodeOutput
  }

function normalizeTitle(raw: string | undefined): string {
  const value = String(raw || '').trim()
  return value || 'knowledge-retrieval'
}

function createEmptyPermissionTree(): OFKnowledgePermissionTree {
  return {
    providers: [],
    knowledgeBaseId: null,
    effect: 'allow'
  }
}

function createDefaultConfig(): KnowledgeRetrievalNodeConfigDTO {
  return {
    query_template: [],
    permission_tree: createEmptyPermissionTree(),
    top_k: 5,
    ef: null,
    rerank_enabled: false,
    rerank_model_id: null,
    rerank_top_n: 3
  }
}

function normalizePromptItems(input: unknown): KnowledgeRetrievalPromptItem[] {
  if (!Array.isArray(input)) {
    return []
  }

  return input
    .filter((item): item is Partial<KnowledgeRetrievalPromptItem> =>
      Boolean(item && typeof item === 'object')
    )
    .map((item, index) => ({
      id: item.id?.trim() || `knowledge_prompt_${index + 1}`,
      role:
        item.role === 'system' || item.role === 'assistant' || item.role === 'user'
          ? item.role
          : 'user',
      text: String(item.text || '')
    }))
}

function normalizeEffect(input: unknown): 'allow' | 'deny' | 'inherit' | undefined {
  if (input === 'allow' || input === 'deny' || input === 'inherit') {
    return input
  }
  return undefined
}

function normalizePositiveInteger(input: unknown): number | null {
  if (typeof input !== 'number' || !Number.isInteger(input) || input <= 0) {
    return null
  }
  return input
}

function normalizeOptionalString(input: unknown): string | null {
  if (typeof input !== 'string') {
    return null
  }
  const value = input.trim()
  return value || null
}

function normalizeProviderNodes(input: unknown): OFKnowledgePermissionTree['providers'] {
  if (!Array.isArray(input)) {
    return []
  }

  return input
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, index) => {
      // 兼容策略：providers 是 editor 展示结构，保留可识别字段，无法识别时兜底为最小合法节点，避免旧数据导致面板崩溃。
      const id = normalizeOptionalString(item.id) || `provider_${index + 1}`
      const label = normalizeOptionalString(item.label) || id
      const kindRaw = normalizeOptionalString(item.kind)
      const kind =
        kindRaw === 'provider' ||
        kindRaw === 'knowledge-base' ||
        kindRaw === 'scope' ||
        kindRaw === 'file'
          ? kindRaw
          : 'provider'
      const children = normalizeProviderNodes(item.children)

      return {
        id,
        label,
        kind,
        checked: Boolean(item.checked),
        disabled: Boolean(item.disabled),
        description: normalizeOptionalString(item.description) || undefined,
        children: children.length > 0 ? children : undefined
      }
    })
}

function normalizeEmbeddingRules(
  input: unknown
): NonNullable<OFKnowledgePermissionTree['documents']>[number]['embeddings'] {
  if (!Array.isArray(input)) {
    return undefined
  }

  const normalized = input
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => {
      const embeddingConfigId =
        normalizeOptionalString(item.embeddingConfigId) ||
        normalizeOptionalString(item.embedding_config_id)
      const dimensions = normalizePositiveInteger(item.dimensions)
      if (!embeddingConfigId || !dimensions) {
        return null
      }
      return {
        embeddingConfigId,
        dimensions,
        effect: normalizeEffect(item.effect)
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))

  return normalized.length > 0 ? normalized : undefined
}

function normalizeDocumentRules(
  input: unknown
): NonNullable<OFKnowledgePermissionTree['documents']> {
  if (!Array.isArray(input)) {
    return []
  }

  return input
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => {
      const fileKey =
        normalizeOptionalString(item.fileKey) || normalizeOptionalString(item.file_key)
      if (!fileKey) {
        return null
      }
      return {
        fileKey,
        effect: normalizeEffect(item.effect),
        embeddings: normalizeEmbeddingRules(item.embeddings)
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
}

function normalizeLegacyScopes(input: unknown): {
  knowledgeBaseId: number | null
  documents: OFKnowledgePermissionTree['documents']
} {
  if (!Array.isArray(input)) {
    return { knowledgeBaseId: null, documents: [] }
  }

  const scopes = input.filter((item): item is Record<string, unknown> =>
    Boolean(item && typeof item === 'object')
  )
  const firstKnowledgeBaseId = scopes.find((scope) =>
    normalizePositiveInteger(scope.knowledge_base_id)
  )
  const documents = scopes.flatMap((scope) => {
    const fileKeysSource = Array.isArray(scope.file_keys)
      ? scope.file_keys
      : Array.isArray(scope.fileKeys)
        ? scope.fileKeys
        : []
    return fileKeysSource
      .map((fileKey) => normalizeOptionalString(fileKey))
      .filter((fileKey): fileKey is string => Boolean(fileKey))
      .map((fileKey) => ({
        fileKey,
        effect: 'allow' as const
      }))
  })

  return {
    knowledgeBaseId: normalizePositiveInteger(firstKnowledgeBaseId?.knowledge_base_id) ?? null,
    documents
  }
}

function normalizePermissionTree(input: unknown): OFKnowledgePermissionTree {
  // 兼容策略：统一接住新结构（documents/effect）与旧结构（scopes、snake_case 字段），
  // 保证旧 workflow 打开时至少能被安全归一化，不会因字段升级直接失败。
  if (!input || typeof input !== 'object') {
    return createEmptyPermissionTree()
  }

  const candidate = input as Record<string, unknown>
  const providers = normalizeProviderNodes(candidate.providers)
  const documentsFromTree = normalizeDocumentRules(candidate.documents)
  const legacyFromTree = normalizeLegacyScopes(candidate.scopes)
  const documents =
    documentsFromTree.length > 0 ? documentsFromTree : (legacyFromTree.documents ?? [])
  const knowledgeBaseId =
    normalizePositiveInteger(candidate.knowledgeBaseId) ??
    normalizePositiveInteger(candidate.knowledge_base_id) ??
    legacyFromTree.knowledgeBaseId
  const effect = normalizeEffect(candidate.effect) || 'allow'

  return {
    providers,
    knowledgeBaseId,
    effect,
    documents
  }
}

export const knowledgeRetrievalNodeEditor = {
  createDefaultData({
    nodeId,
    title
  }: {
    nodeId: string
    title: string
  }): KnowledgeRetrievalNodeData {
    const outputNamespace =
      resolveOFNodeOutputNamespace(
        { runtime: knowledgeRetrievalNodeRuntimeDefinition },
        {
          nodeId,
          fallback: KNOWLEDGE_RETRIEVAL_DEFAULT_NAMESPACE
        }
      ) || KNOWLEDGE_RETRIEVAL_DEFAULT_NAMESPACE

    return {
      ...buildOFCommonNodeShape({}, normalizeTitle(title)),
      ...createDefaultConfig(),
      type: KNOWLEDGE_RETRIEVAL_BLOCK_TYPE,
      output_namespace: outputNamespace,
      output: {
        variables:
          knowledgeRetrievalNodeRuntimeDefinition.buildRuntimeOutputVariables?.({
            title: outputNamespace,
            nodeId
          }) || []
      }
    }
  },
  normalizeData({ node }: OFNodeEditorNormalizeParams): KnowledgeRetrievalNodeData {
    const data = node.data as Partial<KnowledgeRetrievalNodeData>
    const title = normalizeTitle(data.title)
    const outputNamespace =
      resolveOFNodeOutputNamespace(
        { runtime: knowledgeRetrievalNodeRuntimeDefinition },
        {
          current: data.output_namespace,
          nodeId: node.id,
          title,
          fallback: KNOWLEDGE_RETRIEVAL_DEFAULT_NAMESPACE
        }
      ) || KNOWLEDGE_RETRIEVAL_DEFAULT_NAMESPACE

    return {
      ...buildOFCommonNodeShape(data, title),
      ...createDefaultConfig(),
      ...data,
      type: KNOWLEDGE_RETRIEVAL_BLOCK_TYPE,
      query_template: normalizePromptItems(data.query_template),
      permission_tree: normalizePermissionTree(
        data.permission_tree ||
          ((data as unknown as { scopes?: unknown }).scopes
            ? { scopes: (data as unknown as { scopes?: unknown }).scopes }
            : undefined)
      ),
      top_k: typeof data.top_k === 'number' && data.top_k > 0 ? Math.floor(data.top_k) : 5,
      ef:
        typeof data.ef === 'number' && Number.isFinite(data.ef) && data.ef > 0
          ? Math.floor(data.ef)
          : null,
      rerank_enabled: Boolean(data.rerank_enabled),
      rerank_model_id:
        typeof data.rerank_model_id === 'string' && data.rerank_model_id.trim()
          ? data.rerank_model_id.trim()
          : null,
      rerank_top_n:
        typeof data.rerank_top_n === 'number' &&
        Number.isFinite(data.rerank_top_n) &&
        data.rerank_top_n > 0
          ? Math.floor(data.rerank_top_n)
          : null,
      output_namespace: outputNamespace,
      output: {
        variables:
          knowledgeRetrievalNodeRuntimeDefinition.buildRuntimeOutputVariables?.({
            title: outputNamespace,
            nodeId: node.id
          }) || []
      }
    }
  }
}
