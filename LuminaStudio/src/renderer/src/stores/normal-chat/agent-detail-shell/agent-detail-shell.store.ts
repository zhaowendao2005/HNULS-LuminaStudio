import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { NormalChatConversationStreamEvent } from '@preload/types'
import { NormalChatConversationDatasource } from '../conversation/conversation.datasource'
import { AgentDetailShellDatasource } from './agent-detail-shell.datasource'
import type {
  AgentDetailShellOpenPayload,
  AgentDetailShellRecord,
  AgentDetailShellSnapshot
} from './agent-detail-shell.types'

const datasource = new AgentDetailShellDatasource()

function createEmptySnapshot(): AgentDetailShellSnapshot {
  return {
    visible: false,
    requestId: '',
    messageId: '',
    loading: false,
    errorText: '',
    detailByRequestId: {}
  }
}

export const useNormalChatAgentDetailShellStore = defineStore(
  'normal-chat-agent-detail-shell',
  () => {
    const snapshot = ref<AgentDetailShellSnapshot>(createEmptySnapshot())
    let disposeStream: (() => void) | null = null

    const detail = computed<AgentDetailShellRecord | null>(() => {
      return snapshot.value.detailByRequestId[snapshot.value.requestId] ?? null
    })

    const dialogTitle = computed(() => {
      return detail.value ? `${detail.value.assistantName} / ${detail.value.topicTitle}` : ''
    })

    const tree = computed(() => detail.value?.tree ?? null)
    const summary = computed(() => detail.value?.summary ?? null)
    const rootNode = computed(() => {
      if (!tree.value?.rootAgentId) {
        return null
      }

      return tree.value.agents[tree.value.rootAgentId] ?? null
    })

    function handleRuntimeEvent(event: NormalChatConversationStreamEvent): void {
      if (!snapshot.value.visible || event.requestId !== snapshot.value.requestId) {
        return
      }

      if (
        event.type === 'status' ||
        event.type === 'prompt-built' ||
        event.type === 'assistant-part-upsert' ||
        event.type === 'finish'
      ) {
        void loadCurrentDetail()
      }
    }

    function ensureStreamSubscription(): void {
      if (disposeStream) {
        return
      }

      disposeStream = NormalChatConversationDatasource.onStream(handleRuntimeEvent)
    }

    async function initialize(): Promise<void> {
      snapshot.value = await datasource.loadSnapshot()
      ensureStreamSubscription()
    }

    async function loadCurrentDetail(): Promise<AgentDetailShellRecord> {
      const requestId = snapshot.value.requestId
      snapshot.value.loading = true
      snapshot.value.errorText = ''

      try {
        const detailRecord = await datasource.getConversationDetail(requestId)
        snapshot.value.detailByRequestId = {
          ...snapshot.value.detailByRequestId,
          [detailRecord.requestId]: detailRecord
        }
        snapshot.value.requestId = detailRecord.requestId
        snapshot.value.messageId = detailRecord.messageId
        return detailRecord
      } finally {
        snapshot.value.loading = false
      }
    }

    async function openDialog(payload: AgentDetailShellOpenPayload): Promise<void> {
      snapshot.value.visible = true
      snapshot.value.requestId = payload.requestId
      snapshot.value.messageId = payload.messageId
      snapshot.value.errorText = ''
      await loadCurrentDetail()
    }

    function closeDialog(): void {
      snapshot.value.visible = false
      snapshot.value.loading = false
      snapshot.value.errorText = ''
    }

    function clearTurnDetail(requestId: string): void {
      if (snapshot.value.requestId === requestId) {
        closeDialog()
      }
    }

    return {
      snapshot,
      detail,
      dialogTitle,
      tree,
      summary,
      rootNode,
      initialize,
      loadCurrentDetail,
      openDialog,
      closeDialog,
      clearTurnDetail
    }
  }
)
