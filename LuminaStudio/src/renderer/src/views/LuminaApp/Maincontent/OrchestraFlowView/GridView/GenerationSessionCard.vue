<template>
  <div class="of-generation-session-card rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-sm font-semibold text-slate-900">{{ session.workflow_name }}</div>
        <div class="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
          {{ session.current_phase }}
        </div>
      </div>
      <span
        class="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700"
      >
        {{ session.status }}
      </span>
    </div>
    <p class="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
      {{ session.prompt || 'No prompt yet.' }}
    </p>
    <div class="mt-4 flex items-center gap-2">
      <button
        type="button"
        class="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
        @click="$emit('open', session.id)"
      >
        Resume
      </button>
      <button
        type="button"
        class="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700"
        @click="$emit('delete', session.id)"
      >
        Delete
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { OFGenerationSession } from '@shared/Orchestraflow-types'

defineProps<{ session: OFGenerationSession }>()

defineEmits<{
  (e: 'open', sessionId: string): void
  (e: 'delete', sessionId: string): void
}>()
</script>
