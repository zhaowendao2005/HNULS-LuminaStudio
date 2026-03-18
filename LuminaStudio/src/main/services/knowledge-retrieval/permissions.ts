import type { DocumentInfo } from '@shared/knowledge-database-api.types'
import type {
  KnowledgeRetrievalDocumentEmbeddingContext,
  KnowledgeRetrievalPermissionEffect,
  KnowledgeRetrievalPermissionTree,
  KnowledgeRetrievalResolveScopesResultDto,
  KnowledgeRetrievalResolvedScopeDto,
  KnowledgeRetrievalWarningDto
} from './types'

/**
 * 只把已完成的 embedding 暴露给检索执行层。
 * failed / pending / running 都不应该进入实际检索范围。
 */
function collectCompletedEmbeddings(documents: DocumentInfo[]): {
  contexts: KnowledgeRetrievalDocumentEmbeddingContext[]
  warnings: KnowledgeRetrievalWarningDto[]
} {
  const contexts: KnowledgeRetrievalDocumentEmbeddingContext[] = []
  const warnings: KnowledgeRetrievalWarningDto[] = []

  for (const document of documents) {
    const completedEmbeddings = document.embeddings.filter(
      (embedding) => embedding.status === 'completed'
    )

    if (completedEmbeddings.length === 0) {
      warnings.push({
        code: 'DOCUMENT_HAS_NO_COMPLETED_EMBEDDINGS',
        message: `文档 ${document.fileKey} 没有可检索的 completed embeddings`,
        details: {
          fileKey: document.fileKey,
          fileName: document.fileName
        }
      })
      continue
    }

    for (const embedding of completedEmbeddings) {
      contexts.push({
        fileKey: document.fileKey,
        fileName: document.fileName,
        embedding
      })
    }
  }

  return { contexts, warnings }
}

function resolveEffect(
  current: KnowledgeRetrievalPermissionEffect | undefined,
  parent: Exclude<KnowledgeRetrievalPermissionEffect, 'inherit'>
): Exclude<KnowledgeRetrievalPermissionEffect, 'inherit'> {
  if (!current || current === 'inherit') {
    return parent
  }

  return current
}

function buildTableName(embeddingConfigId: string, dimensions: number): string {
  return `emb_cfg_${embeddingConfigId}_${dimensions}_chunks`
}

/**
 * 解析权限树并展开出最终可检索 scope。
 *
 * 规则落实：
 * 1. KB allow 且无文档子规则 => 全展开。
 * 2. 文档 allow 且无 embedding 子规则 => 文档下 embedding 全展开。
 * 3. embedding allow => 仅该 embedding。
 * 4. deny 覆盖同级默认。
 * 5. inherit 回退父级。
 * 6. 最深显式优先（通过逐层求值实现）。
 */
export function resolveKnowledgeRetrievalScopes(params: {
  knowledgeBaseId: number
  documents: DocumentInfo[]
  permissionTree?: KnowledgeRetrievalPermissionTree | null
}): KnowledgeRetrievalResolveScopesResultDto {
  const permissionTree = params.permissionTree ?? undefined
  const baseEffect = resolveEffect(permissionTree?.effect, 'deny')
  const documentRules = new Map(
    (permissionTree?.documents ?? []).map((document) => [document.fileKey, document])
  )

  const { contexts, warnings } = collectCompletedEmbeddings(params.documents)
  const matchedDocumentKeys = new Set<string>()
  const matchedEmbeddingKeys = new Set<string>()
  const resolvedScopes: KnowledgeRetrievalResolvedScopeDto[] = []

  for (const context of contexts) {
    const documentRule = documentRules.get(context.fileKey)
    const documentEffect = resolveEffect(documentRule?.effect, baseEffect)
    const embeddingRules = new Map(
      (documentRule?.embeddings ?? []).map((embedding) => [
        `${embedding.embeddingConfigId}::${embedding.dimensions}`,
        embedding
      ])
    )
    const embeddingRuleKey = `${context.embedding.embeddingConfigId}::${context.embedding.dimensions}`
    const embeddingRule = embeddingRules.get(embeddingRuleKey)
    const embeddingEffect = resolveEffect(embeddingRule?.effect, documentEffect)

    if (documentRule) {
      matchedDocumentKeys.add(context.fileKey)
    }
    if (embeddingRule) {
      matchedEmbeddingKeys.add(`${context.fileKey}::${embeddingRuleKey}`)
    }

    if (embeddingEffect !== 'allow') {
      continue
    }

    resolvedScopes.push({
      knowledgeBaseId: params.knowledgeBaseId,
      fileKey: context.fileKey,
      fileName: context.fileName,
      embeddingConfigId: context.embedding.embeddingConfigId,
      dimensions: context.embedding.dimensions,
      tableName: buildTableName(context.embedding.embeddingConfigId, context.embedding.dimensions),
      chunkCount: context.embedding.chunkCount
    })
  }

  for (const [fileKey, documentRule] of documentRules) {
    if (!matchedDocumentKeys.has(fileKey)) {
      warnings.push({
        code: 'DOCUMENT_RULE_TARGET_NOT_FOUND',
        message: `权限树中的文档规则未命中知识库文档: ${fileKey}`,
        details: { fileKey }
      })
    }

    for (const embeddingRule of documentRule.embeddings ?? []) {
      const embeddingRuleKey = `${fileKey}::${embeddingRule.embeddingConfigId}::${embeddingRule.dimensions}`
      if (!matchedEmbeddingKeys.has(embeddingRuleKey)) {
        warnings.push({
          code: 'EMBEDDING_RULE_TARGET_NOT_FOUND',
          message: `权限树中的 embedding 规则未命中文档 embedding: ${fileKey} / ${embeddingRule.embeddingConfigId} / ${embeddingRule.dimensions}`,
          details: {
            fileKey,
            embeddingConfigId: embeddingRule.embeddingConfigId,
            dimensions: embeddingRule.dimensions
          }
        })
      }
    }
  }

  resolvedScopes.sort((left, right) => {
    if (left.fileKey !== right.fileKey) {
      return left.fileKey.localeCompare(right.fileKey)
    }
    if (left.embeddingConfigId !== right.embeddingConfigId) {
      return left.embeddingConfigId.localeCompare(right.embeddingConfigId)
    }
    return left.dimensions - right.dimensions
  })

  return {
    knowledgeBaseId: params.knowledgeBaseId,
    resolvedScopes,
    warnings
  }
}
