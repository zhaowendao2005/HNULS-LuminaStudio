<template>
  <div
    class="border-t border-slate-200 bg-white transition-all duration-300"
    :class="isOpen ? 'absolute bottom-0 left-0 right-0 z-20 h-72' : 'shrink-0 h-8'"
  >
    <button
      class="flex h-8 w-full items-center justify-between bg-slate-50 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600"
      @click="$emit('toggle')"
    >
      <span>原始协议报文 (JSON-RPC)</span>
      <span>{{ isOpen ? '收起' : '展开' }}</span>
    </button>

    <div
      v-if="isOpen"
      class="grid h-[calc(100%-32px)] grid-cols-2 overflow-hidden font-mono text-xs"
    >
      <div class="overflow-auto border-r border-slate-200 bg-slate-950 p-3 text-emerald-300">
        <div class="mb-2 text-slate-400">// Outgoing</div>
        <pre>{{ JSON.stringify(outgoingTrace, null, 2) }}</pre>
      </div>
      <div class="overflow-auto bg-slate-950 p-3 text-cyan-300">
        <div class="mb-2 text-slate-400">// Incoming</div>
        <pre>{{ JSON.stringify(incomingTrace, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { McpTraceEvent } from '@preload/types'

defineProps<{
  isOpen: boolean
  outgoingTrace: McpTraceEvent[]
  incomingTrace: McpTraceEvent[]
}>()

defineEmits<{
  toggle: []
}>()
</script>
