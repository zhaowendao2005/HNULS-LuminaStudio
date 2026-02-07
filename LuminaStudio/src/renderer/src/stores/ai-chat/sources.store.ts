import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { SourcesDataSource } from './sources.datasource'
import type { SourceKnowledgeBase, SourceDocument, ConnectionState } from './sources.types'

export const useSourcesStore = defineStore('ai-chat-sources', () => {
  // ===== State =====
  const knowledgeBases = ref<SourceKnowledgeBase[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const connectionState = ref<ConnectionState>({
    connected: false,
    checking: false
  })

  // 展开状态（UI 状态，存储在 store 中以便跨组件共享）
  const expandedKbIds = ref<Set<number>>(new Set())

  // 文档勾选状态（按知识库分组）
  const documentSelections = ref<Record<number, Set<string>>>({})

  // 每个知识库的全局表选择（仅为 UI 辅助状态）
  const knowledgeBaseGlobalEmbedding = ref<
    Record<number, { configId: string; dimensions: number } | null>
  >({})

  // ===== Computed =====
  const selectedDocuments = computed(() => {
    const result: Array<{
      kbId: number
      kbName: string
      doc: SourceDocument
      embedding: { configId: string; dimensions: number }
    }> = []

    for (const kb of knowledgeBases.value) {
      const kbSelections = documentSelections.value[kb.id] || new Set()
      for (const doc of kb.documents) {
        // 只有文档被勾选且已选择 embedding 才算有效
        if (kbSelections.has(doc.fileKey) && doc.selectedEmbedding) {
          result.push({ kbId: kb.id, kbName: kb.name, doc, embedding: doc.selectedEmbedding })
        }
      }
    }

    return result
  })

  // 兼容旧调用：返回 fileKey 列表（比 id 更稳定）
  const selectedDocumentIds = computed(() => {
    return selectedDocuments.value.map((item) => item.doc.fileKey)
  })

  const hasSelection = computed(() => selectedDocuments.value.length > 0)

  /**
   * 获取指定知识库下所有可用的 embedding 配置（去重）
   */
  const getAvailableEmbeddings = (kbId: number) => {
    const kb = knowledgeBases.value.find((k) => k.id === kbId)
    if (!kb) return []

    const map = new Map<string, { configId: string; dimensions: number }>()
    for (const doc of kb.documents) {
      for (const emb of doc.embeddings) {
        const key = `${emb.configId}::${emb.dimensions}`
        if (!map.has(key)) {
          map.set(key, { configId: emb.configId, dimensions: emb.dimensions })
        }
      }
    }
    return Array.from(map.values())
  }

  /**
   * 获取知识库当前的全局表状态
   */
  const getKnowledgeBaseEmbeddingState = (kbId: number) => {
    const kb = knowledgeBases.value.find((k) => k.id === kbId)
    if (!kb) return { unified: false, embedding: null }

    const kbSelections = documentSelections.value[kbId] || new Set()
    const selectedDocs = kb.documents.filter(
      (doc) => kbSelections.has(doc.fileKey) && doc.selectedEmbedding
    )

    if (selectedDocs.length === 0) return { unified: false, embedding: null }

    const first = selectedDocs[0].selectedEmbedding!
    const allSame = selectedDocs.every(
      (doc) =>
        doc.selectedEmbedding?.configId === first.configId &&
        doc.selectedEmbedding?.dimensions === first.dimensions
    )

    return {
      unified: allSame,
      embedding: allSame ? first : null
    }
  }

  // ===== Actions =====

  /**
   * 检查与外部服务的连接状态
   */
  async function checkConnection(): Promise<void> {
    connectionState.value.checking = true
    try {
      const state = await SourcesDataSource.checkConnection()
      connectionState.value = state
    } catch (err) {
      connectionState.value = {
        connected: false,
        error: err instanceof Error ? err.message : 'Connection check failed',
        checking: false
      }
    }
  }

  /**
   * 加载所有知识库列表（同时加载所有文档）
   */
  async function loadKnowledgeBases(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const list = await SourcesDataSource.listKnowledgeBases()
      knowledgeBases.value = list

      // 默认展开第一个知识库
      if (list.length > 0 && expandedKbIds.value.size === 0) {
        expandedKbIds.value.add(list[0].id)
      }

      // 立即加载所有知识库的文档
      await Promise.all(list.map((kb) => loadDocuments(kb.id)))
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load knowledge bases'
      knowledgeBases.value = []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 加载指定知识库的文档列表（懒加载）
   */
  async function loadDocuments(kbId: number): Promise<void> {
    const kb = knowledgeBases.value.find((k) => k.id === kbId)
    if (!kb) return

    // 如果已经加载过，不重复加载
    if (kb.documentsLoaded) return

    kb.documentsLoading = true

    try {
      const result = await SourcesDataSource.listDocuments({
        knowledgeBaseId: kbId,
        page: 1,
        pageSize: 200 // 一次性加载较多文档
      })

      kb.documents = result.documents
      kb.documentsLoaded = true
    } catch (err) {
      console.error(`Failed to load documents for kb ${kbId}:`, err)
      kb.documents = []
    } finally {
      kb.documentsLoading = false
    }
  }

  /**
   * 切换知识库展开/折叠状态
   */
  function toggleKnowledgeBase(kbId: number): void {
    if (expandedKbIds.value.has(kbId)) {
      expandedKbIds.value.delete(kbId)
    } else {
      expandedKbIds.value.add(kbId)
    }
  }

  /**
   * 判断知识库是否展开
   */
  function isKnowledgeBaseExpanded(kbId: number): boolean {
    return expandedKbIds.value.has(kbId)
  }

  /**
   * 判断知识库下所有文档是否全选（复选框状态）
   */
  function isKnowledgeBaseSelected(kbId: number): boolean {
    const kb = knowledgeBases.value.find((k) => k.id === kbId)
    if (!kb || kb.documents.length === 0) return false

    const kbSelections = documentSelections.value[kbId] || new Set()
    return kb.documents.every((doc) => kbSelections.has(doc.fileKey))
  }

  /**
   * 判断知识库是否半选（部分文档被勾选）
   */
  function isKnowledgeBaseIndeterminate(kbId: number): boolean {
    const kb = knowledgeBases.value.find((k) => k.id === kbId)
    if (!kb || kb.documents.length === 0) return false

    const kbSelections = documentSelections.value[kbId] || new Set()
    const selectedCount = kb.documents.filter((doc) => kbSelections.has(doc.fileKey)).length

    return selectedCount > 0 && selectedCount < kb.documents.length
  }

  /**
   * 判断文档是否被勾选
   */
  function isDocumentSelected(kbId: number, fileKey: string): boolean {
    const kbSelections = documentSelections.value[kbId] || new Set()
    return kbSelections.has(fileKey)
  }

  function setSelectedEmbedding(
    doc: SourceDocument,
    embedding: { configId: string; dimensions: number } | null
  ): void {
    // 清空所有高亮
    doc.embeddings.forEach((e) => {
      e.selected = false
    })

    doc.selectedEmbedding = embedding
    doc.hasSelectedEmbedding = !!embedding

    if (!embedding) return

    const match = doc.embeddings.find(
      (e) => e.configId === embedding.configId && e.dimensions === embedding.dimensions
    )
    if (match) {
      match.selected = true
    }
  }

  function selectDefaultEmbedding(doc: SourceDocument): void {
    const preferred = doc.embeddings.find((e) => e.isDefault) || doc.embeddings[0]
    if (!preferred) {
      setSelectedEmbedding(doc, null)
      return
    }
    setSelectedEmbedding(doc, { configId: preferred.configId, dimensions: preferred.dimensions })
  }

  /**
   * 切换知识库级复选框（全选/反选所有文档）
   */
  function toggleKnowledgeBaseSelection(kbId: number): void {
    const kb = knowledgeBases.value.find((k) => k.id === kbId)
    if (!kb || kb.documents.length === 0) return

    if (!documentSelections.value[kbId]) {
      documentSelections.value[kbId] = new Set()
    }

    const kbSelections = documentSelections.value[kbId]
    const allSelected = kb.documents.every((doc) => kbSelections.has(doc.fileKey))

    if (allSelected) {
      // 全部取消勾选
      for (const doc of kb.documents) {
        kbSelections.delete(doc.fileKey)
        setSelectedEmbedding(doc, null)
      }
    } else {
      // 全部勾选并自动选择默认 embedding
      for (const doc of kb.documents) {
        kbSelections.add(doc.fileKey)
        if (!doc.selectedEmbedding) {
          selectDefaultEmbedding(doc)
        }
      }
    }
  }

  /**
   * 切换文档级复选框
   */
  function toggleDocumentSelection(kbId: number, docId: string): void {
    const kb = knowledgeBases.value.find((k) => k.id === kbId)
    if (!kb) return

    const doc = kb.documents.find((d) => d.id === docId)
    if (!doc) return

    if (!documentSelections.value[kbId]) {
      documentSelections.value[kbId] = new Set()
    }

    const kbSelections = documentSelections.value[kbId]

    if (kbSelections.has(doc.fileKey)) {
      // 取消勾选
      kbSelections.delete(doc.fileKey)
      setSelectedEmbedding(doc, null)
    } else {
      // 勾选并自动选择默认 embedding
      kbSelections.add(doc.fileKey)
      selectDefaultEmbedding(doc)
    }
  }

  /**
   * 切换文档展开/折叠状态
   */
  function toggleDocumentExpanded(kbId: number, docId: string): void {
    const kb = knowledgeBases.value.find((k) => k.id === kbId)
    if (!kb) return

    const doc = kb.documents.find((d) => d.id === docId)
    if (!doc) return

    doc.expanded = !doc.expanded
  }

  /**
   * 点击嵌入子节点：选择该嵌入版本（高亮）
   */
  function selectEmbeddingVersion(
    kbId: number,
    docId: string,
    embedding: { configId: string; dimensions: number }
  ): void {
    const kb = knowledgeBases.value.find((k) => k.id === kbId)
    if (!kb) return

    const doc = kb.documents.find((d) => d.id === docId)
    if (!doc) return

    setSelectedEmbedding(doc, embedding)
  }

  /**
   * 批量设置知识库下已勾选文档的 embedding
   */
  function setKnowledgeBaseGlobalEmbedding(
    kbId: number,
    embedding: { configId: string; dimensions: number }
  ): void {
    const kb = knowledgeBases.value.find((k) => k.id === kbId)
    if (!kb) return

    const kbSelections = documentSelections.value[kbId] || new Set()

    for (const doc of kb.documents) {
      // 只处理已勾选的文档
      if (!kbSelections.has(doc.fileKey)) continue

      // 检查该文档是否有此配置
      const hasConfig = doc.embeddings.some(
        (e) => e.configId === embedding.configId && e.dimensions === embedding.dimensions
      )

      if (hasConfig) {
        setSelectedEmbedding(doc, embedding)
      }
    }

    // 更新知识库的全局表状态（UI 辅助）
    knowledgeBaseGlobalEmbedding.value[kbId] = embedding
  }

  /**
   * 全选所有文档（选择每个文档的推荐配置）
   */
  function selectAll(): void {
    knowledgeBases.value.forEach((kb) => {
      if (!documentSelections.value[kb.id]) {
        documentSelections.value[kb.id] = new Set()
      }
      const kbSelections = documentSelections.value[kb.id]

      kb.documents.forEach((doc) => {
        kbSelections.add(doc.fileKey)
        selectDefaultEmbedding(doc)
      })
    })
  }

  /**
   * 清空所有选择
   */
  function deselectAll(): void {
    knowledgeBases.value.forEach((kb) => {
      if (documentSelections.value[kb.id]) {
        documentSelections.value[kb.id].clear()
      }

      kb.documents.forEach((doc) => {
        setSelectedEmbedding(doc, null)
      })
    })
  }

  /**
   * 刷新数据（重新加载知识库列表和所有文档）
   */
  async function refresh(): Promise<void> {
    // 重置文档加载状态
    knowledgeBases.value.forEach((kb) => {
      kb.documentsLoaded = false
      kb.documents = []
    })

    // loadKnowledgeBases 已经包含加载所有文档
    await loadKnowledgeBases()
  }

  return {
    // state
    knowledgeBases,
    isLoading,
    error,
    connectionState,
    expandedKbIds,
    documentSelections,

    // computed
    selectedDocuments,
    selectedDocumentIds,
    hasSelection,

    // computed functions
    getAvailableEmbeddings,
    getKnowledgeBaseEmbeddingState,

    // actions
    checkConnection,
    loadKnowledgeBases,
    loadDocuments,
    toggleKnowledgeBase,
    isKnowledgeBaseExpanded,
    isKnowledgeBaseSelected,
    isKnowledgeBaseIndeterminate,
    isDocumentSelected,
    toggleKnowledgeBaseSelection,
    toggleDocumentSelection,
    toggleDocumentExpanded,
    selectEmbeddingVersion,
    setKnowledgeBaseGlobalEmbedding,
    selectAll,
    deselectAll,
    refresh
  }
})
