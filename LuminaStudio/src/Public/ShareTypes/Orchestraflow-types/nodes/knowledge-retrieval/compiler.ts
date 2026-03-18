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
      knowledgeBaseId: null
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
      knowledgeBaseId: null
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
    effect:
      documents.length > 0 || typeof firstScopeWithKnowledgeBaseId?.knowledge_base_id === 'number'
        ? 'allow'
        : undefined,
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
    const config = (node.config || {}) as Partial<KnowledgeRetrievalNodeConfigDTO>
    const legacyScopes = Array.isArray((node.config as { scopes?: unknown } | undefined)?.scopes)
      ? ((node.config as { scopes?: KnowledgeRetrievalScopeInput[] }).scopes ?? [])
      : []
    const mergedConfig = {
      ...createDefaultConfig(),
      ...config,
      query_template: Array.isArray(config.query_template) ? config.query_template : [],
      permission_tree:
        config.permission_tree && typeof config.permission_tree === 'object'
          ? config.permission_tree
          : buildPermissionTreeFromScopes(legacyScopes)
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
