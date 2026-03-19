<template>
  <article class="nc-chat-message-item-a9k2 px-8 py-4">
    <div class="flex items-start gap-3">
      <div
        v-if="message.role === 'user'"
        class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white"
      >
        <UserRound class="h-5 w-5" />
      </div>
      <div
        v-else
        class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white shadow-sm"
      >
        <div
          class="h-8 w-8 rounded-xl"
          :class="
            message.author.includes('GPT')
              ? 'bg-gradient-to-br from-rose-300 via-orange-200 to-purple-400'
              : 'bg-gradient-to-br from-emerald-200 via-sky-200 to-blue-300'
          "
        />
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <h4 class="text-[14px] font-semibold leading-[1.25] text-gray-900">
            {{ message.author }}
          </h4>
        </div>
        <p class="mt-1 text-xs text-gray-400">{{ message.time }}</p>

        <div class="mt-4 whitespace-pre-wrap text-[14px] leading-[1.75] text-gray-800">
          {{ message.text }}
        </div>
        <p class="mt-3 text-xs text-gray-400">Tokens: {{ message.tokens }}</p>

        <div
          v-if="message.errorNotice"
          class="mt-4 flex items-center justify-between rounded-xl border border-[var(--nc-error-border)] bg-[var(--nc-error-bg)] px-4 py-3 text-[13px] text-gray-600"
        >
          <span>{{ message.errorNotice }}</span>
          <X class="h-4 w-4 text-gray-400" />
        </div>

        <div v-if="message.actions.length > 0" class="mt-4 flex items-center gap-1.5">
          <button
            v-for="action in message.actions"
            :key="action.id"
            class="nc-message-action-btn-a9k2 rounded-md p-1.5"
            type="button"
          >
            <component :is="resolveActionIcon(action.icon)" class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import {
  AtSign,
  Copy,
  Languages,
  Menu,
  PencilLine,
  RefreshCw,
  Trash2,
  UserRound,
  X,
  type LucideIcon
} from 'lucide-vue-next'
import type {
  ConversationActionIcon,
  ConversationMessage
} from '@renderer/stores/normal-chat/conversation-shell/conversation-shell.types'

defineProps<{
  message: ConversationMessage
}>()

const iconMap: Record<ConversationActionIcon, LucideIcon> = {
  copy: Copy,
  retry: RefreshCw,
  mention: AtSign,
  translate: Languages,
  edit: PencilLine,
  delete: Trash2,
  menu: Menu
}

const resolveActionIcon = (icon: ConversationActionIcon): LucideIcon => iconMap[icon]
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
