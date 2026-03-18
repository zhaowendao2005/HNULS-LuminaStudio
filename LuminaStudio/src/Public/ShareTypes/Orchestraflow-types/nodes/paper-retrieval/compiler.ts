import type { OFNodeCompilerParams } from '../../node-definition'
import type { PaperRetrievalNodeConfigDTO } from '../../../paper-retrieval.types'
import type { PaperRetrievalNodeData } from './editor'
import {
  PAPER_RETRIEVAL_BLOCK_TYPE,
  PAPER_RETRIEVAL_DEFAULT_NAMESPACE,
  paperRetrievalNodeRuntimeDefinition
} from './runtime'
import { resolveOFNodeOutputNamespace } from '../../node-definition'

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

function normalizeYearBoundary(value: unknown, boundary: 'start' | 'end'): string | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return null
  }

  return boundary === 'start' ? `${value}-01-01` : `${value}-12-31`
}

export const paperRetrievalNodeCompiler = {
  compileData({
    node,
    compiledId,
    title,
    desc,
    helpers
  }: OFNodeCompilerParams): PaperRetrievalNodeData {
    const config = (node.config || {}) as Partial<PaperRetrievalNodeConfigDTO>
    const legacyConfig = (node.config || {}) as {
      query?: unknown
      provider?: unknown
      limit?: unknown
      author?: unknown
      year_from?: unknown
      year_to?: unknown
    }
    const mergedConfig = {
      ...createDefaultConfig(),
      ...config,
      query_template: Array.isArray(config.query_template) ? config.query_template : []
    }
    const compiledQuery = helpers.compileTemplateValue(
      mergedConfig.query_template.map((item) => item.text).join('\n') ||
        String(legacyConfig.query || '')
    )
    const outputNamespace =
      resolveOFNodeOutputNamespace(
        { runtime: paperRetrievalNodeRuntimeDefinition },
        {
          nodeId: compiledId,
          title,
          fallback: PAPER_RETRIEVAL_DEFAULT_NAMESPACE
        }
      ) || PAPER_RETRIEVAL_DEFAULT_NAMESPACE

    return {
      title,
      desc,
      type: PAPER_RETRIEVAL_BLOCK_TYPE,
      output_namespace: outputNamespace,
      query_template: compiledQuery
        ? [
            {
              id: `paper_prompt_${compiledId}`,
              role: 'user',
              text: String(compiledQuery)
            }
          ]
        : [],
      provider_id:
        (typeof mergedConfig.provider_id === 'string' && mergedConfig.provider_id) ||
        (typeof legacyConfig.provider === 'string' && legacyConfig.provider) ||
        'pubmed',
      api_key_ref_id: mergedConfig.api_key_ref_id,
      top_k:
        typeof mergedConfig.top_k === 'number' && mergedConfig.top_k > 0
          ? mergedConfig.top_k
          : typeof legacyConfig.limit === 'number' && legacyConfig.limit > 0
            ? legacyConfig.limit
            : 5,
      sort_by: mergedConfig.sort_by,
      date_from: mergedConfig.date_from ?? normalizeYearBoundary(legacyConfig.year_from, 'start'),
      date_to: mergedConfig.date_to ?? normalizeYearBoundary(legacyConfig.year_to, 'end'),
      provider_options: {
        ...mergedConfig.provider_options,
        ...(typeof legacyConfig.author === 'string' && legacyConfig.author.trim()
          ? { author: legacyConfig.author.trim() }
          : {})
      },
      output: {
        variables:
          paperRetrievalNodeRuntimeDefinition.buildRuntimeOutputVariables?.({
            title: outputNamespace,
            nodeId: compiledId
          }) || []
      }
    }
  }
}
