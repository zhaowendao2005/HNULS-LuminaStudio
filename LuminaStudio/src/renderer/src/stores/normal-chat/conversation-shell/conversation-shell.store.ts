import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useNormalChatWorkspaceStore } from '../workspace/workspace.store'
import type { ComposerToolItem } from './conversation-shell.types'

/**
 * NormalChat 会话输入壳层 Store
 * 说明：
 * - 这里只保留“未发送输入草稿”这种前端临时状态
 * - 助手/话题/prompt 等业务真相统一交给 workspace store 管理
 */
export const useNormalChatConversationShellStore = defineStore(
  'normal-chat-conversation-shell',
  () => {
    const workspaceStore = useNormalChatWorkspaceStore()
    const composerDraftByTopicId = ref<Record<string, string>>({})

    const leftTools = computed<ComposerToolItem[]>(() => [
      { id: 'tool-plus-square', icon: 'plus-square', side: 'left' as const },
      { id: 'tool-paperclip', icon: 'paperclip', side: 'left' as const },
      { id: 'tool-globe', icon: 'globe', side: 'left' as const },
      { id: 'tool-file-text', icon: 'file-text', side: 'left' as const },
      { id: 'tool-hammer', icon: 'hammer', side: 'left' as const },
      { id: 'tool-at-sign', icon: 'at-sign', side: 'left' as const },
      { id: 'tool-zap', icon: 'zap', side: 'left' as const },
      { id: 'tool-panel-top', icon: 'panel-top', side: 'left' as const },
      { id: 'tool-maximize', icon: 'maximize', side: 'left' as const },
      { id: 'tool-eraser', icon: 'eraser', side: 'left' as const },
      { id: 'tool-clock', icon: 'clock', side: 'left' as const }
    ])
    const rightTools = computed<ComposerToolItem[]>(() => [
      { id: 'tool-languages', icon: 'languages', side: 'right' as const }
    ])

    const composerText = computed(() => {
      const topicId = workspaceStore.snapshot.activeTopicId
      return topicId ? (composerDraftByTopicId.value[topicId] ?? '') : ''
    })

    const composerPlaceholder = computed(() => {
      return workspaceStore.currentTopic
        ? `在「${workspaceStore.currentTopic.title}」里输入消息，发送链路下一批接入`
        : '先选择一个话题'
    })

    const canSend = computed(() => composerText.value.trim().length > 0)
    const sendEnabled = computed(() => false)
    const pendingNotice = computed(
      () => '消息发送链路将在下一批接入，本批先完成助手、话题和 system prompt。'
    )

    function setComposerText(value: string): void {
      const topicId = workspaceStore.snapshot.activeTopicId
      if (!topicId) {
        return
      }

      composerDraftByTopicId.value = {
        ...composerDraftByTopicId.value,
        [topicId]: value
      }
    }

    function clearComposer(): void {
      setComposerText('')
    }

    return {
      composerText,
      composerPlaceholder,
      leftTools,
      rightTools,
      canSend,
      sendEnabled,
      pendingNotice,
      setComposerText,
      clearComposer
    }
  }
)
