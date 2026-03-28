import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { ChatDetailShellDatasource } from './chat-detail-shell.datasource'
import type {
  ChatDetailDataViewMode,
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
    requestViewMode: 'json',
    responseViewMode: 'json',
    loading: false,
    errorText: '',
    detailByRequestId: {}
  }
}

export const useNormalChatChatDetailShellStore = defineStore(
  'normal-chat-chat-detail-shell',
  () => {
    const snapshot = ref<ChatDetailShellSnapshot>(createEmptySnapshot())

    const detail = computed<ChatDetailShellRecord | null>(() => {
      return snapshot.value.detailByRequestId[snapshot.value.requestId] ?? null
    })

    const dialogTitle = computed(() => {
      return detail.value ? `${detail.value.assistantName} / ${detail.value.topicTitle}` : ''
    })

    const llmCallItems = computed(() => detail.value?.calls ?? [])

    const selectedCallItem = computed(() => {
      return (
        llmCallItems.value.find((item) => item.id === snapshot.value.selectedCallId) ??
        llmCallItems.value[0] ??
        null
      )
    })

    const breadcrumbText = computed(() => {
      return `Overview / ${selectedCallItem.value?.title ?? 'LLM Call Detail'}`
    })

    const formattedSelectedCallRequest = computed(() => {
      return formatPayload(
        selectedCallItem.value?.requestPayload ?? {},
        snapshot.value.requestViewMode
      )
    })

    const formattedSelectedCallResponse = computed(() => {
      return formatPayload(
        selectedCallItem.value?.responsePayload ?? {},
        snapshot.value.responseViewMode
      )
    })

    async function initialize(): Promise<void> {
      snapshot.value = await datasource.loadSnapshot()
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

    async function openDialog(payload: ChatDetailShellOpenPayload): Promise<void> {
      snapshot.value.visible = true
      snapshot.value.requestId = payload.requestId
      snapshot.value.messageId = payload.messageId
      snapshot.value.currentPage = 'overview'
      snapshot.value.selectedCallId = ''
      snapshot.value.requestViewMode = 'json'
      snapshot.value.responseViewMode = 'json'
      snapshot.value.errorText = ''

      const detailRecord = await loadCurrentDetail()
      snapshot.value.selectedCallId = detailRecord.calls[0]?.id ?? ''
    }

    function closeDialog(): void {
      snapshot.value.visible = false
      snapshot.value.selectedCallId = ''
      snapshot.value.currentPage = 'overview'
      snapshot.value.loading = false
      snapshot.value.errorText = ''
    }

    function openCallDetail(callId: string): void {
      snapshot.value.selectedCallId = callId
      snapshot.value.currentPage = 'llm-call'
    }

    function goToOverview(): void {
      snapshot.value.currentPage = 'overview'
    }

    function setRequestViewMode(mode: ChatDetailDataViewMode): void {
      snapshot.value.requestViewMode = mode
    }

    function setResponseViewMode(mode: ChatDetailDataViewMode): void {
      snapshot.value.responseViewMode = mode
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
      llmCallItems,
      selectedCallItem,
      breadcrumbText,
      formattedSelectedCallRequest,
      formattedSelectedCallResponse,
      initialize,
      loadCurrentDetail,
      openDialog,
      closeDialog,
      openCallDetail,
      goToOverview,
      setRequestViewMode,
      setResponseViewMode,
      clearTurnDetail
    }
  }
)

function formatPayload(value: unknown, mode: ChatDetailDataViewMode): string {
  if (mode === 'yaml') {
    return toYaml(value)
  }
  return JSON.stringify(value, null, 2)
}

function toYaml(value: unknown, depth = 0): string {
  const indent = '  '.repeat(depth)

  if (value === null) {
    return 'null'
  }
  if (typeof value === 'string') {
    if (value.includes('\n')) {
      const block = value
        .split('\n')
        .map((line) => `${indent}  ${line}`)
        .join('\n')
      return `|\n${block}`
    }
    return JSON.stringify(value)
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]'
    }
    return value
      .map((item) => {
        const formatted = toYaml(item, depth + 1)
        if (formatted.includes('\n')) {
          return `${indent}- ${formatted.replace(/^\s*/, '')}`.replace(/\n/g, `\n${indent}  `)
        }
        return `${indent}- ${formatted}`
      })
      .join('\n')
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) {
      return '{}'
    }

    return entries
      .map(([key, item]) => {
        const formatted = toYaml(item, depth + 1)
        if (
          typeof item === 'object' &&
          item !== null &&
          ((Array.isArray(item) && item.length > 0) ||
            (!Array.isArray(item) && Object.keys(item).length > 0))
        ) {
          return `${indent}${key}:\n${formatted}`
        }
        return `${indent}${key}: ${formatted}`
      })
      .join('\n')
  }

  return JSON.stringify(value)
}
