import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  KnowledgeDatabaseListDocumentEmbeddingsRequest,
  KnowledgeDatabaseListDocsRequest
} from '@preload/types'
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

function makeVectorTableName(embeddingConfigId: string, dimensions: number): string {
  const safeId = embeddingConfigId.replace(/[^a-zA-Z0-9_]/g, '_')
  return `emb_cfg_${safeId}_${dimensions}_chunks`
}

function unwrap<T>(response: { success: boolean; data?: T; error?: string }): T {
  if (!response.success || response.data == null) {
    throw new Error(response.error || '请求失败')
  }

  return response.data
}

function createVectorKnowledgeBaseNode(base: {
  id: number
  name: string
  description: string
  docCount: number
  chunkCount: number
  createdAt: string
  lastUpdated: string
  color: string
  icon: string
}): RetrievalConfigVectorKnowledgeBaseNode {
  return {
    ...base,
    expanded: false,
    selected: false,
    documentsLoaded: false,
    loadingDocuments: false,
    documents: []
  }
}

function createVectorDocumentNode(document: {
  id: string
  fileKey: string
  fileName: string
  fileType: string
  updatedAt: string
  embeddings: Array<{
    embeddingConfigId: string
    embeddingConfigName?: string
    dimensions: number
    status: 'pending' | 'running' | 'completed' | 'failed'
    chunkCount: number
    updatedAt: string
  }>
}): RetrievalConfigVectorDocumentNode {
  return {
    ...document,
    expanded: false,
    selected: false,
    embeddingsLoaded: false,
    loadingEmbeddings: false,
    embeddingCount: document.embeddings.length,
    embeddings: []
  }
}

function createKgKnowledgeBaseNode(base: {
  id: number
  name: string
  description: string
  databaseName: string
}): RetrievalConfigKgKnowledgeBaseNode {
  return {
    ...base,
    expanded: false,
    selected: false,
    graphTablesLoaded: false,
    loadingGraphTables: false,
    graphTables: []
  }
}

export const useNormalChatRetrievalConfigStore = defineStore('normal-chat-retrieval-config', () => {
  const workspaceStore = useNormalChatWorkspaceStore()

  const activePanel = ref<RetrievalConfigPanelId | null>(null)

  const vectorMode = ref<RetrievalConfigVectorMode>('global')
  const vectorKnowledgeBases = ref<RetrievalConfigVectorKnowledgeBaseNode[]>([])
  const vectorKnowledgeBasesLoading = ref(false)
  const vectorKnowledgeBasesError = ref<string | null>(null)
  const vectorSelectedKnowledgeBaseId = ref<number | null>(null)
  const vectorSelectedDocumentFileKeys = ref<string[]>([])
  const vectorSelectedEmbeddingConfigIdsByFileKey = ref<Record<string, string[]>>({})
  const vectorRerankEnabled = ref(false)
  const vectorRerankModelId = ref<string | null>(null)
  const vectorRerankTopN = ref(5)

  const kgMode = ref<RetrievalConfigKgMode>('global')
  const kgKnowledgeBases = ref<RetrievalConfigKgKnowledgeBaseNode[]>([])
  const kgKnowledgeBasesLoading = ref(false)
  const kgKnowledgeBasesError = ref<string | null>(null)
  const kgSelectedKnowledgeBaseId = ref<number | null>(null)
  const kgSelectedGraphTableBases = ref<string[]>([])

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
      return kb.selected ? [`kb:${kb.id}`] : []
    }

    const selectedTables: string[] = []
    for (const document of kb.documents) {
      if (!document.selected) {
        continue
      }
      for (const embedding of document.embeddings) {
        if (embedding.selected) {
          selectedTables.push(embedding.tableName)
        }
      }
    }

    return selectedTables
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

  async function loadVectorKnowledgeBases(forceRefresh = false): Promise<void> {
    if (vectorKnowledgeBasesLoading.value && !forceRefresh) {
      return
    }

    vectorKnowledgeBasesLoading.value = true
    vectorKnowledgeBasesError.value = null

    try {
      const response = await window.api.knowledgeDatabase.listKnowledgeBases()
      const list = unwrap(response).knowledgeBases
      vectorKnowledgeBases.value = list.map(createVectorKnowledgeBaseNode)

      if (vectorSelectedKnowledgeBaseId.value) {
        const exists = vectorKnowledgeBases.value.some(
          (item) => item.id === vectorSelectedKnowledgeBaseId.value
        )
        if (!exists) {
          vectorSelectedKnowledgeBaseId.value = null
        }
      }
    } catch (error) {
      vectorKnowledgeBasesError.value = error instanceof Error ? error.message : '获取知识库失败'
    } finally {
      vectorKnowledgeBasesLoading.value = false
    }
  }

  async function loadVectorDocuments(knowledgeBaseId: number, forceRefresh = false): Promise<void> {
    const knowledgeBase = vectorKnowledgeBases.value.find((item) => item.id === knowledgeBaseId)
    if (
      !knowledgeBase ||
      (knowledgeBase.documentsLoaded && !forceRefresh) ||
      knowledgeBase.loadingDocuments
    ) {
      return
    }

    knowledgeBase.loadingDocuments = true
    try {
      const documents = [] as RetrievalConfigVectorDocumentNode[]
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
        documents.push(...data.documents.map(createVectorDocumentNode))
        totalPages = Math.max(1, data.totalPages)
        page += 1
      }

      knowledgeBase.documents = documents
      knowledgeBase.documentsLoaded = true
    } catch (error) {
      vectorKnowledgeBasesError.value = error instanceof Error ? error.message : '加载文档失败'
    } finally {
      knowledgeBase.loadingDocuments = false
    }
  }

  async function loadVectorEmbeddings(
    knowledgeBaseId: number,
    fileKey: string,
    forceRefresh = false
  ): Promise<void> {
    const knowledgeBase = vectorKnowledgeBases.value.find((item) => item.id === knowledgeBaseId)
    const document = knowledgeBase?.documents.find((item) => item.fileKey === fileKey)
    if (
      !knowledgeBase ||
      !document ||
      (document.embeddingsLoaded && !forceRefresh) ||
      document.loadingEmbeddings
    ) {
      return
    }

    document.loadingEmbeddings = true
    try {
      const request: KnowledgeDatabaseListDocumentEmbeddingsRequest = { knowledgeBaseId, fileKey }
      const response = await window.api.knowledgeDatabase.listDocumentEmbeddings(request)
      const data = unwrap(response)
      document.embeddings = data.embeddings.map((embedding) => ({
        ...embedding,
        tableName: makeVectorTableName(embedding.embeddingConfigId, embedding.dimensions),
        selected:
          vectorSelectedEmbeddingConfigIdsByFileKey.value[fileKey]?.includes(
            embedding.embeddingConfigId
          ) ?? false
      }))
      document.embeddingsLoaded = true
    } catch (error) {
      vectorKnowledgeBasesError.value = error instanceof Error ? error.message : '加载嵌入表失败'
    } finally {
      document.loadingEmbeddings = false
    }
  }

  async function toggleVectorKnowledgeBaseExpanded(knowledgeBaseId: number): Promise<void> {
    const knowledgeBase = vectorKnowledgeBases.value.find((item) => item.id === knowledgeBaseId)
    if (!knowledgeBase) {
      return
    }

    knowledgeBase.expanded = !knowledgeBase.expanded
    if (knowledgeBase.expanded) {
      await loadVectorDocuments(knowledgeBaseId)
    }
  }

  async function toggleVectorDocumentExpanded(
    knowledgeBaseId: number,
    fileKey: string
  ): Promise<void> {
    const knowledgeBase = vectorKnowledgeBases.value.find((item) => item.id === knowledgeBaseId)
    const document = knowledgeBase?.documents.find((item) => item.fileKey === fileKey)
    if (!document) {
      return
    }

    document.expanded = !document.expanded
    if (document.expanded) {
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
      vectorKnowledgeBases.value.length > 0
    ) {
      vectorSelectedKnowledgeBaseId.value = vectorKnowledgeBases.value[0].id
    }
  }

  function selectVectorKnowledgeBase(knowledgeBaseId: number): void {
    vectorSelectedKnowledgeBaseId.value = knowledgeBaseId
    const knowledgeBase = vectorKnowledgeBases.value.find((item) => item.id === knowledgeBaseId)
    if (knowledgeBase) {
      knowledgeBase.selected = true
    }
    for (const item of vectorKnowledgeBases.value) {
      if (item.id !== knowledgeBaseId) {
        item.selected = false
      }
    }

    vectorSelectedDocumentFileKeys.value = []
    vectorSelectedEmbeddingConfigIdsByFileKey.value = {}
    void loadVectorDocuments(knowledgeBaseId)
  }

  function toggleVectorDocumentSelection(knowledgeBaseId: number, fileKey: string): void {
    const knowledgeBase = vectorKnowledgeBases.value.find((item) => item.id === knowledgeBaseId)
    const document = knowledgeBase?.documents.find((item) => item.fileKey === fileKey)
    if (!knowledgeBase || !document) {
      return
    }

    document.selected = !document.selected
    if (document.selected) {
      if (!vectorSelectedDocumentFileKeys.value.includes(fileKey)) {
        vectorSelectedDocumentFileKeys.value = [...vectorSelectedDocumentFileKeys.value, fileKey]
      }
      void loadVectorEmbeddings(knowledgeBaseId, fileKey)
    } else {
      vectorSelectedDocumentFileKeys.value = vectorSelectedDocumentFileKeys.value.filter(
        (item) => item !== fileKey
      )
      delete vectorSelectedEmbeddingConfigIdsByFileKey.value[fileKey]
      document.embeddings.forEach((embedding) => {
        embedding.selected = false
      })
    }
  }

  function toggleVectorEmbeddingSelection(
    knowledgeBaseId: number,
    fileKey: string,
    embeddingConfigId: string
  ): void {
    const knowledgeBase = vectorKnowledgeBases.value.find((item) => item.id === knowledgeBaseId)
    const document = knowledgeBase?.documents.find((item) => item.fileKey === fileKey)
    const embedding = document?.embeddings.find(
      (item) => item.embeddingConfigId === embeddingConfigId
    )
    if (!knowledgeBase || !document || !embedding) {
      return
    }

    embedding.selected = !embedding.selected
    const current = vectorSelectedEmbeddingConfigIdsByFileKey.value[fileKey] ?? []
    vectorSelectedEmbeddingConfigIdsByFileKey.value[fileKey] = embedding.selected
      ? [...current, embeddingConfigId]
      : current.filter((item) => item !== embeddingConfigId)
    document.selected = document.embeddings.some((item) => item.selected)
    knowledgeBase.selected = knowledgeBase.documents.some((item) => item.selected)
    vectorSelectedKnowledgeBaseId.value = knowledgeBase.selected ? knowledgeBaseId : null
  }

  async function loadKgKnowledgeBases(forceRefresh = false): Promise<void> {
    if (kgKnowledgeBasesLoading.value && !forceRefresh) {
      return
    }

    kgKnowledgeBasesLoading.value = true
    kgKnowledgeBasesError.value = null

    try {
      const response = await window.api.knowledgeDatabase.listKGKnowledgeBases()
      const list = unwrap(response).knowledgeBases
      kgKnowledgeBases.value = list.map(createKgKnowledgeBaseNode)
      if (kgSelectedKnowledgeBaseId.value) {
        const exists = kgKnowledgeBases.value.some(
          (item) => item.id === kgSelectedKnowledgeBaseId.value
        )
        if (!exists) {
          kgSelectedKnowledgeBaseId.value = null
        }
      }
    } catch (error) {
      kgKnowledgeBasesError.value = error instanceof Error ? error.message : '获取 KG 知识库失败'
    } finally {
      kgKnowledgeBasesLoading.value = false
    }
  }

  async function loadKgGraphTables(knowledgeBaseId: number, forceRefresh = false): Promise<void> {
    const knowledgeBase = kgKnowledgeBases.value.find((item) => item.id === knowledgeBaseId)
    if (
      !knowledgeBase ||
      (knowledgeBase.graphTablesLoaded && !forceRefresh) ||
      knowledgeBase.loadingGraphTables
    ) {
      return
    }

    knowledgeBase.loadingGraphTables = true
    try {
      const response = await window.api.knowledgeDatabase.getKGGraphTables(knowledgeBaseId)
      const list = unwrap(response)
      knowledgeBase.graphTables = list.map((item) => ({
        ...item,
        selected: kgSelectedGraphTableBases.value.includes(item.graphTableBase)
      }))
      knowledgeBase.graphTablesLoaded = true
    } catch (error) {
      kgKnowledgeBasesError.value = error instanceof Error ? error.message : '加载图谱表失败'
    } finally {
      knowledgeBase.loadingGraphTables = false
    }
  }

  async function toggleKgKnowledgeBaseExpanded(knowledgeBaseId: number): Promise<void> {
    const knowledgeBase = kgKnowledgeBases.value.find((item) => item.id === knowledgeBaseId)
    if (!knowledgeBase) {
      return
    }

    knowledgeBase.expanded = !knowledgeBase.expanded
    if (knowledgeBase.expanded) {
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
    const knowledgeBase = kgKnowledgeBases.value.find((item) => item.id === knowledgeBaseId)
    if (knowledgeBase) {
      knowledgeBase.selected = true
    }
    for (const item of kgKnowledgeBases.value) {
      if (item.id !== knowledgeBaseId) {
        item.selected = false
      }
    }

    kgSelectedGraphTableBases.value = []
    void loadKgGraphTables(knowledgeBaseId)
  }

  function toggleKgGraphTableSelection(knowledgeBaseId: number, graphTableBase: string): void {
    const knowledgeBase = kgKnowledgeBases.value.find((item) => item.id === knowledgeBaseId)
    const graphTable = knowledgeBase?.graphTables.find(
      (item) => item.graphTableBase === graphTableBase
    )
    if (!knowledgeBase || !graphTable) {
      return
    }

    graphTable.selected = !graphTable.selected
    kgSelectedGraphTableBases.value = graphTable.selected
      ? [...kgSelectedGraphTableBases.value, graphTableBase]
      : kgSelectedGraphTableBases.value.filter((item) => item !== graphTableBase)
    knowledgeBase.selected = knowledgeBase.graphTables.some((item) => item.selected)
    kgSelectedKnowledgeBaseId.value = knowledgeBase.selected ? knowledgeBaseId : null
  }

  function openPanel(panel: RetrievalConfigPanelId): void {
    if (activePanel.value === panel) {
      activePanel.value = null
      return
    }

    activePanel.value = panel
    if (panel === 'vector') {
      void loadVectorKnowledgeBases()
      return
    }

    void loadKgKnowledgeBases()
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
