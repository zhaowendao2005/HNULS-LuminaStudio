import type { OFNodeCompilerParams } from '../../node-definition'
import type {
  KnowledgeRetrievalNodeConfigDTO,
  KnowledgeRetrievalScopeInput,
  OFKnowledgePermissionTree
} from '../../../knowledge-retrieval.types'
import {
  buildKnowledgeRetrievalSelectionFromPermissionTree,
  normalizeKnowledgeRetrievalSelection,
  type OFKnowledgeRetrievalSelectionState
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
    knowledge_base_ids: [],
    selected_knowledge_base_ids: [],
    selected_document_file_keys_by_knowledge_base: {},
    top_k: 5,
    ef: null,
    rerank_enabled: false,
    rerank_model_id: null,
    // 中文注释：默认值和 editor 保持一致，避免编译阶段重新引入非法的 topN < k 组合。
    rerank_top_n: 5
  }
}

function resolveSelectionState(
  config: Partial<KnowledgeRetrievalNodeConfigDTO>,
  permissionTree: OFKnowledgePermissionTree,
  legacyScopes: KnowledgeRetrievalScopeInput[]
): OFKnowledgeRetrievalSelectionState {
  const explicitSelection = normalizeKnowledgeRetrievalSelection({
    knowledgeBaseIds: config.knowledge_base_ids,
    selectedKnowledgeBaseIds: config.selected_knowledge_base_ids,
    selectedDocumentFileKeysByKnowledgeBase:
      config.selected_document_file_keys_by_knowledge_base
  })

  if (
    explicitSelection.knowledgeBaseIds.length > 0 ||
    explicitSelection.selectedKnowledgeBaseIds.length > 0 ||
    Object.keys(explicitSelection.selectedDocumentFileKeysByKnowledgeBase).length > 0
  ) {
    return explicitSelection
  }

  const legacySelection = buildKnowledgeRetrievalSelectionFromPermissionTree(permissionTree)
  if (
    legacySelection.knowledgeBaseIds.length > 0 ||
    legacySelection.selectedKnowledgeBaseIds.length > 0 ||
    Object.keys(legacySelection.selectedDocumentFileKeysByKnowledgeBase).length > 0
  ) {
    return legacySelection
  }

  return normalizeKnowledgeRetrievalSelection({
    knowledgeBaseIds: legacyScopes
      .map((scope) => scope.knowledge_base_id)
      .filter((value): value is number => typeof value === 'number' && Number.isInteger(value)),
    selectedKnowledgeBaseIds: legacyScopes
      .map((scope) => scope.knowledge_base_id)
      .filter((value): value is number => typeof value === 'number' && Number.isInteger(value)),
    selectedDocumentFileKeysByKnowledgeBase: legacyScopes.reduce<
      Record<number, string[]>
    >((accumulator, scope) => {
      if (
        typeof scope.knowledge_base_id !== 'number' ||
        !Number.isInteger(scope.knowledge_base_id) ||
        scope.knowledge_base_id <= 0
      ) {
        return accumulator
      }

      const fileKeys = Array.isArray(scope.file_keys) ? scope.file_keys.filter(Boolean) : []
      if (fileKeys.length > 0) {
        accumulator[scope.knowledge_base_id] = fileKeys as string[]
      }
      return accumulator
    }, {})
  })
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
    const normalizedTopK =
      typeof config.top_k === 'number' && Number.isFinite(config.top_k) && config.top_k > 0
        ? Math.floor(config.top_k)
        : defaultConfig.top_k
    const normalizedEf =
      typeof config.ef === 'number' && Number.isFinite(config.ef) && config.ef > 0
        ? Math.floor(config.ef)
        : defaultConfig.ef
    const permissionTree = normalizePermissionTree(config.permission_tree, legacyScopes)
    const selectionState = resolveSelectionState(config, permissionTree, legacyScopes)
    const mergedConfig = {
      ...defaultConfig,
      ...config,
      query_template: normalizePromptItems(config.query_template),
      permission_tree: permissionTree,
      knowledge_base_ids: selectionState.knowledgeBaseIds,
      selected_knowledge_base_ids: selectionState.selectedKnowledgeBaseIds,
      selected_document_file_keys_by_knowledge_base:
        selectionState.selectedDocumentFileKeysByKnowledgeBase,
      top_k: normalizedTopK,
      ef: normalizedEf,
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
      knowledge_base_ids: mergedConfig.knowledge_base_ids,
      selected_knowledge_base_ids: mergedConfig.selected_knowledge_base_ids,
      selected_document_file_keys_by_knowledge_base:
        mergedConfig.selected_document_file_keys_by_knowledge_base,
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
