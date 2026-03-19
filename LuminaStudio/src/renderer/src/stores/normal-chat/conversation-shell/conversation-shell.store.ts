import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { ConversationShellDatasource } from './conversation-shell.datasource'
import type { ConversationShellSnapshot } from './conversation-shell.types'

const datasource = new ConversationShellDatasource()

/**
 * NormalChat 会话壳层 Store（SSOT）
 * 说明：
 * - 中间区消息展示和输入框都从这里读写
 * - 当前阶段只做 UI 态，不接真实对话发送逻辑
 */
export const useNormalChatConversationShellStore = defineStore(
  'normal-chat-conversation-shell',
  () => {
    const snapshot = ref<ConversationShellSnapshot>({
      headerText: '',
      textareaPlaceholder: '在这里输入消息，按 Enter 发送',
      composerText: '',
      messages: [],
      tools: []
    })

    const leftTools = computed(() => snapshot.value.tools.filter((item) => item.side === 'left'))
    const rightTools = computed(() => snapshot.value.tools.filter((item) => item.side === 'right'))
    const canSend = computed(() => snapshot.value.composerText.trim().length > 0)

    async function initialize() {
      snapshot.value = await datasource.loadSnapshot()
    }

    async function persist() {
      await datasource.saveSnapshot(snapshot.value)
    }

    async function setComposerText(value: string) {
      snapshot.value.composerText = value
      await persist()
    }

    async function clearComposer() {
      snapshot.value.composerText = ''
      await persist()
    }

    async function sendMockMessage() {
      if (!canSend.value) {
        return
      }

      // 快调阶段：仅清空输入框，不追加真实消息，避免误导为已接后端
      await clearComposer()
    }

    return {
      snapshot,
      leftTools,
      rightTools,
      canSend,
      initialize,
      setComposerText,
      clearComposer,
      sendMockMessage
    }
  }
)
