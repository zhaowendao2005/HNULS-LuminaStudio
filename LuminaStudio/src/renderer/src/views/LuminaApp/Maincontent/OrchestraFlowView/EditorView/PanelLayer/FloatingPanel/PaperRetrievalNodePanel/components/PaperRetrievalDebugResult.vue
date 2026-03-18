<template>
  <div class="space-y-3">
    <NodeDebugLastRun :result="result" :loading="loading" />

    <div
      v-if="normalizedOutputs"
      class="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-3"
    >
      <div class="flex items-center justify-between gap-3">
        <div class="text-[13px] font-semibold leading-[18px] text-emerald-800">检索摘要</div>
        <div class="text-xs text-emerald-700">{{ returnedCount }} / {{ totalFound }}</div>
      </div>

      <div class="mt-2 flex flex-wrap gap-1.5">
        <span class="rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
          {{ providerId }}
        </span>
        <span class="rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-medium text-cyan-700">
          {{ latencyText }}
        </span>
      </div>

      <div v-if="firstTitle" class="mt-3 rounded-lg bg-white/85 px-3 py-2">
        <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">首条论文</div>
        <div class="mt-1 text-sm font-semibold text-gray-800">{{ firstTitle }}</div>
        <div v-if="firstMeta" class="mt-1 text-xs leading-5 text-gray-500">{{ firstMeta }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { OFNodeDebugResult } from '@shared/Orchestraflow-types'
import NodeDebugLastRun from '../../NodeDebug/NodeDebugLastRun.vue'

const props = defineProps<{
  result?: OFNodeDebugResult
  loading?: boolean
}>()

const normalizedOutputs = computed(() => {
  const outputs = props.result?.outputs
  if (!outputs || typeof outputs !== 'object') return null
  return outputs as Record<string, unknown>
})

const providerId = computed(() => String(normalizedOutputs.value?.provider_id || 'paper-retrieval'))
const totalFound = computed(() => Number(normalizedOutputs.value?.total_found || 0))
const returnedCount = computed(() => {
  const raw = normalizedOutputs.value?.items
  return Array.isArray(raw) ? raw.length : Number(normalizedOutputs.value?.returned_count || 0)
})
const latencyText = computed(() => `${Number(normalizedOutputs.value?.latency_ms || 0)} ms`)

const firstItem = computed(() => {
  const items = normalizedOutputs.value?.items
  return Array.isArray(items) && items.length > 0 && typeof items[0] === 'object' ? items[0] : null
})

const firstTitle = computed(() =>
  String((firstItem.value as Record<string, unknown> | null)?.title || '')
)
const firstMeta = computed(() => {
  const item = firstItem.value as Record<string, unknown> | null
  if (!item) return ''
  const source = String(item.source || '')
  const doi = String(item.doi || '')
  return [source, doi ? `DOI: ${doi}` : ''].filter(Boolean).join(' · ')
})
</script>
