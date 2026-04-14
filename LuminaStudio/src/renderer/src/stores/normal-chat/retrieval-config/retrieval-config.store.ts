import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  NormalChatKnowledgeRetrievalPolicyInput,
  NormalChatKnowledgeRetrievalPolicyTable,
  KnowledgeDatabaseListDocumentEmbeddingsRequest,
  KnowledgeDatabaseListDocsRequest
} from '@preload/types'
import type {
  DocumentEmbeddingInfo,
  DocumentInfo,
  KGGraphTableInfo,
  KGKnowledgeBaseInfo,
  KnowledgeBaseInfo
} from '@shared/knowledge-database-api.types'
import { useNormalChatWorkspaceStore } from '../workspace/workspace.store'
import type {
  RetrievalConfigKgKnowledgeBaseNode,
  RetrievalConfigKgMode,
  RetrievalConfigPanelId,
  RetrievalConfigVectorDocumentNode,
  RetrievalConfigVectorKnowledgeBaseNode,
  RetrievalConfigVectorMode
} from './retrieval-config.types'

const VECTOR_PAGE_SIZE = 100

interface VectorDocumentRecord extends DocumentInfo {
  embeddingCount: number
  availableTables: NormalChatKnowledgeRetrievalPolicyTable[]
}

interface VectorEmbeddingRecord extends DocumentEmbeddingInfo {
  tableName: string
}

function makeVectorTableName(embeddingConfigId: string, dimensions: number): string {
  const safeId = embeddingConfigId.replace(/[^a-zA-Z0-9_]/g, '_')
  return `emb_cfg_${safeId}_${dimensions}_chunks`
}

function getVectorDocumentCacheKey(knowledgeBaseId: number, fileKey: string): string {
  return `${knowledgeBaseId}::${fileKey}`
}

function unwrap<T>(response: { success: boolean; data?: T; error?: string }): T {
  if (!response.success || response.data == null) {
    throw new Error(response.error || '请求失败')
  }

  return response.data
}

function buildPolicyTable(input: {
  embeddingConfigId: string
  embeddingConfigName?: string
  dimensions: number
}): NormalChatKnowledgeRetrievalPolicyTable {
  return {
    tableName: makeVectorTableName(input.embeddingConfigId, input.dimensions),
    embeddingConfigId: input.embeddingConfigId,
    embeddingConfigName: input.embeddingConfigName,
    dimensions: input.dimensions
  }
}

function buildVectorDocumentRecord(document: DocumentInfo): VectorDocumentRecord {
  return {
    ...document,
    embeddingCount: document.embeddings.length,
    availableTables: document.embeddings.map(buildPolicyTable)
  }
}

function buildVectorEmbeddingRecord(embedding: DocumentEmbeddingInfo): VectorEmbeddingRecord {
  return {
    ...embedding,
    tableName: makeVectorTableName(embedding.embeddingConfigId, embedding.dimensions)
  }
}

function toggleId(list: string[], value: string, nextSelected: boolean): string[] {
  if (nextSelected) {
    return list.includes(value) ? list : [...list, value]
  }

  return list.filter((item) => item !== value)
}

export const useNormalChatRetrievalConfigStore = defineStore('normal-chat-retrieval-config', () => {
  const workspaceStore = useNormalChatWorkspaceStore()

  const activePanel = ref<RetrievalConfigPanelId | null>(null)

  const vectorMode = ref<RetrievalConfigVectorMode>('global')
  const vectorKnowledgeBasesData = ref<KnowledgeBaseInfo[]>([])
  const vectorKnowledgeBasesLoading = ref(false)
  const vectorKnowledgeBasesError = ref<string | null>(null)
  const vectorSelectedKnowledgeBaseId = ref<number | null>(null)
  const vectorSelectedDocumentFileKeys = ref<string[]>([])
  const vectorSelectedEmbeddingConfigIdsByFileKey = ref<Record<string, string[]>>({})
  const vectorExpandedKnowledgeBaseIds = ref<number[]>([])
  const vectorExpandedDocumentKeys = ref<string[]>([])
  const vectorDocumentsByKnowledgeBaseId = ref<Record<number, VectorDocumentRecord[]>>({})
  const vectorDocumentsLoadedByKnowledgeBaseId = ref<Record<number, boolean>>({})
  const vectorDocumentsLoadingByKnowledgeBaseId = ref<Record<number, boolean>>({})
  const vectorEmbeddingsByDocumentKey = ref<Record<string, VectorEmbeddingRecord[]>>({})
  const vectorEmbeddingsLoadedByDocumentKey = ref<Record<string, boolean>>({})
  const vectorEmbeddingsLoadingByDocumentKey = ref<Record<string, boolean>>({})
  const vectorRerankEnabled = ref(false)
  const vectorRerankModelId = ref<string | null>(null)
  const vectorRerankTopN = ref(5)

  const kgMode = ref<RetrievalConfigKgMode>('global')
  const kgKnowledgeBasesData = ref<KGKnowledgeBaseInfo[]>([])
  const kgKnowledgeBasesLoading = ref(false)
  const kgKnowledgeBasesError = ref<string | null>(null)
  const kgSelectedKnowledgeBaseId = ref<number | null>(null)
  const kgSelectedGraphTableBases = ref<string[]>([])
  const kgExpandedKnowledgeBaseIds = ref<number[]>([])
  const kgGraphTablesByKnowledgeBaseId = ref<Record<number, KGGraphTableInfo[]>>({})
  const kgGraphTablesLoadedByKnowledgeBaseId = ref<Record<number, boolean>>({})
  const kgGraphTablesLoadingByKnowledgeBaseId = ref<Record<number, boolean>>({})

  const vectorKnowledgeBases = computed<RetrievalConfigVectorKnowledgeBaseNode[]>(() => {
    return vectorKnowledgeBasesData.value.map((knowledgeBase) => {
      const documents = vectorDocumentsByKnowledgeBaseId.value[knowledgeBase.id] ?? []
      return {
        ...knowledgeBase,
        displayDocCount: vectorDocumentsLoadedByKnowledgeBaseId.value[knowledgeBase.id]
          ? documents.length
          : knowledgeBase.docCount,
        expanded: vectorExpandedKnowledgeBaseIds.value.includes(knowledgeBase.id),
        selected: vectorSelectedKnowledgeBaseId.value === knowledgeBase.id,
        documentsLoaded: Boolean(vectorDocumentsLoadedByKnowledgeBaseId.value[knowledgeBase.id]),
        loadingDocuments: Boolean(vectorDocumentsLoadingByKnowledgeBaseId.value[knowledgeBase.id]),
        documents: documents.map((document) => {
          const cacheKey = getVectorDocumentCacheKey(knowledgeBase.id, document.fileKey)
          const embeddings = vectorEmbeddingsByDocumentKey.value[cacheKey] ?? []
          return {
            ...document,
            displayEmbeddingCount: vectorEmbeddingsLoadedByDocumentKey.value[cacheKey]
              ? embeddings.length
              : document.embeddingCount,
            expanded: vectorExpandedDocumentKeys.value.includes(cacheKey),
            selected: vectorSelectedDocumentFileKeys.value.includes(document.fileKey),
            embeddingsLoaded: Boolean(vectorEmbeddingsLoadedByDocumentKey.value[cacheKey]),
            loadingEmbeddings: Boolean(vectorEmbeddingsLoadingByDocumentKey.value[cacheKey]),
            embeddings: embeddings.map((embedding) => ({
              ...embedding,
              selected:
                vectorSelectedEmbeddingConfigIdsByFileKey.value[document.fileKey]?.includes(
                  embedding.embeddingConfigId
                ) ?? false
            }))
          } satisfies RetrievalConfigVectorDocumentNode
        })
      }
    })
  })

  const kgKnowledgeBases = computed<RetrievalConfigKgKnowledgeBaseNode[]>(() => {
    return kgKnowledgeBasesData.value.map((knowledgeBase) => ({
      ...knowledgeBase,
      expanded: kgExpandedKnowledgeBaseIds.value.includes(knowledgeBase.id),
      selected: kgSelectedKnowledgeBaseId.value === knowledgeBase.id,
      graphTablesLoaded: Boolean(kgGraphTablesLoadedByKnowledgeBaseId.value[knowledgeBase.id]),
      loadingGraphTables: Boolean(kgGraphTablesLoadingByKnowledgeBaseId.value[knowledgeBase.id]),
      graphTables: (kgGraphTablesByKnowledgeBaseId.value[knowledgeBase.id] ?? []).map((table) => ({
        ...table,
        selected: kgSelectedGraphTableBases.value.includes(table.graphTableBase)
      }))
    }))
  })

  const currentVectorKnowledgeBase = computed(
    () =>
      vectorKnowledgeBases.value.find((item) => item.id === vectorSelectedKnowledgeBaseId.value) ??
      null
  )
  const currentKgKnowledgeBase = computed(
    () => kgKnowledgeBases.value.find((item) => item.id === kgSelectedKnowledgeBaseId.value) ?? null
  )

  const vectorTableNames = computed(() => {
    const kb = currentVectorKnowledgeBase.value
    if (!kb) {
      return []
    }

    if (vectorMode.value === 'global') {
      const tableNames = new Set<string>()
      for (const document of kb.documents) {
        for (const table of document.availableTables) {
          tableNames.add(table.tableName)
        }
      }
      return kb.selected ? [...tableNames] : []
    }

    const selectedTables = new Set<string>()
    for (const document of kb.documents) {
      if (!document.selected) {
        continue
      }

      const explicitEmbeddings = document.embeddings.filter((embedding) => embedding.selected)
      const tables = explicitEmbeddings.length > 0 ? explicitEmbeddings : document.availableTables
      for (const table of tables) {
        selectedTables.add(table.tableName)
      }
    }

    return [...selectedTables]
  })

  const kgTableNames = computed(() => {
    const kb = currentKgKnowledgeBase.value
    if (!kb) {
      return []
    }

    if (kgMode.value === 'global') {
      return kb.selected ? [kb.name] : []
    }

    return kb.graphTables.filter((item) => item.selected).map((item) => item.graphTableBase)
  })

  function cleanupVectorKnowledgeBaseState(validKnowledgeBaseIds: number[]): void {
    const validIds = new Set(validKnowledgeBaseIds)
    vectorExpandedKnowledgeBaseIds.value = vectorExpandedKnowledgeBaseIds.value.filter((id) =>
      validIds.has(id)
    )

    if (
      vectorSelectedKnowledgeBaseId.value != null &&
      !validIds.has(vectorSelectedKnowledgeBaseId.value)
    ) {
      vectorSelectedKnowledgeBaseId.value = null
      vectorSelectedDocumentFileKeys.value = []
      vectorSelectedEmbeddingConfigIdsByFileKey.value = {}
    }

    const nextDocumentsByKb: Record<number, VectorDocumentRecord[]> = {}
    const nextDocumentsLoaded: Record<number, boolean> = {}
    const nextDocumentsLoading: Record<number, boolean> = {}
    for (const knowledgeBaseId of validKnowledgeBaseIds) {
      if (vectorDocumentsByKnowledgeBaseId.value[knowledgeBaseId]) {
        nextDocumentsByKb[knowledgeBaseId] = vectorDocumentsByKnowledgeBaseId.value[knowledgeBaseId]
      }
      if (vectorDocumentsLoadedByKnowledgeBaseId.value[knowledgeBaseId]) {
        nextDocumentsLoaded[knowledgeBaseId] = true
      }
      if (vectorDocumentsLoadingByKnowledgeBaseId.value[knowledgeBaseId]) {
        nextDocumentsLoading[knowledgeBaseId] = true
      }
    }

    vectorDocumentsByKnowledgeBaseId.value = nextDocumentsByKb
    vectorDocumentsLoadedByKnowledgeBaseId.value = nextDocumentsLoaded
    vectorDocumentsLoadingByKnowledgeBaseId.value = nextDocumentsLoading
  }

  function cleanupVectorDocumentState(knowledgeBaseId: number, validFileKeys: string[]): void {
    const validFileKeySet = new Set(validFileKeys)
    const validDocumentCacheKeys = new Set(
      validFileKeys.map((fileKey) => getVectorDocumentCacheKey(knowledgeBaseId, fileKey))
    )

    vectorExpandedDocumentKeys.value = vectorExpandedDocumentKeys.value.filter(
      (cacheKey) =>
        !cacheKey.startsWith(`${knowledgeBaseId}::`) || validDocumentCacheKeys.has(cacheKey)
    )
    vectorSelectedDocumentFileKeys.value = vectorSelectedDocumentFileKeys.value.filter((fileKey) =>
      validFileKeySet.has(fileKey)
    )

    const nextSelectedEmbeddingConfigIdsByFileKey: Record<string, string[]> = {}
    for (const fileKey of validFileKeys) {
      const selectedIds = vectorSelectedEmbeddingConfigIdsByFileKey.value[fileKey]
      if (selectedIds?.length) {
        nextSelectedEmbeddingConfigIdsByFileKey[fileKey] = selectedIds
      }
    }
    vectorSelectedEmbeddingConfigIdsByFileKey.value = nextSelectedEmbeddingConfigIdsByFileKey

    const nextEmbeddingsByDocumentKey: Record<string, VectorEmbeddingRecord[]> = {}
    const nextEmbeddingsLoadedByDocumentKey: Record<string, boolean> = {}
    const nextEmbeddingsLoadingByDocumentKey: Record<string, boolean> = {}
    for (const [cacheKey, embeddings] of Object.entries(vectorEmbeddingsByDocumentKey.value)) {
      if (!cacheKey.startsWith(`${knowledgeBaseId}::`) || validDocumentCacheKeys.has(cacheKey)) {
        nextEmbeddingsByDocumentKey[cacheKey] = embeddings
      }
    }
    for (const [cacheKey, loaded] of Object.entries(vectorEmbeddingsLoadedByDocumentKey.value)) {
      if (
        loaded &&
        (!cacheKey.startsWith(`${knowledgeBaseId}::`) || validDocumentCacheKeys.has(cacheKey))
      ) {
        nextEmbeddingsLoadedByDocumentKey[cacheKey] = true
      }
    }
    for (const [cacheKey, loading] of Object.entries(vectorEmbeddingsLoadingByDocumentKey.value)) {
      if (
        loading &&
        (!cacheKey.startsWith(`${knowledgeBaseId}::`) || validDocumentCacheKeys.has(cacheKey))
      ) {
        nextEmbeddingsLoadingByDocumentKey[cacheKey] = true
      }
    }

    vectorEmbeddingsByDocumentKey.value = nextEmbeddingsByDocumentKey
    vectorEmbeddingsLoadedByDocumentKey.value = nextEmbeddingsLoadedByDocumentKey
    vectorEmbeddingsLoadingByDocumentKey.value = nextEmbeddingsLoadingByDocumentKey
  }

  async function loadVectorKnowledgeBases(forceRefresh = false): Promise<void> {
    if (vectorKnowledgeBasesLoading.value && !forceRefresh) {
      return
    }

    vectorKnowledgeBasesLoading.value = true
    vectorKnowledgeBasesError.value = null

    try {
      const response = await window.api.knowledgeDatabase.listKnowledgeBases()
      const knowledgeBases = unwrap(response).knowledgeBases
      vectorKnowledgeBasesData.value = knowledgeBases
      cleanupVectorKnowledgeBaseState(knowledgeBases.map((item) => item.id))

      if (
        vectorSelectedKnowledgeBaseId.value != null &&
        knowledgeBases.some((item) => item.id === vectorSelectedKnowledgeBaseId.value)
      ) {
        void loadVectorDocuments(vectorSelectedKnowledgeBaseId.value, true)
      }

      for (const knowledgeBaseId of vectorExpandedKnowledgeBaseIds.value) {
        void loadVectorDocuments(knowledgeBaseId, true)
      }
    } catch (error) {
      vectorKnowledgeBasesError.value = error instanceof Error ? error.message : '获取知识库失败'
    } finally {
      vectorKnowledgeBasesLoading.value = false
    }
  }

  async function loadVectorDocuments(knowledgeBaseId: number, forceRefresh = false): Promise<void> {
    if (
      vectorDocumentsLoadingByKnowledgeBaseId.value[knowledgeBaseId] ||
      (vectorDocumentsLoadedByKnowledgeBaseId.value[knowledgeBaseId] && !forceRefresh)
    ) {
      return
    }

    vectorDocumentsLoadingByKnowledgeBaseId.value = {
      ...vectorDocumentsLoadingByKnowledgeBaseId.value,
      [knowledgeBaseId]: true
    }

    try {
      const documents: VectorDocumentRecord[] = []
      let page = 1
      let totalPages = 1

      while (page <= totalPages) {
        const request: KnowledgeDatabaseListDocsRequest = {
          knowledgeBaseId,
          page,
          pageSize: VECTOR_PAGE_SIZE
        }
        const response = await window.api.knowledgeDatabase.listDocuments(request)
        const data = unwrap(response)
        documents.push(...data.documents.map(buildVectorDocumentRecord))
        totalPages = Math.max(1, data.totalPages)
        page += 1
      }

      vectorDocumentsByKnowledgeBaseId.value = {
        ...vectorDocumentsByKnowledgeBaseId.value,
        [knowledgeBaseId]: documents
      }
      vectorDocumentsLoadedByKnowledgeBaseId.value = {
        ...vectorDocumentsLoadedByKnowledgeBaseId.value,
        [knowledgeBaseId]: true
      }
      cleanupVectorDocumentState(
        knowledgeBaseId,
        documents.map((document) => document.fileKey)
      )

      const expandedDocumentKeys = vectorExpandedDocumentKeys.value.filter((cacheKey) =>
        cacheKey.startsWith(`${knowledgeBaseId}::`)
      )
      for (const cacheKey of expandedDocumentKeys) {
        const [, fileKey = ''] = cacheKey.split('::')
        if (fileKey) {
          void loadVectorEmbeddings(knowledgeBaseId, fileKey, true)
        }
      }
    } catch (error) {
      vectorKnowledgeBasesError.value = error instanceof Error ? error.message : '加载文档失败'
    } finally {
      vectorDocumentsLoadingByKnowledgeBaseId.value = {
        ...vectorDocumentsLoadingByKnowledgeBaseId.value,
        [knowledgeBaseId]: false
      }
    }
  }

  async function loadVectorEmbeddings(
    knowledgeBaseId: number,
    fileKey: string,
    forceRefresh = false
  ): Promise<void> {
    const cacheKey = getVectorDocumentCacheKey(knowledgeBaseId, fileKey)
    if (
      vectorEmbeddingsLoadingByDocumentKey.value[cacheKey] ||
      (vectorEmbeddingsLoadedByDocumentKey.value[cacheKey] && !forceRefresh)
    ) {
      return
    }

    vectorEmbeddingsLoadingByDocumentKey.value = {
      ...vectorEmbeddingsLoadingByDocumentKey.value,
      [cacheKey]: true
    }

    try {
      const request: KnowledgeDatabaseListDocumentEmbeddingsRequest = { knowledgeBaseId, fileKey }
      const response = await window.api.knowledgeDatabase.listDocumentEmbeddings(request)
      const data = unwrap(response)
      const embeddings = data.embeddings.map(buildVectorEmbeddingRecord)

      vectorEmbeddingsByDocumentKey.value = {
        ...vectorEmbeddingsByDocumentKey.value,
        [cacheKey]: embeddings
      }
      vectorEmbeddingsLoadedByDocumentKey.value = {
        ...vectorEmbeddingsLoadedByDocumentKey.value,
        [cacheKey]: true
      }

      const validEmbeddingIds = new Set(embeddings.map((embedding) => embedding.embeddingConfigId))
      const selectedIds = vectorSelectedEmbeddingConfigIdsByFileKey.value[fileKey] ?? []
      vectorSelectedEmbeddingConfigIdsByFileKey.value = {
        ...vectorSelectedEmbeddingConfigIdsByFileKey.value,
        [fileKey]: selectedIds.filter((id) => validEmbeddingIds.has(id))
      }
    } catch (error) {
      vectorKnowledgeBasesError.value = error instanceof Error ? error.message : '加载嵌入表失败'
    } finally {
      vectorEmbeddingsLoadingByDocumentKey.value = {
        ...vectorEmbeddingsLoadingByDocumentKey.value,
        [cacheKey]: false
      }
    }
  }

  async function toggleVectorKnowledgeBaseExpanded(knowledgeBaseId: number): Promise<void> {
    const expanded = !vectorExpandedKnowledgeBaseIds.value.includes(knowledgeBaseId)
    vectorExpandedKnowledgeBaseIds.value = expanded
      ? [...vectorExpandedKnowledgeBaseIds.value, knowledgeBaseId]
      : vectorExpandedKnowledgeBaseIds.value.filter((id) => id !== knowledgeBaseId)

    if (expanded) {
      await loadVectorDocuments(knowledgeBaseId)
    }
  }

  async function toggleVectorDocumentExpanded(
    knowledgeBaseId: number,
    fileKey: string
  ): Promise<void> {
    const cacheKey = getVectorDocumentCacheKey(knowledgeBaseId, fileKey)
    const expanded = !vectorExpandedDocumentKeys.value.includes(cacheKey)
    vectorExpandedDocumentKeys.value = expanded
      ? [...vectorExpandedDocumentKeys.value, cacheKey]
      : vectorExpandedDocumentKeys.value.filter((item) => item !== cacheKey)

    if (expanded) {
      await loadVectorEmbeddings(knowledgeBaseId, fileKey)
    }
  }

  function setVectorMode(mode: RetrievalConfigVectorMode): void {
    vectorMode.value = mode
    if (mode === 'disabled') {
      vectorSelectedDocumentFileKeys.value = []
      vectorSelectedEmbeddingConfigIdsByFileKey.value = {}
    }
    if (
      mode === 'global' &&
      vectorSelectedKnowledgeBaseId.value == null &&
      vectorKnowledgeBasesData.value.length > 0
    ) {
      vectorSelectedKnowledgeBaseId.value = vectorKnowledgeBasesData.value[0].id
    }
  }

  function selectVectorKnowledgeBase(knowledgeBaseId: number): void {
    vectorSelectedKnowledgeBaseId.value = knowledgeBaseId
    vectorSelectedDocumentFileKeys.value = []
    vectorSelectedEmbeddingConfigIdsByFileKey.value = {}
    void loadVectorDocuments(knowledgeBaseId)
  }

  function toggleVectorDocumentSelection(knowledgeBaseId: number, fileKey: string): void {
    const nextSelected = !vectorSelectedDocumentFileKeys.value.includes(fileKey)
    vectorSelectedDocumentFileKeys.value = toggleId(
      vectorSelectedDocumentFileKeys.value,
      fileKey,
      nextSelected
    )

    if (nextSelected) {
      vectorSelectedKnowledgeBaseId.value = knowledgeBaseId
      void loadVectorEmbeddings(knowledgeBaseId, fileKey)
      return
    }

    const nextSelectedEmbeddingConfigIdsByFileKey = {
      ...vectorSelectedEmbeddingConfigIdsByFileKey.value
    }
    delete nextSelectedEmbeddingConfigIdsByFileKey[fileKey]
    vectorSelectedEmbeddingConfigIdsByFileKey.value = nextSelectedEmbeddingConfigIdsByFileKey
  }

  function toggleVectorEmbeddingSelection(
    knowledgeBaseId: number,
    fileKey: string,
    embeddingConfigId: string
  ): void {
    const current = vectorSelectedEmbeddingConfigIdsByFileKey.value[fileKey] ?? []
    const nextSelected = !current.includes(embeddingConfigId)
    const nextIds = toggleId(current, embeddingConfigId, nextSelected)

    vectorSelectedEmbeddingConfigIdsByFileKey.value = {
      ...vectorSelectedEmbeddingConfigIdsByFileKey.value,
      [fileKey]: nextIds
    }
    vectorSelectedDocumentFileKeys.value = toggleId(
      vectorSelectedDocumentFileKeys.value,
      fileKey,
      nextIds.length > 0
    )
    vectorSelectedKnowledgeBaseId.value =
      vectorSelectedDocumentFileKeys.value.length > 0 ? knowledgeBaseId : null
  }

  function cleanupKgKnowledgeBaseState(validKnowledgeBaseIds: number[]): void {
    const validIds = new Set(validKnowledgeBaseIds)
    kgExpandedKnowledgeBaseIds.value = kgExpandedKnowledgeBaseIds.value.filter((id) =>
      validIds.has(id)
    )
    if (kgSelectedKnowledgeBaseId.value != null && !validIds.has(kgSelectedKnowledgeBaseId.value)) {
      kgSelectedKnowledgeBaseId.value = null
      kgSelectedGraphTableBases.value = []
    }

    const nextGraphTablesByKb: Record<number, KGGraphTableInfo[]> = {}
    const nextGraphTablesLoadedByKb: Record<number, boolean> = {}
    const nextGraphTablesLoadingByKb: Record<number, boolean> = {}
    for (const knowledgeBaseId of validKnowledgeBaseIds) {
      if (kgGraphTablesByKnowledgeBaseId.value[knowledgeBaseId]) {
        nextGraphTablesByKb[knowledgeBaseId] = kgGraphTablesByKnowledgeBaseId.value[knowledgeBaseId]
      }
      if (kgGraphTablesLoadedByKnowledgeBaseId.value[knowledgeBaseId]) {
        nextGraphTablesLoadedByKb[knowledgeBaseId] = true
      }
      if (kgGraphTablesLoadingByKnowledgeBaseId.value[knowledgeBaseId]) {
        nextGraphTablesLoadingByKb[knowledgeBaseId] = true
      }
    }

    kgGraphTablesByKnowledgeBaseId.value = nextGraphTablesByKb
    kgGraphTablesLoadedByKnowledgeBaseId.value = nextGraphTablesLoadedByKb
    kgGraphTablesLoadingByKnowledgeBaseId.value = nextGraphTablesLoadingByKb
  }

  async function loadKgKnowledgeBases(forceRefresh = false): Promise<void> {
    if (kgKnowledgeBasesLoading.value && !forceRefresh) {
      return
    }

    kgKnowledgeBasesLoading.value = true
    kgKnowledgeBasesError.value = null

    try {
      const response = await window.api.knowledgeDatabase.listKGKnowledgeBases()
      const knowledgeBases = unwrap(response).knowledgeBases
      kgKnowledgeBasesData.value = knowledgeBases
      cleanupKgKnowledgeBaseState(knowledgeBases.map((item) => item.id))

      for (const knowledgeBaseId of kgExpandedKnowledgeBaseIds.value) {
        void loadKgGraphTables(knowledgeBaseId, true)
      }
    } catch (error) {
      kgKnowledgeBasesError.value = error instanceof Error ? error.message : '获取 KG 知识库失败'
    } finally {
      kgKnowledgeBasesLoading.value = false
    }
  }

  async function loadKgGraphTables(knowledgeBaseId: number, forceRefresh = false): Promise<void> {
    if (
      kgGraphTablesLoadingByKnowledgeBaseId.value[knowledgeBaseId] ||
      (kgGraphTablesLoadedByKnowledgeBaseId.value[knowledgeBaseId] && !forceRefresh)
    ) {
      return
    }

    kgGraphTablesLoadingByKnowledgeBaseId.value = {
      ...kgGraphTablesLoadingByKnowledgeBaseId.value,
      [knowledgeBaseId]: true
    }

    try {
      const response = await window.api.knowledgeDatabase.getKGGraphTables(knowledgeBaseId)
      const graphTables = unwrap(response)
      kgGraphTablesByKnowledgeBaseId.value = {
        ...kgGraphTablesByKnowledgeBaseId.value,
        [knowledgeBaseId]: graphTables
      }
      kgGraphTablesLoadedByKnowledgeBaseId.value = {
        ...kgGraphTablesLoadedByKnowledgeBaseId.value,
        [knowledgeBaseId]: true
      }

      const validGraphTableBases = new Set(graphTables.map((item) => item.graphTableBase))
      kgSelectedGraphTableBases.value = kgSelectedGraphTableBases.value.filter((tableBase) =>
        validGraphTableBases.has(tableBase)
      )
    } catch (error) {
      kgKnowledgeBasesError.value = error instanceof Error ? error.message : '加载图谱表失败'
    } finally {
      kgGraphTablesLoadingByKnowledgeBaseId.value = {
        ...kgGraphTablesLoadingByKnowledgeBaseId.value,
        [knowledgeBaseId]: false
      }
    }
  }

  async function toggleKgKnowledgeBaseExpanded(knowledgeBaseId: number): Promise<void> {
    const expanded = !kgExpandedKnowledgeBaseIds.value.includes(knowledgeBaseId)
    kgExpandedKnowledgeBaseIds.value = expanded
      ? [...kgExpandedKnowledgeBaseIds.value, knowledgeBaseId]
      : kgExpandedKnowledgeBaseIds.value.filter((id) => id !== knowledgeBaseId)

    if (expanded) {
      selectKgKnowledgeBase(knowledgeBaseId)
      await loadKgGraphTables(knowledgeBaseId)
    }
  }

  function setKgMode(mode: RetrievalConfigKgMode): void {
    kgMode.value = mode
    if (mode === 'disabled') {
      kgSelectedGraphTableBases.value = []
    }
  }

  function selectKgKnowledgeBase(knowledgeBaseId: number): void {
    kgSelectedKnowledgeBaseId.value = knowledgeBaseId
    kgSelectedGraphTableBases.value = []
  }

  function toggleKgGraphTableSelection(knowledgeBaseId: number, graphTableBase: string): void {
    const nextSelected = !kgSelectedGraphTableBases.value.includes(graphTableBase)
    kgSelectedGraphTableBases.value = toggleId(
      kgSelectedGraphTableBases.value,
      graphTableBase,
      nextSelected
    )
    kgSelectedKnowledgeBaseId.value =
      kgSelectedGraphTableBases.value.length > 0 ? knowledgeBaseId : null
  }

  function openPanel(panel: RetrievalConfigPanelId): void {
    if (activePanel.value === panel) {
      activePanel.value = null
      return
    }

    activePanel.value = panel
    if (panel === 'vector') {
      void loadVectorKnowledgeBases(true)
      return
    }

    void loadKgKnowledgeBases(true)
  }

  function closePanel(): void {
    activePanel.value = null
  }

  const isVectorFunctioncallEnabled = computed(
    () => workspaceStore.effectiveFunctionCallKnowledgeRetrievalEnabled
  )
  const isKgFunctioncallEnabled = computed(
    () => workspaceStore.effectiveFunctionCallKgRetrievalEnabled
  )

  const knowledgeRetrievalPolicy = computed<NormalChatKnowledgeRetrievalPolicyInput>(() => {
    const kb = currentVectorKnowledgeBase.value

    if (
      !workspaceStore.effectiveFunctionCallKnowledgeRetrievalEnabled ||
      vectorMode.value === 'disabled' ||
      !kb ||
      !kb.selected
    ) {
      return {
        mode: 'disabled',
        knowledgeBaseId: null,
        knowledgeBaseName: null,
        tables: [],
        documents: [],
        rerank: {
          enabled: vectorRerankEnabled.value,
          modelId: vectorRerankModelId.value,
          topN: vectorRerankTopN.value
        }
      }
    }

    const rerank = {
      enabled: vectorRerankEnabled.value,
      modelId: vectorRerankModelId.value,
      topN: vectorRerankTopN.value
    }

    if (vectorMode.value === 'global') {
      const tablesMap = new Map<string, NormalChatKnowledgeRetrievalPolicyTable>()
      for (const document of kb.documents) {
        for (const table of document.availableTables) {
          tablesMap.set(table.tableName, table)
        }
      }

      const tables = [...tablesMap.values()]
      if (tables.length === 0) {
        return {
          mode: 'disabled',
          knowledgeBaseId: null,
          knowledgeBaseName: null,
          tables: [],
          documents: [],
          rerank
        }
      }

      return {
        mode: 'global',
        knowledgeBaseId: kb.id,
        knowledgeBaseName: kb.name,
        tables,
        documents: [],
        rerank
      }
    }

    const documents = kb.documents
      .filter((document) => document.selected)
      .map((document) => {
        const selectedTables = document.embeddings.filter((embedding) => embedding.selected)
        const tables = (selectedTables.length > 0 ? selectedTables : document.availableTables).map(
          (table) => ({
            tableName: table.tableName,
            embeddingConfigId: table.embeddingConfigId,
            embeddingConfigName: table.embeddingConfigName,
            dimensions: table.dimensions
          })
        )

        return {
          fileKey: document.fileKey,
          fileName: document.fileName,
          tables
        }
      })
      .filter((document) => document.tables.length > 0)

    if (documents.length === 0) {
      return {
        mode: 'disabled',
        knowledgeBaseId: null,
        knowledgeBaseName: null,
        tables: [],
        documents: [],
        rerank
      }
    }

    const tablesMap = new Map<string, NormalChatKnowledgeRetrievalPolicyTable>()
    for (const document of documents) {
      for (const table of document.tables) {
        tablesMap.set(table.tableName, table)
      }
    }

    return {
      mode: 'documents',
      knowledgeBaseId: kb.id,
      knowledgeBaseName: kb.name,
      tables: [...tablesMap.values()],
      documents,
      rerank
    }
  })

  return {
    activePanel,
    vectorMode,
    vectorKnowledgeBases,
    vectorKnowledgeBasesLoading,
    vectorKnowledgeBasesError,
    vectorSelectedKnowledgeBaseId,
    vectorSelectedDocumentFileKeys,
    vectorSelectedEmbeddingConfigIdsByFileKey,
    vectorRerankEnabled,
    vectorRerankModelId,
    vectorRerankTopN,
    kgMode,
    kgKnowledgeBases,
    kgKnowledgeBasesLoading,
    kgKnowledgeBasesError,
    kgSelectedKnowledgeBaseId,
    kgSelectedGraphTableBases,
    currentVectorKnowledgeBase,
    currentKgKnowledgeBase,
    vectorTableNames,
    kgTableNames,
    knowledgeRetrievalPolicy,
    isVectorFunctioncallEnabled,
    isKgFunctioncallEnabled,
    loadVectorKnowledgeBases,
    loadVectorDocuments,
    loadVectorEmbeddings,
    toggleVectorKnowledgeBaseExpanded,
    toggleVectorDocumentExpanded,
    setVectorMode,
    selectVectorKnowledgeBase,
    toggleVectorDocumentSelection,
    toggleVectorEmbeddingSelection,
    loadKgKnowledgeBases,
    loadKgGraphTables,
    toggleKgKnowledgeBaseExpanded,
    setKgMode,
    selectKgKnowledgeBase,
    toggleKgGraphTableSelection,
    openPanel,
    closePanel
  }
})
