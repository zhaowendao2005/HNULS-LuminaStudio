<template>
  <div
    class="of-node of-paper-retrieval-node group relative w-[248px] rounded-[15px] border bg-[#f3f4f6] pb-1 shadow-sm transition-all hover:shadow-lg"
    :class="containerClass"
  >
    <Handle
      id="target"
      type="target"
      :position="Position.Left"
      class="of-node-handle of-handle-target of-paper-retrieval-target-handle"
    />
    <Handle
      id="source"
      type="source"
      :position="Position.Right"
      class="of-node-handle of-handle-source of-paper-retrieval-source-handle"
    />

    <div class="px-4 pt-3 text-xs font-medium tracking-wide text-gray-500">PAPER</div>

    <div class="flex items-center rounded-t-2xl px-3 pb-2 pt-3">
      <div
        class="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M7 4.75h7.25L19 9.5v9.75A1.75 1.75 0 0 1 17.25 21h-10.5A1.75 1.75 0 0 1 5 19.25v-12.5A1.75 1.75 0 0 1 6.75 5h.25"
          />
          <path stroke-linecap="round" stroke-linejoin="round" d="M14 5v5h5" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h8M8 15.5h6" />
        </svg>
      </div>
      <div
        class="mr-1 min-w-0 flex grow items-center truncate text-base font-semibold text-gray-900"
      >
        {{ data.title || '论文检索' }}
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
          <span class="truncate">{{ providerSummary }}</span>
          <span>{{ resultLimit }}</span>
        </div>
        <div class="mt-2 truncate text-xs text-gray-700" :title="queryPreview">
          {{ queryPreview }}
        </div>
        <div class="mt-2 flex flex-wrap gap-1.5">
          <span class="rounded-md bg-white/75 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
            {{ sortSummary }}
          </span>
          <span
            class="rounded-md bg-white/75 px-2 py-0.5 text-[10px] font-medium"
            :class="apiKeyStatusClass"
          >
            {{ apiKeySummary }}
          </span>
          <span
            v-if="dateSummary"
            class="rounded-md bg-white/75 px-2 py-0.5 text-[10px] font-medium text-violet-700"
          >
            {{ dateSummary }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { OFNodeRunningStatus, type OFPaperRetrievalNodeData } from '@shared/Orchestraflow-types'

const props = defineProps<{
  data: OFPaperRetrievalNodeData
}>()

const runningStatus = computed(() => props.data?._runningStatus || OFNodeRunningStatus.NotStarted)

const providerSummary = computed(() => {
  return props.data.provider_id?.trim() || '未选择 Provider'
})

const resultLimit = computed(() => `TOP ${Math.max(1, props.data.top_k || 0)}`)

const queryPreview = computed(() => {
  const firstPrompt = (props.data.query_template || []).find((item) => item.text?.trim())
  if (!firstPrompt?.text) return '未配置查询模板'
  const normalized = firstPrompt.text.replace(/\s+/g, ' ').trim()
  return normalized.length > 30 ? `${normalized.slice(0, 30)}...` : normalized
})

const sortSummary = computed(() => {
  if (props.data.sort_by === 'date_desc') return '最新优先'
  if (props.data.sort_by === 'date_asc') return '最早优先'
  return '相关度'
})

const apiKeySummary = computed(() => {
  return props.data.api_key_ref_id ? '已绑定 Key' : '未绑定 Key'
})

const apiKeyStatusClass = computed(() => {
  return props.data.api_key_ref_id ? 'text-cyan-700' : 'text-gray-500'
})

const dateSummary = computed(() => {
  if (!props.data.date_from && !props.data.date_to) return ''
  return `${props.data.date_from || '不限'} ~ ${props.data.date_to || '不限'}`
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

.of-paper-retrieval-target-handle::after,
.of-paper-retrieval-source-handle::after {
  background: #10b981;
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
