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
          <div class="text-xs leading-5 text-gray-500">{{ session.summary }}</div>
        </div>
        <div class="flex shrink-0 flex-col items-end gap-3">
          <div class="text-xs text-gray-400">{{ session.time }}</div>
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
import type { SessionItem, StageKey } from './generate-view.types'

defineProps<{
  sessions: SessionItem[]
  selectedSessionId: string
  stageOrder: StageKey[]
  getStageLabel: (stage: StageKey) => string
  getSessionStageDotClass: (currentStage: StageKey, stage: StageKey) => string
}>()

defineEmits<{
  (e: 'open-create-session'): void
  (e: 'select-session', sessionId: string): void
}>()
</script>
