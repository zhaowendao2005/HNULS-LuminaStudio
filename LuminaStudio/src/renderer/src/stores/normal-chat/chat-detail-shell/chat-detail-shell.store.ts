import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { NormalChatConversationStreamEvent } from '@preload/types'
import { NormalChatConversationDatasource } from '../conversation/conversation.datasource'
import { ChatDetailShellDatasource } from './chat-detail-shell.datasource'
import type {
  ChatDetailDataViewMode,
  ChatDetailShellDocGroup,
  ChatDetailShellDocGroupId,
  ChatDetailShellOpenPayload,
  ChatDetailShellRecord,
  ChatDetailShellSnapshot
} from './chat-detail-shell.types'

const datasource = new ChatDetailShellDatasource()

function createEmptySnapshot(): ChatDetailShellSnapshot {
  return {
    visible: false,
    requestId: '',
    messageId: '',
    currentPage: 'overview',
    selectedCallId: '',
    selectedFunctioncallId: '',
    selectedGroupId: 'request',
    selectedDocId: '',
    requestViewMode: 'json',
    responseViewMode: 'json',
    schemaViewMode: 'json',
    loading: false,
    errorText: '',
    detailByRequestId: {}
  }
}

export const useNormalChatChatDetailShellStore = defineStore(
  'normal-chat-chat-detail-shell',
  () => {
    const snapshot = ref<ChatDetailShellSnapshot>(createEmptySnapshot())
    let disposeStream: (() => void) | null = null

    const detail = computed<ChatDetailShellRecord | null>(() => {
      return snapshot.value.detailByRequestId[snapshot.value.requestId] ?? null
    })

    const dialogTitle = computed(() => {
      return detail.value ? `${detail.value.assistantName} / ${detail.value.topicTitle}` : ''
    })

    const hasLlmCallDetails = computed(() => detail.value?.hasLlmCallDetails ?? false)
    const llmCallItems = computed(() => detail.value?.calls ?? [])
    const functioncallItems = computed(() => detail.value?.functioncalls ?? [])

    const selectedCallItem = computed(() => {
      if (!hasLlmCallDetails.value) {
        return null
      }

      return (
        llmCallItems.value.find((item) => item.id === snapshot.value.selectedCallId) ??
        llmCallItems.value[0] ??
        null
      )
    })
    const selectedFunctioncallItem = computed(() => {
      return (
        functioncallItems.value.find((item) => item.id === snapshot.value.selectedFunctioncallId) ??
        functioncallItems.value[0] ??
        null
      )
    })

    const selectedGroups = computed(() => selectedCallItem.value?.groups ?? [])
    const selectedGroup = computed(() => {
      return (
        selectedGroups.value.find((group) => group.id === snapshot.value.selectedGroupId) ??
        selectedGroups.value[0] ??
        null
      )
    })

    const selectedDoc = computed(() => {
      return (
        selectedGroup.value?.items.find((item) => item.id === snapshot.value.selectedDocId) ??
        selectedGroup.value?.items[0] ??
        null
      )
    })

    const breadcrumbText = computed(() => {
      if (snapshot.value.currentPage === 'functioncall-overview') {
        return 'Overview / Functioncall Records'
      }
      if (snapshot.value.currentPage === 'functioncall-detail') {
        return `Overview / Functioncall Records / ${selectedFunctioncallItem.value?.title ?? 'Functioncall Detail'}`
      }
      if (!hasLlmCallDetails.value) {
        return 'Overview / LLM Call Unavailable'
      }
      return `Overview / ${selectedCallItem.value?.title ?? 'LLM Call Detail'} / ${selectedGroup.value?.title ?? ''}`
    })

    function getDefaultGroup(groups: ChatDetailShellDocGroup[]): ChatDetailShellDocGroup | null {
      return groups[0] ?? null
    }

    function setActiveDocument(docId: string, groupId: ChatDetailShellDocGroupId): void {
      snapshot.value.selectedGroupId = groupId
      snapshot.value.selectedDocId = docId
    }

    function selectFirstDocumentInGroup(groupId: ChatDetailShellDocGroupId): void {
      const group =
        selectedGroups.value.find((item) => item.id === groupId) ??
        getDefaultGroup(selectedGroups.value)
      if (!group) {
        snapshot.value.selectedGroupId = groupId
        snapshot.value.selectedDocId = ''
        return
      }
      setActiveDocument(group.items[0]?.id ?? '', group.id)
    }

    function patchResponseStreamText(modelCallId: string, delta: string): void {
      const requestId = snapshot.value.requestId
      if (!requestId) {
        return
      }

      const detailRecord = snapshot.value.detailByRequestId[requestId]
      if (!detailRecord) {
        return
      }

      const nextCalls = detailRecord.calls.map((call) => {
        if (call.id !== modelCallId) {
          return call
        }

        return {
          ...call,
          groups: call.groups.map((group) => {
            if (group.id !== 'response') {
              return group
            }

            return {
              ...group,
              items: group.items.map((item) => {
                if (item.id !== 'response.stream_text') {
                  return item
                }

                return {
                  ...item,
                  payload: `${typeof item.payload === 'string' ? item.payload : ''}${delta}`
                }
              })
            }
          })
        }
      })

      snapshot.value.detailByRequestId = {
        ...snapshot.value.detailByRequestId,
        [requestId]: {
          ...detailRecord,
          calls: nextCalls
        }
      }
    }

    function handleRuntimeEvent(event: NormalChatConversationStreamEvent): void {
      if (!snapshot.value.visible || event.requestId !== snapshot.value.requestId) {
        return
      }

      if (event.type === 'assistant-text-delta') {
        patchResponseStreamText(event.modelCallId, event.delta)
        return
      }

      if (
        event.type === 'prompt-built' ||
        event.type === 'assistant-part-upsert' ||
        event.type === 'action-validated' ||
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

    async function loadCurrentDetail(): Promise<ChatDetailShellRecord> {
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

    function normalizeCurrentPage(nextPage: ChatDetailShellSnapshot['currentPage']): void {
      if (nextPage === 'llm-call' && !hasLlmCallDetails.value) {
        snapshot.value.currentPage = 'overview'
        snapshot.value.selectedCallId = ''
        snapshot.value.selectedGroupId = 'request'
        snapshot.value.selectedDocId = ''
        return
      }

      snapshot.value.currentPage = nextPage
    }

    async function openDialog(payload: ChatDetailShellOpenPayload): Promise<void> {
      snapshot.value.visible = true
      snapshot.value.requestId = payload.requestId
      snapshot.value.messageId = payload.messageId
      snapshot.value.currentPage = payload.page ?? 'overview'
      snapshot.value.selectedCallId = payload.selectedCallId ?? ''
      snapshot.value.selectedFunctioncallId = payload.selectedFunctioncallId ?? ''
      snapshot.value.selectedGroupId = 'request'
      snapshot.value.selectedDocId = ''
      snapshot.value.requestViewMode = 'json'
      snapshot.value.responseViewMode = 'json'
      snapshot.value.schemaViewMode = 'json'
      snapshot.value.errorText = ''

      const detailRecord = await loadCurrentDetail()
      normalizeCurrentPage(snapshot.value.currentPage)
      if (snapshot.value.currentPage === 'functioncall-overview') {
        snapshot.value.selectedFunctioncallId = detailRecord.functioncalls[0]?.id ?? ''
        return
      }
      if (snapshot.value.currentPage === 'functioncall-detail') {
        snapshot.value.selectedFunctioncallId =
          snapshot.value.selectedFunctioncallId || detailRecord.functioncalls[0]?.id || ''
        return
      }
      if (!detailRecord.hasLlmCallDetails) {
        snapshot.value.selectedCallId = ''
        snapshot.value.selectedGroupId = 'request'
        snapshot.value.selectedDocId = ''
        return
      }

      snapshot.value.selectedCallId =
        snapshot.value.selectedCallId || detailRecord.calls[0]?.id || ''
      selectFirstDocumentInGroup('request')
    }

    function closeDialog(): void {
      snapshot.value.visible = false
      snapshot.value.selectedCallId = ''
      snapshot.value.selectedFunctioncallId = ''
      snapshot.value.currentPage = 'overview'
      snapshot.value.loading = false
      snapshot.value.errorText = ''
      snapshot.value.selectedGroupId = 'request'
      snapshot.value.selectedDocId = ''
    }

    function openCallDetail(callId: string): void {
      if (!hasLlmCallDetails.value) {
        snapshot.value.currentPage = 'overview'
        snapshot.value.selectedCallId = ''
        snapshot.value.selectedGroupId = 'request'
        snapshot.value.selectedDocId = ''
        return
      }

      snapshot.value.selectedCallId = callId
      snapshot.value.currentPage = 'llm-call'
      selectFirstDocumentInGroup('request')
    }

    function openFunctioncallOverview(): void {
      snapshot.value.currentPage = 'functioncall-overview'
    }

    function openFunctioncallDetail(callId: string): void {
      snapshot.value.selectedFunctioncallId = callId
      snapshot.value.currentPage = 'functioncall-detail'
    }

    function goToOverview(): void {
      snapshot.value.currentPage = 'overview'
      if (!hasLlmCallDetails.value) {
        snapshot.value.selectedCallId = ''
        snapshot.value.selectedGroupId = 'request'
        snapshot.value.selectedDocId = ''
      }
    }

    function setSelectedGroup(groupId: ChatDetailShellDocGroupId): void {
      selectFirstDocumentInGroup(groupId)
    }

    function setRequestViewMode(mode: ChatDetailDataViewMode): void {
      snapshot.value.requestViewMode = mode
    }

    function setResponseViewMode(mode: ChatDetailDataViewMode): void {
      snapshot.value.responseViewMode = mode
    }

    function setSchemaViewMode(mode: ChatDetailDataViewMode): void {
      snapshot.value.schemaViewMode = mode
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
      hasLlmCallDetails,
      llmCallItems,
      functioncallItems,
      selectedCallItem,
      selectedFunctioncallItem,
      selectedGroups,
      selectedGroup,
      selectedDoc,
      breadcrumbText,
      initialize,
      loadCurrentDetail,
      openDialog,
      closeDialog,
      openCallDetail,
      openFunctioncallOverview,
      openFunctioncallDetail,
      goToOverview,
      setActiveDocument,
      setSelectedGroup,
      setRequestViewMode,
      setResponseViewMode,
      setSchemaViewMode,
      clearTurnDetail
    }
  }
)
