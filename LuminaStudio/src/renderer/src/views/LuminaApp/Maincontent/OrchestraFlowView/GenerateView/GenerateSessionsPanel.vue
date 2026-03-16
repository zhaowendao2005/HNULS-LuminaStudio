<template>
  <section class="gv-sessions-y12 flex h-full flex-col p-5">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <div class="text-sm font-semibold text-slate-900">会话列表</div>
        <div class="text-xs text-slate-500">当前所有 Generate 会话</div>
      </div>
      <button
        type="button"
        class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
        @click="$emit('create-session')"
      >
        新建
      </button>
    </div>

    <div class="grid gap-3">
      <button
        v-for="session in sessions"
        :key="session.id"
        type="button"
        class="rounded-2xl border p-4 text-left transition-colors"
        :class="
          selectedSessionId === session.id
            ? 'border-cyan-400 bg-cyan-50'
            : 'border-slate-200 bg-white hover:border-slate-300'
        "
        @click="$emit('select-session', session.id)"
      >
        <div class="mb-2 flex items-center justify-between">
          <div class="font-semibold text-slate-900">{{ session.title }}</div>
          <span class="text-[11px] text-slate-500">{{ session.currentStage }}</span>
        </div>
        <div class="mb-2 text-sm text-slate-600">{{ session.summary || '尚无摘要。' }}</div>
        <div class="flex items-center justify-between text-xs text-slate-400">
          <span>analysis {{ session.analysisTurnCount }} 轮</span>
          <span>design {{ session.designVersionCount }} 版</span>
        </div>
        <div class="mt-3 text-right">
          <button
            type="button"
            class="rounded-lg px-2 py-1 text-xs text-rose-500 hover:bg-rose-50"
            @click.stop="$emit('delete-session', session.id)"
          >
            删除
          </button>
        </div>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { GenerationSessionSummary } from '@preload/types'

defineProps<{
  sessions: GenerationSessionSummary[]
  selectedSessionId: string | null
}>()

defineEmits<{
  (e: 'create-session'): void
  (e: 'select-session', sessionId: string): void
  (e: 'delete-session', sessionId: string): void
}>()
</script>
