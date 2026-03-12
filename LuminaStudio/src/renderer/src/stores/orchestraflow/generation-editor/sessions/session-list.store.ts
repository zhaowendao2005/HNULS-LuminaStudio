import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { SessionListDataSource } from './session-list.datasource'
import {
  mapSessionDetail,
  mapSessionSummary,
  type GenerateSessionViewModel
} from '../generation-editor.types'

export const useGenerationSessionListStore = defineStore('of-generation-session-list', () => {
  const sessions = ref<GenerateSessionViewModel[]>([])
  const selectedSessionId = ref<string | null>(null)
  const loading = ref(false)

  const selectedSessionSummary = computed(() => {
    if (!selectedSessionId.value) return null
    return sessions.value.find((item) => item.id === selectedSessionId.value) || null
  })

  async function initialize(): Promise<void> {
    if (loading.value) return
    loading.value = true
    try {
      const rows = await SessionListDataSource.listSessions()
      sessions.value = rows.map(mapSessionSummary)
      selectedSessionId.value = rows[0]?.id || null
    } finally {
      loading.value = false
    }
  }

  async function createSession(title: string) {
    const detail = await SessionListDataSource.createSession({ title })
    const summary = mapSessionSummary(detail)
    mergeSessionSummary(summary)
    selectedSessionId.value = summary.id
    return mapSessionDetail(detail)
  }

  async function deleteSession(sessionId: string): Promise<void> {
    await SessionListDataSource.deleteSession(sessionId)
    sessions.value = sessions.value.filter((item) => item.id !== sessionId)
    if (selectedSessionId.value === sessionId) {
      selectedSessionId.value = sessions.value[0]?.id || null
    }
  }

  function selectSession(sessionId: string): void {
    selectedSessionId.value = sessionId
  }

  function mergeSessionSummary(summary: GenerateSessionViewModel): void {
    const index = sessions.value.findIndex((item) => item.id === summary.id)
    if (index >= 0) {
      sessions.value[index] = summary
      return
    }
    sessions.value.unshift(summary)
  }

  return {
    sessions,
    selectedSessionId,
    selectedSessionSummary,
    loading,
    initialize,
    createSession,
    deleteSession,
    selectSession,
    mergeSessionSummary
  }
})
