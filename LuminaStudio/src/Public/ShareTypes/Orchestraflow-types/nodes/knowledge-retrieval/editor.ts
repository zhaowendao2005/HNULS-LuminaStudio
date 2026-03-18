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

function normalizePermissionTree(input: unknown): OFKnowledgePermissionTree {
  if (!input || typeof input !== 'object') {
    return createEmptyPermissionTree()
  }

  const candidate = input as OFKnowledgePermissionTree
  return {
    ...candidate,
    providers: Array.isArray(candidate.providers) ? candidate.providers : [],
    knowledgeBaseId:
      typeof candidate.knowledgeBaseId === 'number' && Number.isInteger(candidate.knowledgeBaseId)
        ? candidate.knowledgeBaseId
        : null
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
      permission_tree: normalizePermissionTree(data.permission_tree),
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
