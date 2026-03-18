import type { OFNodeEditorNormalizeParams } from '../../node-definition'
import type { OFNode, OFNodeOutput } from '../../core-types'
import { buildOFCommonNodeShape, resolveOFNodeOutputNamespace } from '../../node-definition'
import type {
  PaperRetrievalNodeConfigDTO,
  PaperRetrievalPromptItem
} from '../../../paper-retrieval.types'
import {
  PAPER_RETRIEVAL_BLOCK_TYPE,
  PAPER_RETRIEVAL_DEFAULT_NAMESPACE,
  paperRetrievalNodeRuntimeDefinition
} from './runtime'

export type PaperRetrievalNodeData = OFNode['data'] &
  PaperRetrievalNodeConfigDTO & {
    type: typeof PAPER_RETRIEVAL_BLOCK_TYPE
    output_namespace: string
    output: OFNodeOutput
  }

function normalizeTitle(raw: string | undefined): string {
  const value = String(raw || '').trim()
  return value || 'paper-retrieval'
}

function createDefaultConfig(): PaperRetrievalNodeConfigDTO {
  return {
    query_template: [],
    provider_id: 'pubmed',
    api_key_ref_id: null,
    top_k: 5,
    sort_by: 'relevance',
    date_from: null,
    date_to: null,
    provider_options: {}
  }
}

function normalizePromptItems(input: unknown): PaperRetrievalPromptItem[] {
  if (!Array.isArray(input)) {
    return []
  }

  return input
    .filter((item): item is Partial<PaperRetrievalPromptItem> =>
      Boolean(item && typeof item === 'object')
    )
    .map((item, index) => ({
      id: item.id?.trim() || `paper_prompt_${index + 1}`,
      role:
        item.role === 'system' || item.role === 'assistant' || item.role === 'user'
          ? item.role
          : 'user',
      text: String(item.text || '')
    }))
}

export const paperRetrievalNodeEditor = {
  createDefaultData({ nodeId, title }: { nodeId: string; title: string }): PaperRetrievalNodeData {
    const outputNamespace =
      resolveOFNodeOutputNamespace(
        { runtime: paperRetrievalNodeRuntimeDefinition },
        {
          nodeId,
          fallback: PAPER_RETRIEVAL_DEFAULT_NAMESPACE
        }
      ) || PAPER_RETRIEVAL_DEFAULT_NAMESPACE

    return {
      ...buildOFCommonNodeShape({}, normalizeTitle(title)),
      ...createDefaultConfig(),
      type: PAPER_RETRIEVAL_BLOCK_TYPE,
      output_namespace: outputNamespace,
      output: {
        variables:
          paperRetrievalNodeRuntimeDefinition.buildRuntimeOutputVariables?.({
            title: outputNamespace,
            nodeId
          }) || []
      }
    }
  },
  normalizeData({ node }: OFNodeEditorNormalizeParams): PaperRetrievalNodeData {
    const data = node.data as Partial<PaperRetrievalNodeData>
    const title = normalizeTitle(data.title)
    const outputNamespace =
      resolveOFNodeOutputNamespace(
        { runtime: paperRetrievalNodeRuntimeDefinition },
        {
          current: data.output_namespace,
          nodeId: node.id,
          title,
          fallback: PAPER_RETRIEVAL_DEFAULT_NAMESPACE
        }
      ) || PAPER_RETRIEVAL_DEFAULT_NAMESPACE

    return {
      ...buildOFCommonNodeShape(data, title),
      ...createDefaultConfig(),
      ...data,
      type: PAPER_RETRIEVAL_BLOCK_TYPE,
      query_template: normalizePromptItems(data.query_template),
      provider_id:
        typeof data.provider_id === 'string' && data.provider_id.trim()
          ? data.provider_id.trim()
          : 'pubmed',
      api_key_ref_id:
        typeof data.api_key_ref_id === 'string' && data.api_key_ref_id.trim()
          ? data.api_key_ref_id.trim()
          : null,
      top_k: typeof data.top_k === 'number' && data.top_k > 0 ? Math.floor(data.top_k) : 5,
      sort_by:
        data.sort_by === 'date_desc' || data.sort_by === 'date_asc' || data.sort_by === 'relevance'
          ? data.sort_by
          : 'relevance',
      date_from:
        typeof data.date_from === 'string' && data.date_from.trim() ? data.date_from.trim() : null,
      date_to: typeof data.date_to === 'string' && data.date_to.trim() ? data.date_to.trim() : null,
      provider_options:
        data.provider_options && typeof data.provider_options === 'object'
          ? data.provider_options
          : {},
      output_namespace: outputNamespace,
      output: {
        variables:
          paperRetrievalNodeRuntimeDefinition.buildRuntimeOutputVariables?.({
            title: outputNamespace,
            nodeId: node.id
          }) || []
      }
    }
  }
}
