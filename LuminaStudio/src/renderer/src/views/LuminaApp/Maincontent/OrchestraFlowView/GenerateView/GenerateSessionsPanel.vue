<template>
  <div class="of-generate-sessions mx-auto max-w-4xl py-6">
    <div class="mb-4 flex items-center justify-between px-6">
      <h2 class="text-sm font-semibold text-gray-800">会话管理</h2>
      <button
        type="button"
        class="rounded bg-cyan-50 px-2 py-1 text-xs text-cyan-600 transition-colors hover:bg-cyan-100"
        @click="$emit('open-create-session')"
      >
        + 新建会话
      </button>
    </div>

    <div class="flex flex-col">
      <button
        v-for="session in sessions"
        :key="session.id"
        type="button"
        :class="[
          'group relative flex items-start justify-between border-b border-gray-100 px-6 py-4 text-left transition-colors hover:bg-gray-50/50',
          selectedSessionId === session.id ? 'bg-cyan-50/40' : ''
        ]"
        @click="$emit('select-session', session.id)"
      >
        <div class="min-w-0 pr-4">
          <div class="mb-1 flex items-center gap-3">
            <span class="text-[13px] font-semibold text-gray-800">{{ session.title }}</span>
            <span class="rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
              {{ getStageLabel(session.currentStage) }}
            </span>
          </div>
          <div class="text-xs leading-5 text-gray-500">
            {{ session.summary || '当前会话还没有摘要。' }}
          </div>
        </div>
        <div class="flex shrink-0 flex-col items-end gap-3">
          <div class="flex items-center gap-2">
            <div class="text-xs text-gray-400">{{ formatTime(session.updatedAt) }}</div>
            <button
              type="button"
              title="删除会话"
              class="rounded p-1 text-gray-300 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
              @click.stop="$emit('delete-session', session.id)"
            >
              <svg
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                <path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
              </svg>
            </button>
          </div>
          <div class="flex items-center gap-1.5">
            <span
              v-for="stage in stageOrder"
              :key="`${session.id}-${stage}`"
              :class="getSessionStageDotClass(session.currentStage, stage)"
            ></span>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GenerationSessionSummary, GenerationStageKey } from '@preload/types'
import type { StageKey } from './generate-view.types'

defineProps<{
  sessions: GenerationSessionSummary[]
  selectedSessionId: string | null
  stageOrder: StageKey[]
  getStageLabel: (stage: GenerationStageKey) => string
  getSessionStageDotClass: (currentStage: string, stage: string) => string
}>()

defineEmits<{
  (e: 'open-create-session'): void
  (e: 'select-session', sessionId: string): void
  (e: 'delete-session', sessionId: string): void
}>()

function formatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>
