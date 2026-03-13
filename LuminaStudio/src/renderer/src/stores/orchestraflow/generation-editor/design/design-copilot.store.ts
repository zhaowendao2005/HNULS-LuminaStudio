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
import { DesignCopilotDataSource } from './design-copilot.datasource'

export const useGenerationDesignCopilotStore = defineStore('of-generation-design-copilot', () => {
  const input = ref('')
  const localState = ref(createChannelStreamLocalState())
  const isStreaming = computed(() => Boolean(localState.value.activeRequestId))

  function getMessages(detail: GenerateSessionDetailViewModel | null, designDocumentId: string | null) {
    return (detail?.messagesByChannel['design-copilot'] ?? []).filter((message) => {
      return message.designDocumentId === designDocumentId
    })
  }

  async function sendMessage(
    detail: GenerateSessionDetailViewModel | null,
    config: GenerationStageConfig | null,
    options?: {
      designDocumentId?: string | null
      content?: string
      assistantMetaJson?: string | null
    }
  ): Promise<void> {
    if (!detail || !config?.providerId || !config.modelId) return
    const designDocumentId = options?.designDocumentId || null
    const content = (options?.content ?? input.value).trim()
    if (!content) return

    if (!options?.content) {
      input.value = ''
    }
    const { assistantId } = appendOptimisticMessages({
      detail,
      channelKey: 'design-copilot',
      content,
      config,
      designDocumentId,
      assistantMetaJson: options?.assistantMetaJson || null
    })
    try {
      const result = await DesignCopilotDataSource.sendMessage({
        sessionId: detail.id,
        channelKey: 'design-copilot',
        designDocumentId,
        providerId: config.providerId,
        modelId: config.modelId,
        content
      })
      const target = detail.messagesByChannel['design-copilot'].find(
        (item) => item.id === assistantId
      )
      if (target) target.requestId = result.requestId
      localState.value.streamMessageIdByRequest[result.requestId] = assistantId
    } catch (error) {
      if (!options?.content) {
        input.value = content
      }
      markOptimisticAssistantMessageError({
        detail,
        channelKey: 'design-copilot',
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
      channelKey: 'design-copilot',
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
})
