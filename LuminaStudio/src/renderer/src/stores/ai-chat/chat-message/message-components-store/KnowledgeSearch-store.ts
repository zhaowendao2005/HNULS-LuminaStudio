import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface KnowledgeSearchDetailPayload {
  scope: any
  hit: any
  scopeIdx: number
  hitIdx: number
}

export const useKnowledgeSearchMessageStore = defineStore(
  'chat-message-component-knowledge-search',
  () => {
    const showDetailDialog = ref(false)
    const selectedDetail = ref<KnowledgeSearchDetailPayload | null>(null)

    function openDetailDialog(payload: KnowledgeSearchDetailPayload): void {
      selectedDetail.value = payload
      showDetailDialog.value = true
    }

    function closeDetailDialog(): void {
      showDetailDialog.value = false
    }

    function resetDetailDialog(): void {
      selectedDetail.value = null
      showDetailDialog.value = false
    }

    return {
      showDetailDialog,
      selectedDetail,
      openDetailDialog,
      closeDetailDialog,
      resetDetailDialog
    }
  }
)
