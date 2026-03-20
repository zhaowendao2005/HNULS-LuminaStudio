import type { OFNodeCompilerParams } from '../../node-definition'
import type {
  KnowledgeRetrievalNodeConfigDTO,
  KnowledgeRetrievalScopeInput,
  OFKnowledgePermissionTree
} from '../../../knowledge-retrieval.types'
import type { KnowledgeRetrievalNodeData } from './editor'
import {
  KNOWLEDGE_RETRIEVAL_BLOCK_TYPE,
  KNOWLEDGE_RETRIEVAL_DEFAULT_NAMESPACE,
  knowledgeRetrievalNodeRuntimeDefinition
} from './runtime'
import { resolveOFNodeOutputNamespace } from '../../node-definition'

function createDefaultConfig(): KnowledgeRetrievalNodeConfigDTO {
  return {
    query_template: [],
    permission_tree: {
      providers: [],
      knowledgeBaseId: null,
      effect: 'allow',
      documents: []
    },
    top_k: 5,
    ef: null,
    rerank_enabled: false,
    rerank_model_id: null,
    rerank_top_n: 3
  }
}

function buildPermissionTreeFromScopes(
  scopes: KnowledgeRetrievalScopeInput[]
): OFKnowledgePermissionTree {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return {
      providers: [],
      knowledgeBaseId: null,
      effect: 'allow',
      documents: []
    }
  }

  const firstScopeWithKnowledgeBaseId = scopes.find(
    (scope) =>
      typeof scope.knowledge_base_id === 'number' &&
      Number.isInteger(scope.knowledge_base_id) &&
      scope.knowledge_base_id > 0
  )

  const documents = scopes.flatMap((scope) => {
    const fileKeys = Array.isArray(scope.file_keys) ? scope.file_keys.filter(Boolean) : []
    return fileKeys.map((fileKey) => ({
      fileKey,
      effect: 'allow' as const
    }))
  })

  return {
    providers: [],
    knowledgeBaseId: firstScopeWithKnowledgeBaseId?.knowledge_base_id ?? null,
    effect: 'allow',
    documents
  }
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

function normalizePromptItems(input: unknown): KnowledgeRetrievalNodeConfigDTO['query_template'] {
  if (!Array.isArray(input)) {
    return []
  }

  return input
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, index) => ({
      id: normalizeOptionalString(item.id) || `knowledge_prompt_${index + 1}`,
      role:
        item.role === 'system' || item.role === 'assistant' || item.role === 'user'
          ? item.role
          : 'user',
      text: String(item.text || '')
    }))
}

function normalizeProviderNodes(input: unknown): OFKnowledgePermissionTree['providers'] {
  if (!Array.isArray(input)) {
    return []
  }

  return input
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, index) => {
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

function normalizePermissionTree(
  input: unknown,
  legacyScopes: KnowledgeRetrievalScopeInput[]
): OFKnowledgePermissionTree {
  const scopeFallback = buildPermissionTreeFromScopes(legacyScopes)
  if (!input || typeof input !== 'object') {
    return scopeFallback
  }

  const candidate = input as Record<string, unknown>
  const normalizedFromDocuments = normalizeDocumentRules(candidate.documents)
  const normalizedFromScopeField = buildPermissionTreeFromScopes(
    Array.isArray(candidate.scopes) ? (candidate.scopes as KnowledgeRetrievalScopeInput[]) : []
  )
  const documents =
    normalizedFromDocuments.length > 0
      ? normalizedFromDocuments
      : (normalizedFromScopeField.documents ?? scopeFallback.documents ?? [])
  const knowledgeBaseId =
    normalizePositiveInteger(candidate.knowledgeBaseId) ??
    normalizePositiveInteger(candidate.knowledge_base_id) ??
    normalizedFromScopeField.knowledgeBaseId ??
    scopeFallback.knowledgeBaseId

  // 兼容策略：历史数据里经常缺失 effect，默认回退为 allow，避免结构升级后老工作流被默认 deny。
  return {
    providers: normalizeProviderNodes(candidate.providers),
    knowledgeBaseId,
    effect: normalizeEffect(candidate.effect) || 'allow',
    documents
  }
}

export const knowledgeRetrievalNodeCompiler = {
  compileData({
    node,
    compiledId,
    title,
    desc,
    helpers
  }: OFNodeCompilerParams): KnowledgeRetrievalNodeData {
    const defaultConfig = createDefaultConfig()
    const config = (node.config || {}) as Partial<KnowledgeRetrievalNodeConfigDTO>
    const legacyScopes = Array.isArray((node.config as { scopes?: unknown } | undefined)?.scopes)
      ? ((node.config as { scopes?: KnowledgeRetrievalScopeInput[] }).scopes ?? [])
      : []
    const mergedConfig = {
      ...defaultConfig,
      ...config,
      query_template: normalizePromptItems(config.query_template),
      permission_tree: normalizePermissionTree(config.permission_tree, legacyScopes),
      top_k:
        typeof config.top_k === 'number' && Number.isFinite(config.top_k) && config.top_k > 0
          ? Math.floor(config.top_k)
          : defaultConfig.top_k,
      ef:
        typeof config.ef === 'number' && Number.isFinite(config.ef) && config.ef > 0
          ? Math.floor(config.ef)
          : defaultConfig.ef,
      rerank_enabled: Boolean(config.rerank_enabled),
      rerank_model_id:
        typeof config.rerank_model_id === 'string' && config.rerank_model_id.trim()
          ? config.rerank_model_id.trim()
          : defaultConfig.rerank_model_id,
      rerank_top_n:
        typeof config.rerank_top_n === 'number' &&
        Number.isFinite(config.rerank_top_n) &&
        config.rerank_top_n > 0
          ? Math.floor(config.rerank_top_n)
          : defaultConfig.rerank_top_n
    }
    const compiledQuery = helpers.compileTemplateValue(
      mergedConfig.query_template.map((item) => item.text).join('\n')
    )
    const outputNamespace =
      resolveOFNodeOutputNamespace(
        { runtime: knowledgeRetrievalNodeRuntimeDefinition },
        {
          nodeId: compiledId,
          title,
          fallback: KNOWLEDGE_RETRIEVAL_DEFAULT_NAMESPACE
        }
      ) || KNOWLEDGE_RETRIEVAL_DEFAULT_NAMESPACE

    return {
      title,
      desc,
      type: KNOWLEDGE_RETRIEVAL_BLOCK_TYPE,
      output_namespace: outputNamespace,
      query_template: compiledQuery
        ? [
            {
              id: `knowledge_prompt_${compiledId}`,
              role: 'user',
              text: String(compiledQuery)
            }
          ]
        : [],
      permission_tree: mergedConfig.permission_tree,
      top_k: mergedConfig.top_k,
      ef: mergedConfig.ef,
      rerank_enabled: mergedConfig.rerank_enabled,
      rerank_model_id: mergedConfig.rerank_model_id,
      rerank_top_n: mergedConfig.rerank_top_n,
      output: {
        variables:
          knowledgeRetrievalNodeRuntimeDefinition.buildRuntimeOutputVariables?.({
            title: outputNamespace,
            nodeId: compiledId
          }) || []
      }
    }
  }
}
