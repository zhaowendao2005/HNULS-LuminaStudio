import type { DocumentInfo } from '@shared/knowledge-database-api.types'
import type {
  KnowledgeRetrievalDocumentRule,
  KnowledgeRetrievalDocumentEmbeddingContext,
  KnowledgeRetrievalLegacyPermissionTreeNode,
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

function normalizePositiveInteger(value: unknown): number | null {
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

function normalizeFileKey(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const normalized = value.trim()
  return normalized ? normalized : null
}

function extractKnowledgeBaseId(value: unknown): number | null {
  const direct = normalizePositiveInteger(value)
  if (direct) {
    return direct
  }

  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as {
    knowledgeBaseId?: unknown
    knowledge_base_id?: unknown
    id?: unknown
    metadata?: unknown
  }

  const fromCamel = normalizePositiveInteger(candidate.knowledgeBaseId)
  if (fromCamel) {
    return fromCamel
  }
  const fromSnake = normalizePositiveInteger(candidate.knowledge_base_id)
  if (fromSnake) {
    return fromSnake
  }
  const fromId = normalizePositiveInteger(candidate.id)
  if (fromId) {
    return fromId
  }

  if (typeof candidate.id === 'string') {
    const maybeNumber = candidate.id.match(/(\d+)/)?.[1]
    const parsed = normalizePositiveInteger(maybeNumber)
    if (parsed) {
      return parsed
    }
  }

  if (candidate.metadata && typeof candidate.metadata === 'object') {
    const metadata = candidate.metadata as {
      knowledgeBaseId?: unknown
      knowledge_base_id?: unknown
    }
    const fromMetadataCamel = normalizePositiveInteger(metadata.knowledgeBaseId)
    if (fromMetadataCamel) {
      return fromMetadataCamel
    }
    const fromMetadataSnake = normalizePositiveInteger(metadata.knowledge_base_id)
    if (fromMetadataSnake) {
      return fromMetadataSnake
    }
  }

  return null
}

function extractFileKey(value: unknown): string | null {
  if (!value || typeof value !== 'object') {
    return normalizeFileKey(value)
  }

  const candidate = value as {
    fileKey?: unknown
    file_key?: unknown
    id?: unknown
    metadata?: unknown
  }

  const fromCamel = normalizeFileKey(candidate.fileKey)
  if (fromCamel) {
    return fromCamel
  }
  const fromSnake = normalizeFileKey(candidate.file_key)
  if (fromSnake) {
    return fromSnake
  }

  if (candidate.metadata && typeof candidate.metadata === 'object') {
    const metadata = candidate.metadata as {
      fileKey?: unknown
      file_key?: unknown
    }
    const fromMetadataCamel = normalizeFileKey(metadata.fileKey)
    if (fromMetadataCamel) {
      return fromMetadataCamel
    }
    const fromMetadataSnake = normalizeFileKey(metadata.file_key)
    if (fromMetadataSnake) {
      return fromMetadataSnake
    }
  }

  const fromId = normalizeFileKey(candidate.id)
  if (fromId && (fromId.includes('/') || fromId.includes('.') || fromId.includes('\\'))) {
    return fromId
  }

  return null
}

function mergeLegacyKnowledgeBaseSelection(
  target: Map<number, Set<string> | null>,
  knowledgeBaseId: number,
  fileKeys: string[]
): void {
  const existing = target.get(knowledgeBaseId)
  if (fileKeys.length === 0) {
    target.set(knowledgeBaseId, null)
    return
  }

  if (existing === null) {
    return
  }

  const merged = existing ?? new Set<string>()
  for (const fileKey of fileKeys) {
    const normalizedFileKey = normalizeFileKey(fileKey)
    if (normalizedFileKey) {
      merged.add(normalizedFileKey)
    }
  }
  target.set(knowledgeBaseId, merged)
}

function collectCheckedFileKeysFromLegacyNode(
  node: KnowledgeRetrievalLegacyPermissionTreeNode | null | undefined
): string[] {
  if (!node || node.checked === false) {
    return []
  }

  const fileKeys = new Set<string>()
  const kind = typeof node.kind === 'string' ? node.kind : ''
  const isFileNode = kind === 'file'
  if (isFileNode) {
    const fileKey = extractFileKey(node)
    if (fileKey) {
      fileKeys.add(fileKey)
    }
  }

  for (const child of node.children ?? []) {
    for (const childFileKey of collectCheckedFileKeysFromLegacyNode(child)) {
      fileKeys.add(childFileKey)
    }
  }

  return [...fileKeys]
}

function collectLegacyKnowledgeBaseSelection(
  providers: KnowledgeRetrievalLegacyPermissionTreeNode[] | undefined
): Map<number, Set<string> | null> {
  const selectionByKnowledgeBaseId = new Map<number, Set<string> | null>()
  if (!Array.isArray(providers) || providers.length === 0) {
    return selectionByKnowledgeBaseId
  }

  const visit = (node: KnowledgeRetrievalLegacyPermissionTreeNode | null | undefined): void => {
    if (!node || node.checked === false) {
      return
    }

    const kind = typeof node.kind === 'string' ? node.kind : ''
    const isKnowledgeBaseNode = kind === 'knowledge-base' || kind === 'scope'
    const knowledgeBaseId = extractKnowledgeBaseId(node)

    if (isKnowledgeBaseNode && knowledgeBaseId) {
      const fileKeys = collectCheckedFileKeysFromLegacyNode(node)
      mergeLegacyKnowledgeBaseSelection(selectionByKnowledgeBaseId, knowledgeBaseId, fileKeys)
    }

    for (const child of node.children ?? []) {
      visit(child)
    }
  }

  for (const providerNode of providers) {
    visit(providerNode)
  }

  return selectionByKnowledgeBaseId
}

/**
 * 从 permission tree 中提取“被选中的知识库目标”。
 * 提取顺序遵循兼容优先：
 * 1. 新字段 knowledgeBaseIds
 * 2. 旧字段 knowledgeBaseId
 * 3. 新结构 knowledgeBases / knowledge_base_rules
 * 4. 旧 providers 树
 */
export function collectKnowledgeBaseIdsFromPermissionTree(
  permissionTree?: unknown
): number[] {
  if (!permissionTree || typeof permissionTree !== 'object') {
    return []
  }
  const normalizedPermissionTree = permissionTree as KnowledgeRetrievalPermissionTree

  const ids = new Set<number>()
  const appendId = (value: unknown): void => {
    const id = extractKnowledgeBaseId(value)
    if (id) {
      ids.add(id)
    }
  }

  for (const value of normalizedPermissionTree.knowledgeBaseIds ?? []) {
    appendId(value)
  }
  appendId(normalizedPermissionTree.knowledgeBaseId)

  const knowledgeBaseRules = [
    ...(normalizedPermissionTree.knowledgeBases ?? []),
    ...(normalizedPermissionTree.knowledge_base_rules ?? [])
  ]
  for (const rule of knowledgeBaseRules) {
    appendId(rule)
  }

  const legacySelection = collectLegacyKnowledgeBaseSelection(normalizedPermissionTree.providers)
  for (const knowledgeBaseId of legacySelection.keys()) {
    ids.add(knowledgeBaseId)
  }

  return [...ids]
}

function buildDocumentRuleMap(
  documents: KnowledgeRetrievalDocumentRule[] | undefined
): Map<string, KnowledgeRetrievalDocumentRule> {
  const map = new Map<string, KnowledgeRetrievalDocumentRule>()
  for (const documentRule of documents ?? []) {
    const normalizedFileKey = normalizeFileKey(documentRule.fileKey)
    if (!normalizedFileKey) {
      continue
    }
    map.set(normalizedFileKey, {
      ...documentRule,
      fileKey: normalizedFileKey
    })
  }
  return map
}

function selectPermissionTreeForKnowledgeBase(params: {
  knowledgeBaseId: number
  permissionTree?: unknown
}): KnowledgeRetrievalPermissionTree | undefined {
  const permissionTree = params.permissionTree
  if (!permissionTree || typeof permissionTree !== 'object') {
    return undefined
  }
  const normalizedPermissionTree = permissionTree as KnowledgeRetrievalPermissionTree

  const knowledgeBaseRules = [
    ...(normalizedPermissionTree.knowledgeBases ?? []),
    ...(normalizedPermissionTree.knowledge_base_rules ?? [])
  ]
  const matchedRule = knowledgeBaseRules.find(
    (rule) => extractKnowledgeBaseId(rule) === params.knowledgeBaseId
  )
  if (matchedRule) {
    return {
      effect: matchedRule.effect ?? normalizedPermissionTree.effect ?? 'allow',
      documents: matchedRule.documents
    }
  }

  const legacySelection = collectLegacyKnowledgeBaseSelection(normalizedPermissionTree.providers)
  const legacyMatched = legacySelection.get(params.knowledgeBaseId)
  if (legacyMatched !== undefined) {
    if (legacyMatched === null) {
      return {
        effect: 'allow'
      }
    }
    return {
      effect: 'allow',
      documents: [...legacyMatched].map((fileKey) => ({
        fileKey,
        effect: 'allow' as const
      }))
    }
  }

  const hasExplicitKnowledgeBaseSelection =
    (normalizedPermissionTree.knowledgeBaseIds?.length ?? 0) > 0 ||
    knowledgeBaseRules.length > 0 ||
    legacySelection.size > 0

  if (hasExplicitKnowledgeBaseSelection) {
    // 关键兼容语义：
    // 某知识库只被选中但没有文档规则时，默认该知识库全量文档可检索。
    return {
      effect: 'allow'
    }
  }

  const legacyKnowledgeBaseId = extractKnowledgeBaseId(normalizedPermissionTree.knowledgeBaseId)
  if (legacyKnowledgeBaseId && legacyKnowledgeBaseId !== params.knowledgeBaseId) {
    return {
      effect: 'allow'
    }
  }

  return {
    effect: normalizedPermissionTree.effect ?? 'allow',
    documents: normalizedPermissionTree.documents
  }
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
  permissionTree?: unknown
}): KnowledgeRetrievalResolveScopesResultDto {
  const permissionTree = selectPermissionTreeForKnowledgeBase({
    knowledgeBaseId: params.knowledgeBaseId,
    permissionTree: params.permissionTree
  })
  const baseEffect = resolveEffect(permissionTree?.effect, 'allow')
  const documentRules = buildDocumentRuleMap(permissionTree?.documents)
  const hasExplicitAllowDocumentRule = [...documentRules.values()].some(
    (documentRule) => resolveEffect(documentRule.effect, baseEffect) === 'allow'
  )
  const documentFallbackEffect: Exclude<KnowledgeRetrievalPermissionEffect, 'inherit'> =
    hasExplicitAllowDocumentRule ? 'deny' : baseEffect

  const { contexts, warnings } = collectCompletedEmbeddings(params.documents)
  const matchedDocumentKeys = new Set<string>()
  const matchedEmbeddingKeys = new Set<string>()
  const resolvedScopes: KnowledgeRetrievalResolvedScopeDto[] = []

  for (const context of contexts) {
    const documentRule = documentRules.get(normalizeFileKey(context.fileKey) || context.fileKey)
    const documentEffect = resolveEffect(documentRule?.effect, documentFallbackEffect)
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
      matchedDocumentKeys.add(normalizeFileKey(context.fileKey) || context.fileKey)
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
    knowledgeBaseIds: [params.knowledgeBaseId],
    resolvedScopes,
    warnings
  }
}
