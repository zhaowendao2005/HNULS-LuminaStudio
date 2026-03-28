import { computed, ref, watch } from 'vue'
import type { NormalChatConversationDevScenarioId } from '@preload/types'
import { useNormalChatConversationStore } from '@renderer/stores/normal-chat/conversation/conversation.store'
import {
  clearPreparedNormalChatConversationDevScenario,
  prepareNormalChatConversationDevScenario
} from '@renderer/stores/normal-chat/conversation/conversation.mock'
import { useNormalChatWorkspaceStore } from '@renderer/stores/normal-chat/workspace/workspace.store'
import { CHATFLOW_DEV_SCENARIOS } from './scenarios'

export function useChatflowDev() {
  const conversationStore = useNormalChatConversationStore()
  const workspaceStore = useNormalChatWorkspaceStore()
  const runningScenarioId = ref<NormalChatConversationDevScenarioId | null>(null)
  const runningRequestId = ref<string | null>(null)
  const localError = ref('')

  const canRunScenario = computed(() => {
    return (
      Boolean(workspaceStore.currentTopic?.id) &&
      Boolean(workspaceStore.currentTopicModelProviderId) &&
      Boolean(workspaceStore.currentTopicModelId) &&
      !runningScenarioId.value &&
      !conversationStore.isCurrentTopicStreaming
    )
  })

  const statusText = computed(() => {
    if (localError.value) {
      return localError.value
    }
    if (!workspaceStore.currentTopic?.id) {
      return '当前还没有可用话题，无法回放固定测试。'
    }
    if (!workspaceStore.currentTopicModelProviderId || !workspaceStore.currentTopicModelId) {
      return '请先给当前话题选择模型，再触发固定测试。'
    }
    if (runningScenarioId.value) {
      const currentScenario = CHATFLOW_DEV_SCENARIOS.find(
        (scenario) => scenario.id === runningScenarioId.value
      )
      return `${currentScenario?.title ?? '固定测试'} 回放中，其他按钮已禁用。`
    }
    return '按钮会向当前话题末尾追加一轮固定测试交互。'
  })

  async function runScenario(scenarioId: NormalChatConversationDevScenarioId): Promise<void> {
    const currentScenario = CHATFLOW_DEV_SCENARIOS.find((scenario) => scenario.id === scenarioId)
    const topicId = workspaceStore.currentTopic?.id ?? ''
    if (!currentScenario || !topicId) {
      localError.value = '当前没有可用话题，暂时无法触发固定测试。'
      return
    }
    if (!workspaceStore.currentTopicModelProviderId || !workspaceStore.currentTopicModelId) {
      localError.value = '请先为当前话题选择模型。'
      return
    }
    if (runningScenarioId.value || conversationStore.isCurrentTopicStreaming) {
      return
    }

    localError.value = ''
    runningScenarioId.value = scenarioId
    runningRequestId.value = null

    try {
      // 这里先注册脚本，再走真实的 conversation store 发送链。
      prepareNormalChatConversationDevScenario(topicId, scenarioId)
      conversationStore.setDraftText(currentScenario.input)
      await conversationStore.sendCurrentDraft()
      runningRequestId.value = conversationStore.currentTopicRequestId || null

      if (!runningRequestId.value) {
        clearPreparedNormalChatConversationDevScenario(topicId)
        runningScenarioId.value = null
      }
    } catch (error) {
      clearPreparedNormalChatConversationDevScenario(topicId)
      runningScenarioId.value = null
      runningRequestId.value = null
      localError.value = error instanceof Error ? error.message : String(error)
    }
  }

  watch(
    () => [
      conversationStore.currentTopicRequestId,
      conversationStore.currentLastError,
      workspaceStore.currentTopic?.id ?? ''
    ],
    ([requestId]) => {
      if (!runningScenarioId.value) {
        return
      }
      if (!runningRequestId.value && requestId) {
        runningRequestId.value = requestId
        return
      }
      if (runningRequestId.value && requestId !== runningRequestId.value) {
        runningScenarioId.value = null
        runningRequestId.value = null
      }
    }
  )

  return {
    scenarios: CHATFLOW_DEV_SCENARIOS,
    runningScenarioId,
    canRunScenario,
    statusText,
    runScenario
  }
}
