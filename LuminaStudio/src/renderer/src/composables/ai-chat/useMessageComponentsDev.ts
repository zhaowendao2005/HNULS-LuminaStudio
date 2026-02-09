import { ref } from 'vue'
import { useAiChatStore } from '@renderer/stores/ai-chat/store'
import { useChatMessageStore } from '@renderer/stores/ai-chat/chat-message/store'
import {
  getMessageComponentMockCaseById,
  messageComponentMockCases
} from '@renderer/stores/ai-chat/chat-message/chat-message-mock'
import { useKnowledgeSearchMessageStore } from '@renderer/stores/ai-chat/chat-message/message-components-store/KnowledgeSearch-store'

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

export function useMessageComponentsDev() {
  const aiChatStore = useAiChatStore()
  const messageStore = useChatMessageStore()
  const knowledgeSearchMessageStore = useKnowledgeSearchMessageStore()

  const isRunning = ref(false)
  const progress = ref('')

  function applyConversation(messages: any[], label: string): void {
    const conversationId = generateId('dev-conv')
    aiChatStore.currentConversationId = conversationId
    messageStore.setMessages(conversationId, messages)
    progress.value = `已渲染: ${label}`
  }

  function runComponentCase(caseId: string): void {
    if (isRunning.value) return
    const mockCase = getMessageComponentMockCaseById(caseId)
    if (!mockCase) return

    isRunning.value = true
    knowledgeSearchMessageStore.resetDetailDialog()

    try {
      const messages = mockCase.buildMessages()
      applyConversation(messages, mockCase.label)
      mockCase.onApply?.({
        openKnowledgeSearchDetail: (payload) =>
          knowledgeSearchMessageStore.openDetailDialog(payload as any),
        resetKnowledgeSearchDetail: () => knowledgeSearchMessageStore.resetDetailDialog()
      })
    } finally {
      isRunning.value = false
    }
  }

  function runAllComponentCases(): void {
    if (isRunning.value) return
    isRunning.value = true
    knowledgeSearchMessageStore.resetDetailDialog()

    try {
      const messages = messageComponentMockCases.flatMap((mockCase, caseIdx) => {
        const titleMessage = {
          id: `dev-divider-${caseIdx}`,
          role: 'assistant',
          status: 'final',
          blocks: [
            {
              type: 'text',
              content: `### ${caseIdx + 1}. ${mockCase.label}\n${mockCase.description}`
            }
          ]
        }
        const caseMessages = mockCase.buildMessages().map((msg, msgIdx) => ({
          ...msg,
          id: `dev-${mockCase.id}-${msgIdx}-${Math.random().toString(36).slice(2, 6)}`
        }))
        return [titleMessage, ...caseMessages]
      })

      applyConversation(messages, 'All MessageComponents')
    } finally {
      isRunning.value = false
    }
  }

  return {
    isRunning,
    progress,
    cases: messageComponentMockCases,
    runComponentCase,
    runAllComponentCases
  }
}
