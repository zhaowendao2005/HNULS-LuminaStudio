<template>
  <footer class="nc-chat-composer-a9k2 sticky bottom-0 bg-[var(--nc-bg-main)] px-6 pb-6 pt-2">
    <div
      class="flex flex-col rounded-2xl border border-gray-200 bg-white transition-all focus-within:ring-1 focus-within:ring-gray-300"
    >
      <textarea
        :value="conversationStore.currentDraft"
        class="min-h-[60px] max-h-[200px] w-full resize-none bg-transparent p-4 pb-2 text-[15px] text-gray-800 outline-none placeholder:text-gray-400"
        :class="conversationStore.isCurrentTopicStreaming ? 'cursor-not-allowed opacity-80' : ''"
        :placeholder="conversationStore.composerPlaceholder"
        :readonly="conversationStore.isCurrentTopicStreaming"
        rows="1"
        @input="onInput"
        @keydown="onKeydown"
      />

      <div class="flex items-center justify-between px-3 pb-3">
        <div class="flex items-center gap-1">
          <template v-for="tool in leftTools" :key="tool.id">
            <button
              class="flex items-center justify-center rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-200/50 hover:text-gray-800"
              type="button"
            >
              <component :is="resolveToolIcon(tool.icon)" class="h-[18px] w-[18px]" />
            </button>
            <span v-if="tool.id === 'tool-at-sign'" class="mx-1 h-4 w-[1px] bg-gray-300" />
          </template>
        </div>

        <div class="flex items-center gap-2">
          <button
            v-for="tool in rightTools"
            :key="tool.id"
            class="flex items-center justify-center rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-200/50 hover:text-gray-800"
            type="button"
          >
            <component :is="resolveToolIcon(tool.icon)" class="h-5 w-5" />
          </button>

          <button
            class="rounded-full p-1.5 text-white transition-colors"
            :class="sendButtonClass"
            :disabled="!canClickButton"
            :title="sendButtonTitle"
            type="button"
            @click="handlePrimaryAction"
          >
            <component :is="sendButtonIcon" class="h-4 w-4 stroke-[3]" />
          </button>
        </div>
      </div>
    </div>
    <p class="mt-2 px-1 text-[12px] text-gray-400">
      {{ statusLine }}
    </p>
  </footer>
</template>

<script setup lang="ts">
import {
  ArrowUp,
  AtSign,
  Clock,
  Eraser,
  FileText,
  Globe,
  Hammer,
  Languages,
  Maximize2,
  Paperclip,
  PanelTop,
  PlusSquare,
  Square,
  Zap,
  type LucideIcon
} from 'lucide-vue-next'
import { computed } from 'vue'
import type { ComposerToolIcon } from '@renderer/stores/normal-chat/conversation-shell/conversation-shell.types'
import { useNormalChatConversationStore } from '@renderer/stores/normal-chat/conversation/conversation.store'
import { useNormalChatWorkspaceStore } from '@renderer/stores/normal-chat/workspace/workspace.store'

const conversationStore = useNormalChatConversationStore()
const workspaceStore = useNormalChatWorkspaceStore()

const leftTools: Array<{ id: string; icon: ComposerToolIcon; side: 'left' }> = [
  { id: 'tool-plus-square', icon: 'plus-square', side: 'left' },
  { id: 'tool-paperclip', icon: 'paperclip', side: 'left' },
  { id: 'tool-globe', icon: 'globe', side: 'left' },
  { id: 'tool-file-text', icon: 'file-text', side: 'left' },
  { id: 'tool-hammer', icon: 'hammer', side: 'left' },
  { id: 'tool-at-sign', icon: 'at-sign', side: 'left' },
  { id: 'tool-zap', icon: 'zap', side: 'left' },
  { id: 'tool-panel-top', icon: 'panel-top', side: 'left' },
  { id: 'tool-maximize', icon: 'maximize', side: 'left' },
  { id: 'tool-eraser', icon: 'eraser', side: 'left' },
  { id: 'tool-clock', icon: 'clock', side: 'left' }
]

const rightTools: Array<{ id: string; icon: ComposerToolIcon; side: 'right' }> = [
  { id: 'tool-languages', icon: 'languages', side: 'right' }
]

const iconMap: Record<ComposerToolIcon, LucideIcon> = {
  'plus-square': PlusSquare,
  paperclip: Paperclip,
  globe: Globe,
  'file-text': FileText,
  hammer: Hammer,
  'at-sign': AtSign,
  zap: Zap,
  'panel-top': PanelTop,
  maximize: Maximize2,
  eraser: Eraser,
  clock: Clock,
  languages: Languages
}

const resolveToolIcon = (icon: ComposerToolIcon): LucideIcon => iconMap[icon]

const sendButtonIcon = computed(() =>
  conversationStore.isCurrentTopicStreaming ? Square : ArrowUp
)

const sendButtonClass = computed(() => {
  if (conversationStore.isCurrentTopicStreaming) {
    return 'bg-rose-500 hover:bg-rose-600'
  }

  return conversationStore.canSend
    ? 'bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)]'
    : 'cursor-not-allowed bg-gray-300'
})

const canClickButton = computed(() =>
  conversationStore.isCurrentTopicStreaming ? conversationStore.canStop : conversationStore.canSend
)

const sendButtonTitle = computed(() => {
  if (conversationStore.isCurrentTopicStreaming) {
    return '停止当前生成'
  }

  if (!workspaceStore.currentTopicModelProviderId || !workspaceStore.currentTopicModelId) {
    return '请先选择模型'
  }

  if (!conversationStore.currentDraft.trim()) {
    return '请输入内容'
  }

  return '发送消息'
})

const statusLine = computed(() => {
  if (conversationStore.currentLastError) {
    return conversationStore.currentLastError
  }

  if (conversationStore.currentStatusText) {
    return conversationStore.currentStatusText
  }

  if (!workspaceStore.currentTopicModelProviderId || !workspaceStore.currentTopicModelId) {
    return '请先选择模型后再发送'
  }

  return 'Enter 发送，Shift+Enter 换行'
})

const onInput = (event: Event) => {
  conversationStore.setDraftText((event.target as HTMLTextAreaElement).value)
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Enter' || event.shiftKey) {
    return
  }

  event.preventDefault()
  void handlePrimaryAction()
}

const handlePrimaryAction = async () => {
  if (conversationStore.isCurrentTopicStreaming) {
    await conversationStore.abortCurrentRequest()
    return
  }

  if (!conversationStore.canSend) {
    return
  }

  await conversationStore.sendCurrentDraft().catch(() => undefined)
}
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
