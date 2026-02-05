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

  // ===== Computed =====
  const selectedDocuments = computed(() => {
    const result: { kbId: number; kbName: string; doc: SourceDocument }[] = []
    for (const kb of knowledgeBases.value) {
      for (const doc of kb.documents) {
        if (doc.selected) {
          result.push({ kbId: kb.id, kbName: kb.name, doc })
        }
      }
    }
    return result
  })

  const selectedDocumentIds = computed(() => {
    return selectedDocuments.value.map((item) => item.doc.id)
  })

  const hasSelection = computed(() => selectedDocuments.value.length > 0)

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
   * 加载所有知识库列表
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
      // 展开时触发懒加载
      loadDocuments(kbId)
    }
  }

  /**
   * 判断知识库是否展开
   */
  function isKnowledgeBaseExpanded(kbId: number): boolean {
    return expandedKbIds.value.has(kbId)
  }

  /**
   * 判断知识库下所有文档是否全选
   */
  function isKnowledgeBaseSelected(kbId: number): boolean {
    const kb = knowledgeBases.value.find((k) => k.id === kbId)
    if (!kb || kb.documents.length === 0) return false
    return kb.documents.every((doc) => doc.selected)
  }

  /**
   * 切换知识库选择状态（全选/取消全选该知识库下的所有文档）
   */
  function toggleKnowledgeBaseSelection(kbId: number): void {
    const kb = knowledgeBases.value.find((k) => k.id === kbId)
    if (!kb) return

    const allSelected = isKnowledgeBaseSelected(kbId)
    kb.documents.forEach((doc) => {
      doc.selected = !allSelected
    })
  }

  /**
   * 切换单个文档选择状态
   */
  function toggleDocumentSelection(kbId: number, docId: string): void {
    const kb = knowledgeBases.value.find((k) => k.id === kbId)
    if (!kb) return

    const doc = kb.documents.find((d) => d.id === docId)
    if (doc) {
      doc.selected = !doc.selected
    }
  }

  /**
   * 全选所有文档
   */
  function selectAll(): void {
    knowledgeBases.value.forEach((kb) => {
      kb.documents.forEach((doc) => {
        doc.selected = true
      })
    })
  }

  /**
   * 清空所有选择
   */
  function deselectAll(): void {
    knowledgeBases.value.forEach((kb) => {
      kb.documents.forEach((doc) => {
        doc.selected = false
      })
    })
  }

  /**
   * 刷新数据（重新加载知识库列表）
   */
  async function refresh(): Promise<void> {
    // 重置文档加载状态
    knowledgeBases.value.forEach((kb) => {
      kb.documentsLoaded = false
      kb.documents = []
    })

    await loadKnowledgeBases()

    // 重新加载已展开的知识库的文档
    for (const kbId of expandedKbIds.value) {
      await loadDocuments(kbId)
    }
  }

  return {
    // state
    knowledgeBases,
    isLoading,
    error,
    connectionState,
    expandedKbIds,

    // computed
    selectedDocuments,
    selectedDocumentIds,
    hasSelection,

    // actions
    checkConnection,
    loadKnowledgeBases,
    loadDocuments,
    toggleKnowledgeBase,
    isKnowledgeBaseExpanded,
    isKnowledgeBaseSelected,
    toggleKnowledgeBaseSelection,
    toggleDocumentSelection,
    selectAll,
    deselectAll,
    refresh
  }
})
