import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { KnowledgeDebugDataSource } from './datasource'
import type {
  KnowledgeDebugDocumentNode,
  KnowledgeDebugDocumentState,
  KnowledgeDebugDocumentStatusFilter,
  KnowledgeDebugKnowledgeBaseNode,
  KnowledgeDebugResultSortMode,
  KnowledgeDebugSelectionState
} from './types'
import type { DocumentInfo, KnowledgeBaseInfo } from '@shared/knowledge-database-api.types'
import type {
  KnowledgeDatabasePermissionTree,
  KnowledgeDatabaseResolveKnowledgeRetrievalScopesResponse,
  KnowledgeDatabaseSearchKnowledgeRetrievalResponse
} from '@preload/types'

function getEmbeddingState(document: DocumentInfo): KnowledgeDebugDocumentState {
  const embeddings = Array.isArray(document.embeddings) ? document.embeddings : []
  const embeddingCount = embeddings.length
  const completedEmbeddingCount = embeddings.filter(
    (embedding) => embedding.status === 'completed'
  ).length
  const hasRunningEmbedding = embeddings.some(
    (embedding) => embedding.status === 'pending' || embedding.status === 'running'
  )
  const hasFailedEmbedding = embeddings.some((embedding) => embedding.status === 'failed')

  // 中文注释：状态判定沿用知识检索面板的语义，先看 completed，再看 running / failed。
  if (completedEmbeddingCount > 0) {
    return completedEmbeddingCount === embeddingCount ? 'completed' : 'partial'
  }
  if (hasRunningEmbedding) {
    return 'pending'
  }
  if (hasFailedEmbedding) {
    return 'failed'
  }
  return 'empty'
}

function createKnowledgeBaseNode(
  knowledgeBase: KnowledgeBaseInfo,
  selected = true
): KnowledgeDebugKnowledgeBaseNode {
  return {
    ...knowledgeBase,
    expanded: false,
    selected,
    documentsLoaded: false,
    loadingDocuments: false,
    documents: []
  }
}

function createDocumentNode(
  knowledgeBaseId: number,
  document: DocumentInfo,
  selected = true
): KnowledgeDebugDocumentNode {
  const embeddings = Array.isArray(document.embeddings) ? document.embeddings : []
  const completedEmbeddingCount = embeddings.filter(
    (embedding) => embedding.status === 'completed'
  ).length

  return {
    ...document,
    knowledgeBaseId,
    embeddingCount: embeddings.length,
    completedEmbeddingCount,
    embeddingState: getEmbeddingState(document),
    selected
  }
}

function sortKnowledgeBaseNodes(
  nodes: KnowledgeDebugKnowledgeBaseNode[]
): KnowledgeDebugKnowledgeBaseNode[] {
  return [...nodes].sort((left, right) => left.id - right.id)
}

export const useKnowledgeDebugStore = defineStore('knowledge-debug', () => {
  const knowledgeBases = ref<KnowledgeDebugKnowledgeBaseNode[]>([])
  const knowledgeBasesLoading = ref(false)
  const knowledgeBasesError = ref<string | null>(null)
  const documentStatusFilter = ref<KnowledgeDebugDocumentStatusFilter>('all')
  const resultSortMode = ref<KnowledgeDebugResultSortMode>('distance')

  const query = ref('')
  const k = ref(8)
  const ef = ref(64)
  const rerankEnabled = ref(false)
  const rerankModelProviderId = ref<string | null>(null)
  const rerankModelId = ref<string | null>(null)
  const rerankTopN = ref(5)

  const searchLoading = ref(false)
  const searchError = ref<string | null>(null)
  const resolveResponse = ref<KnowledgeDatabaseResolveKnowledgeRetrievalScopesResponse | null>(null)
  const searchResponse = ref<KnowledgeDatabaseSearchKnowledgeRetrievalResponse | null>(null)

  const selectedKnowledgeBaseIds = computed(() =>
    knowledgeBases.value.filter((base) => base.selected).map((base) => base.id)
  )

  const selectedDocumentsByBase = computed<KnowledgeDebugSelectionState['selectedDocumentsByBase']>(
    () => {
      const result: KnowledgeDebugSelectionState['selectedDocumentsByBase'] = {}

      for (const knowledgeBase of knowledgeBases.value) {
        const selectedDocuments = knowledgeBase.documents
          .filter((document) => document.selected)
          .map((document) => document.fileKey)

        if (selectedDocuments.length > 0) {
          result[knowledgeBase.id] = selectedDocuments
        }
      }

      return result
    }
  )

  const selectionState = computed<KnowledgeDebugSelectionState>(() => ({
    selectedKnowledgeBaseIds: selectedKnowledgeBaseIds.value,
    selectedDocumentsByBase: selectedDocumentsByBase.value
  }))

  const selectedKnowledgeBaseCount = computed(() => selectedKnowledgeBaseIds.value.length)
  const selectedDocumentCount = computed(() =>
    knowledgeBases.value.reduce((total, knowledgeBase) => {
      if (!knowledgeBase.selected) {
        return total
      }

      if (!knowledgeBase.documentsLoaded) {
        return total + knowledgeBase.docCount
      }

      return total + knowledgeBase.documents.filter((document) => document.selected).length
    }, 0)
  )
  const partialKnowledgeBaseCount = computed(
    () =>
      knowledgeBases.value.filter(
        (base) =>
          base.selected &&
          base.documentsLoaded &&
          base.documents.length > 0 &&
          base.documents.some((document) => document.selected) &&
          base.documents.some((document) => !document.selected)
      ).length
  )

  const resolvedScopes = computed(() => resolveResponse.value?.resolvedScopes ?? [])
  const hits = computed(() => searchResponse.value?.hits ?? [])
  const warnings = computed(() => searchResponse.value?.warnings ?? [])
  const errors = computed(() => searchResponse.value?.errors ?? [])
  const partialFailureCount = computed(
    () => searchResponse.value?.scopeResults.filter((result) => Boolean(result.error)).length ?? 0
  )

  function upsertKnowledgeBaseNode(
    knowledgeBase: KnowledgeBaseInfo
  ): KnowledgeDebugKnowledgeBaseNode {
    const existing = knowledgeBases.value.find((item) => item.id === knowledgeBase.id)
    if (!existing) {
      return createKnowledgeBaseNode(knowledgeBase)
    }

    return {
      ...existing,
      ...knowledgeBase,
      selected: existing.selected,
      expanded: existing.expanded,
      documentsLoaded: existing.documentsLoaded,
      loadingDocuments: false,
      documents: existing.documents
    }
  }

  async function loadKnowledgeBases(forceRefresh = false): Promise<void> {
    if (knowledgeBasesLoading.value && !forceRefresh) return

    knowledgeBasesLoading.value = true
    knowledgeBasesError.value = null

    try {
      const list = await KnowledgeDebugDataSource.listKnowledgeBases()
      const nextNodes = sortKnowledgeBaseNodes(list.map((item) => upsertKnowledgeBaseNode(item)))
      knowledgeBases.value = nextNodes.length > 0 ? nextNodes : []

      if (knowledgeBases.value.every((base) => !base.selected)) {
        for (const base of knowledgeBases.value) {
          base.selected = true
        }
      }
    } catch (error) {
      knowledgeBasesError.value = error instanceof Error ? error.message : '获取知识库失败'
    } finally {
      knowledgeBasesLoading.value = false
    }
  }

  async function loadDocumentsForKnowledgeBase(
    knowledgeBaseId: number,
    forceRefresh = false
  ): Promise<void> {
    const knowledgeBase = knowledgeBases.value.find((item) => item.id === knowledgeBaseId)
    if (!knowledgeBase || (knowledgeBase.documentsLoaded && !forceRefresh)) {
      return
    }

    knowledgeBase.loadingDocuments = true

    try {
      const rawDocuments =
        await KnowledgeDebugDataSource.listAllDocumentsByKnowledgeBaseId(knowledgeBaseId)
      const selectedFileKeys = new Set(
        knowledgeBase.documents
          .filter((document) => document.selected)
          .map((document) => document.fileKey)
      )
      const shouldDefaultSelect = knowledgeBase.selected || selectedFileKeys.size === 0

      knowledgeBase.documents = rawDocuments.map((document) =>
        createDocumentNode(
          knowledgeBaseId,
          document,
          selectedFileKeys.has(document.fileKey) || shouldDefaultSelect
        )
      )
      knowledgeBase.documentsLoaded = true
      knowledgeBase.selected =
        knowledgeBase.selected || knowledgeBase.documents.some((document) => document.selected)
    } catch (error) {
      knowledgeBasesError.value = error instanceof Error ? error.message : '加载文档失败'
    } finally {
      knowledgeBase.loadingDocuments = false
    }
  }

  async function refreshKnowledgeBases(): Promise<void> {
    await loadKnowledgeBases(true)

    await Promise.all(
      knowledgeBases.value
        .filter((knowledgeBase) => knowledgeBase.documentsLoaded)
        .map((knowledgeBase) => loadDocumentsForKnowledgeBase(knowledgeBase.id, true))
    )
  }

  async function toggleKnowledgeBaseExpanded(knowledgeBaseId: number): Promise<void> {
    const knowledgeBase = knowledgeBases.value.find((item) => item.id === knowledgeBaseId)
    if (!knowledgeBase) return

    knowledgeBase.expanded = !knowledgeBase.expanded
    if (knowledgeBase.expanded && !knowledgeBase.documentsLoaded) {
      await loadDocumentsForKnowledgeBase(knowledgeBaseId)
    }
  }

  function toggleKnowledgeBaseSelection(knowledgeBaseId: number): void {
    const knowledgeBase = knowledgeBases.value.find((item) => item.id === knowledgeBaseId)
    if (!knowledgeBase) return

    const nextSelected = !knowledgeBase.selected
    knowledgeBase.selected = nextSelected
    if (knowledgeBase.documents.length > 0) {
      for (const document of knowledgeBase.documents) {
        document.selected = nextSelected
      }
    }
  }

  function toggleDocumentSelection(knowledgeBaseId: number, fileKey: string): void {
    const knowledgeBase = knowledgeBases.value.find((item) => item.id === knowledgeBaseId)
    if (!knowledgeBase) return

    const document = knowledgeBase.documents.find((item) => item.fileKey === fileKey)
    if (!document) return

    document.selected = !document.selected
    knowledgeBase.selected = knowledgeBase.documents.some((item) => item.selected)
  }

  function setDocumentStatusFilter(nextFilter: KnowledgeDebugDocumentStatusFilter): void {
    documentStatusFilter.value = nextFilter
  }

  function setResultSortMode(nextSortMode: KnowledgeDebugResultSortMode): void {
    resultSortMode.value = nextSortMode
  }

  function setQuery(value: string): void {
    query.value = value
  }

  function clearQuery(): void {
    query.value = ''
  }

  function setK(value: number): void {
    k.value = value
  }

  function setEf(value: number): void {
    ef.value = value
  }

  function setRerankEnabled(value: boolean): void {
    rerankEnabled.value = value
  }

  function setRerankModelSelection(providerId: string | null, modelId: string | null): void {
    rerankModelProviderId.value = providerId
    rerankModelId.value = modelId
  }

  function setRerankTopN(value: number): void {
    rerankTopN.value = value
  }

  function buildPermissionTree(): KnowledgeDatabasePermissionTree {
    const bases = knowledgeBases.value
      .filter((base) => base.selected)
      .map((base) => {
        const selectedDocuments = base.documents.filter((document) => document.selected)
        if (!base.documentsLoaded || selectedDocuments.length === 0) {
          return {
            knowledgeBaseId: base.id,
            effect: 'allow' as const
          }
        }

        if (selectedDocuments.length === base.documents.length) {
          return {
            knowledgeBaseId: base.id,
            effect: 'allow' as const
          }
        }

        return {
          knowledgeBaseId: base.id,
          effect: 'allow' as const,
          documents: selectedDocuments.map((document) => ({
            fileKey: document.fileKey,
            effect: 'allow' as const
          }))
        }
      })

    return {
      knowledgeBaseIds: selectedKnowledgeBaseIds.value,
      knowledgeBases: bases
    }
  }

  async function resolveSelectedScopes(): Promise<KnowledgeDatabaseResolveKnowledgeRetrievalScopesResponse> {
    const response = await KnowledgeDebugDataSource.resolveKnowledgeRetrievalScopes({
      knowledgeBaseIds: selectedKnowledgeBaseIds.value,
      permissionTree: buildPermissionTree()
    })
    resolveResponse.value = response
    return response
  }

  async function runSearch(): Promise<void> {
    if (!query.value.trim()) {
      searchError.value = '请输入查询内容'
      return
    }

    if (selectedKnowledgeBaseIds.value.length === 0) {
      searchError.value = '请至少选择一个知识库'
      return
    }

    searchLoading.value = true
    searchError.value = null
    resolveResponse.value = null
    searchResponse.value = null

    try {
      await resolveSelectedScopes()
      searchResponse.value = await KnowledgeDebugDataSource.searchKnowledgeRetrieval({
        knowledgeBaseIds: selectedKnowledgeBaseIds.value,
        permissionTree: buildPermissionTree(),
        query: query.value.trim(),
        k: k.value,
        ef: ef.value,
        rerank:
          rerankEnabled.value && rerankModelId.value
            ? {
                modelId: rerankModelId.value,
                topN: rerankTopN.value
              }
            : undefined
      })
    } catch (error) {
      searchError.value = error instanceof Error ? error.message : '执行检索失败'
    } finally {
      searchLoading.value = false
    }
  }

  function clearSearchResult(): void {
    resolveResponse.value = null
    searchResponse.value = null
    searchError.value = null
  }

  function resetAllSelections(): void {
    for (const knowledgeBase of knowledgeBases.value) {
      knowledgeBase.selected = true
      for (const document of knowledgeBase.documents) {
        document.selected = true
      }
    }
  }

  return {
    knowledgeBases,
    knowledgeBasesLoading,
    knowledgeBasesError,
    documentStatusFilter,
    resultSortMode,
    query,
    k,
    ef,
    rerankEnabled,
    rerankModelProviderId,
    rerankModelId,
    rerankTopN,
    searchLoading,
    searchError,
    resolveResponse,
    searchResponse,
    selectedKnowledgeBaseIds,
    selectedDocumentsByBase,
    selectionState,
    selectedKnowledgeBaseCount,
    selectedDocumentCount,
    partialKnowledgeBaseCount,
    resolvedScopes,
    hits,
    warnings,
    errors,
    partialFailureCount,
    loadKnowledgeBases,
    loadDocumentsForKnowledgeBase,
    refreshKnowledgeBases,
    toggleKnowledgeBaseExpanded,
    toggleKnowledgeBaseSelection,
    toggleDocumentSelection,
    setDocumentStatusFilter,
    setResultSortMode,
    setQuery,
    clearQuery,
    setK,
    setEf,
    setRerankEnabled,
    setRerankModelSelection,
    setRerankTopN,
    resolveSelectedScopes,
    runSearch,
    clearSearchResult,
    resetAllSelections
  }
})
