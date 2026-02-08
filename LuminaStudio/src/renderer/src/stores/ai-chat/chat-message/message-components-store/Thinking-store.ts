import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useThinkingMessageStore = defineStore('chat-message-component-thinking', () => {
  const expandedByMessageId = ref<Record<string, boolean>>({})

  function getExpanded(messageId: string): boolean {
    const value = expandedByMessageId.value[messageId]
    return value === undefined ? true : value
  }

  function setExpanded(messageId: string, value: boolean): void {
    expandedByMessageId.value[messageId] = value
  }

  function toggleExpanded(messageId: string): void {
    setExpanded(messageId, !getExpanded(messageId))
  }

  return {
    expandedByMessageId,
    getExpanded,
    setExpanded,
    toggleExpanded
  }
})
