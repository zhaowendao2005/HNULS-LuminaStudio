import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { GenerationStageConfig, GenerationStreamEvent } from '@preload/types'
import type { GenerateSessionDetailViewModel } from '../generation-editor.types'
import {
  appendOptimisticMessages,
  applyStreamEventToChannelMessages,
  createChannelStreamLocalState,
  markOptimisticAssistantMessageError
} from '../generation-editor.domain-helpers'
import { AnalysisDiscussionDataSource } from './analysis-discussion.datasource'

export const useGenerationAnalysisDiscussionStore = defineStore(
  'of-generation-analysis-discussion',
  () => {
    const input = ref('')
    const localState = ref(createChannelStreamLocalState())

    const isStreaming = computed(() => Boolean(localState.value.activeRequestId))

    function getMessages(detail: GenerateSessionDetailViewModel | null) {
      return detail?.messagesByChannel['analysis-discussion'] ?? []
    }

    async function sendMessage(
      detail: GenerateSessionDetailViewModel | null,
      config: GenerationStageConfig | null
    ): Promise<void> {
      if (!detail || !config?.providerId || !config.modelId) return
      const content = input.value.trim()
      if (!content) return

      input.value = ''
      const { assistantId } = appendOptimisticMessages({
        detail,
        channelKey: 'analysis-discussion',
        content,
        config
      })
      try {
        const result = await AnalysisDiscussionDataSource.sendMessage({
          sessionId: detail.id,
          channelKey: 'analysis-discussion',
          providerId: config.providerId,
          modelId: config.modelId,
          content
        })

        const target = detail.messagesByChannel['analysis-discussion'].find(
          (item) => item.id === assistantId
        )
        if (target) {
          target.requestId = result.requestId
        }
        localState.value.streamMessageIdByRequest[result.requestId] = assistantId

        await AnalysisDiscussionDataSource.updateSessionState({
          sessionId: detail.id,
          analysisTurnCount: detail.analysisTurnCount + 1,
          summary: '需求讨论已进入真实对话持久化链路。'
        })
      } catch (error) {
        markOptimisticAssistantMessageError({
          detail,
          channelKey: 'analysis-discussion',
          assistantId,
          message: error instanceof Error ? error.message : '发送失败，请稍后重试。',
          localState: localState.value
        })
      }
    }

    function applyStreamEvent(
      detail: GenerateSessionDetailViewModel | null,
      event: GenerationStreamEvent
    ): boolean {
      return applyStreamEventToChannelMessages({
        detail,
        channelKey: 'analysis-discussion',
        event,
        localState: localState.value
      })
    }

    function resetLocalStateForRequest(requestId: string): void {
      delete localState.value.streamMessageIdByRequest[requestId]
      if (localState.value.activeRequestId === requestId) {
        localState.value.activeRequestId = null
      }
    }

    return {
      input,
      isStreaming,
      getMessages,
      sendMessage,
      applyStreamEvent,
      resetLocalStateForRequest
    }
  }
)
