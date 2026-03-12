import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { SessionDetailCacheDataSource } from './session-detail-cache.datasource'
import { mapSessionDetail, type GenerateSessionDetailViewModel } from '../generation-editor.types'

export const useGenerationSessionDetailCacheStore = defineStore(
  'of-generation-session-detail-cache',
  () => {
    const sessionDetails = ref<Record<string, GenerateSessionDetailViewModel>>({})

    const hasSessionDetail = computed(() => {
      return (sessionId: string) => Boolean(sessionDetails.value[sessionId])
    })

    async function refreshSessionDetail(
      sessionId: string
    ): Promise<GenerateSessionDetailViewModel> {
      const detail = await SessionDetailCacheDataSource.getSessionDetail(sessionId)
      const mapped = mapSessionDetail(detail)
      sessionDetails.value[mapped.id] = mapped
      return mapped
    }

    function setSessionDetail(detail: GenerateSessionDetailViewModel): void {
      sessionDetails.value[detail.id] = detail
    }

    function removeSessionDetail(sessionId: string): void {
      delete sessionDetails.value[sessionId]
    }

    function getSessionDetail(sessionId: string | null): GenerateSessionDetailViewModel | null {
      if (!sessionId) return null
      return sessionDetails.value[sessionId] ?? null
    }

    return {
      sessionDetails,
      hasSessionDetail,
      refreshSessionDetail,
      setSessionDetail,
      removeSessionDetail,
      getSessionDetail
    }
  }
)
