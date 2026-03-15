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
import { AnalysisCopilotDataSource } from './analysis-copilot.datasource'

export const useGenerationAnalysisCopilotStore = defineStore(
  'of-generation-analysis-copilot',
  () => {
    const input = ref('')
    const localState = ref(createChannelStreamLocalState())
    const isStreaming = computed(() => Boolean(localState.value.activeRequestId))

    function getMessages(detail: GenerateSessionDetailViewModel | null) {
      return detail?.messagesByChannel['analysis-copilot'] ?? []
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
        channelKey: 'analysis-copilot',
        content,
        config
      })
      try {
        const result = await AnalysisCopilotDataSource.sendMessage({
          sessionId: detail.id,
          channelKey: 'analysis-copilot',
          providerId: config.providerId,
          modelId: config.modelId,
          content
        })
        const target = detail.messagesByChannel['analysis-copilot'].find(
          (item) => item.id === assistantId
        )
        if (target) target.requestId = result.requestId
        localState.value.streamMessageIdByRequest[result.requestId] = assistantId
      } catch (error) {
        markOptimisticAssistantMessageError({
          detail,
          channelKey: 'analysis-copilot',
          assistantId,
          message: error instanceof Error ? error.message : '发送失败，请稍后重试。',
          localState: localState.value
        })
      }
    }

    function applyStreamEvent(
      detail: GenerateSessionDetailViewModel | null,
      event: GenerationStreamEvent
    ) {
      return applyStreamEventToChannelMessages({
        detail,
        channelKey: 'analysis-copilot',
        event,
        localState: localState.value
      })
    }

    return {
      input,
      isStreaming,
      getMessages,
      sendMessage,
      applyStreamEvent
    }
  }
)
