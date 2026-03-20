<template>
  <footer class="nc-chat-composer-a9k2 sticky bottom-0 bg-[var(--nc-bg-main)] px-6 pb-6 pt-2">
    <div
      class="flex flex-col rounded-2xl border border-gray-200 bg-white transition-all focus-within:ring-1 focus-within:ring-gray-300"
    >
      <textarea
        :value="conversationStore.composerText"
        class="min-h-[60px] max-h-[200px] w-full resize-none bg-transparent p-4 pb-2 text-[15px] text-gray-800 outline-none placeholder:text-gray-400"
        :placeholder="conversationStore.composerPlaceholder"
        rows="1"
        @input="onInput"
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
            :class="
              canSend && sendEnabled
                ? 'bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)]'
                : 'cursor-not-allowed bg-gray-300'
            "
            :title="sendDisabledReason"
            type="button"
          >
            <ArrowUp class="h-4 w-4 stroke-[3]" />
          </button>
        </div>
      </div>
    </div>
    <p class="mt-2 px-1 text-[12px] text-gray-400">{{ pendingNotice }}</p>
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
  Zap,
  type LucideIcon
} from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import type { ComposerToolIcon } from '@renderer/stores/normal-chat/conversation-shell/conversation-shell.types'
import { useNormalChatConversationShellStore } from '@renderer/stores/normal-chat/conversation-shell/conversation-shell.store'

const conversationStore = useNormalChatConversationShellStore()
const { leftTools, rightTools, canSend, sendEnabled, pendingNotice } =
  storeToRefs(conversationStore)

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

const onInput = (event: Event) => {
  conversationStore.setComposerText((event.target as HTMLTextAreaElement).value)
}

const sendDisabledReason = '消息发送链路待接入，本批先完成助手、话题和 system prompt。'
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
