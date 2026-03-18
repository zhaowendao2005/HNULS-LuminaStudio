<template>
  <div
    class="of-node of-knowledge-retrieval-node group relative w-[248px] rounded-[15px] border bg-[#f3f4f6] pb-1 shadow-sm transition-all hover:shadow-lg"
    :class="containerClass"
  >
    <Handle
      id="target"
      type="target"
      :position="Position.Left"
      class="of-node-handle of-handle-target of-knowledge-retrieval-target-handle"
    />
    <Handle
      id="source"
      type="source"
      :position="Position.Right"
      class="of-node-handle of-handle-source of-knowledge-retrieval-source-handle"
    />

    <div class="px-4 pt-3 text-xs font-medium tracking-wide text-gray-500">KNOWLEDGE</div>

    <div class="flex items-center rounded-t-2xl px-3 pb-2 pt-3">
      <div
        class="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white shadow-sm"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M10.5 18a7.5 7.5 0 1 1 5.303-2.197L21 21"
          />
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 10h5M8 13h3" />
        </svg>
      </div>
      <div
        class="mr-1 min-w-0 flex grow items-center truncate text-base font-semibold text-gray-900"
      >
        {{ data.title || '知识检索' }}
      </div>
      <div v-if="runningStatus === OFNodeRunningStatus.Succeeded" class="of-node-status-success">
        ✓
      </div>
      <div
        v-else-if="runningStatus === OFNodeRunningStatus.Running"
        class="of-node-status-running"
      ></div>
      <div v-else-if="runningStatus === OFNodeRunningStatus.Failed" class="of-node-status-failed">
        !
      </div>
    </div>

    <div class="space-y-1 px-3 pb-2">
      <div class="rounded-xl bg-[#e9eaee] px-2 py-2">
        <div
          class="flex items-center justify-between gap-2 text-[11px] font-semibold text-gray-500"
        >
          <span class="truncate">{{ scopeSummary }}</span>
          <span>TOP {{ topKSummary }}</span>
        </div>
        <div class="mt-2 truncate text-xs text-gray-700" :title="queryPreview">
          {{ queryPreview }}
        </div>
        <div class="mt-2 flex flex-wrap gap-1.5">
          <span class="rounded-md bg-white/75 px-2 py-0.5 text-[10px] font-medium text-blue-700">
            {{ rerankSummary }}
          </span>
          <span class="rounded-md bg-white/75 px-2 py-0.5 text-[10px] font-medium text-cyan-700">
            {{ efSummary }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { OFNodeRunningStatus, type OFKnowledgeRetrievalNodeData } from '@shared/Orchestraflow-types'

const props = defineProps<{
  data: OFKnowledgeRetrievalNodeData
}>()

const runningStatus = computed(() => props.data?._runningStatus || OFNodeRunningStatus.NotStarted)

const topKSummary = computed(() => Math.max(1, props.data.top_k || 0))

const queryPreview = computed(() => {
  const firstPrompt = (props.data.query_template || []).find((item) => item.text?.trim())
  if (!firstPrompt?.text) return '未配置查询模板'
  const normalized = firstPrompt.text.replace(/\s+/g, ' ').trim()
  return normalized.length > 30 ? `${normalized.slice(0, 30)}...` : normalized
})

const scopeSummary = computed(() => {
  const providers = props.data.permission_tree?.providers || []
  if (!providers.length) return '未配置检索范围'
  return `${providers.length} 个根范围`
})

const rerankSummary = computed(() => {
  if (!props.data.rerank_enabled) return '未启用重排'
  return `重排 TOP ${props.data.rerank_top_n || '自动'}`
})

const efSummary = computed(() => {
  return props.data.ef ? `EF ${props.data.ef}` : 'EF 自动'
})

const containerClass = computed(() => {
  if (runningStatus.value === OFNodeRunningStatus.Running)
    return 'border-indigo-400 of-node-running'
  if (runningStatus.value === OFNodeRunningStatus.Succeeded) return 'border-emerald-500'
  if (runningStatus.value === OFNodeRunningStatus.Failed) return 'border-red-400'
  return 'border-transparent'
})
</script>

<style scoped>
.of-node-running {
  animation: ofNodePulse 1.3s ease-in-out infinite;
}

.of-node-status-success,
.of-node-status-running,
.of-node-status-failed {
  height: 20px;
  width: 20px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #fff;
}

.of-node-status-success {
  background: #059669;
}

.of-node-status-running {
  background: #4f46e5;
}

.of-node-status-failed {
  background: #dc2626;
}

.of-knowledge-retrieval-target-handle::after,
.of-knowledge-retrieval-source-handle::after {
  background: #3b82f6;
}

@keyframes ofNodePulse {
  0%,
  100% {
    box-shadow:
      0 2px 6px rgba(0, 0, 0, 0.05),
      0 0 0 0 rgba(79, 70, 229, 0.18);
  }
  50% {
    box-shadow:
      0 8px 18px rgba(0, 0, 0, 0.08),
      0 0 0 6px rgba(79, 70, 229, 0.08);
  }
}
</style>
