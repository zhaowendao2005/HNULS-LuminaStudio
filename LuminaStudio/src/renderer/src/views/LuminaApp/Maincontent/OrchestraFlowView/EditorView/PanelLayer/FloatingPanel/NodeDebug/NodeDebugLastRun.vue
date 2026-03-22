<template>
  <div class="space-y-3">
    <div v-if="loading" class="py-10 text-center">
      <div
        class="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"
      />
      <div class="mt-3 text-sm text-gray-400">运行中...</div>
    </div>

    <div v-else-if="!result" class="py-6 text-center text-sm text-gray-400">暂无运行记录</div>

    <template v-else>
      <div class="rounded-lg border px-3 py-2" :class="statusClass">
        <div class="text-sm font-semibold">{{ statusText }}</div>
        <div class="text-xs opacity-80">耗时 {{ result.elapsed_time || 0 }}ms</div>
      </div>

      <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
        <div class="mb-1 text-xs uppercase text-gray-500">输入</div>
        <pre class="text-xs text-gray-700 whitespace-pre-wrap break-all">{{
          pretty(result.inputs)
        }}</pre>
      </div>

      <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
        <div class="mb-1 flex items-center justify-between gap-2">
          <div class="text-xs uppercase text-gray-500">输出</div>
          <button
            v-if="outputEntries.length > 0"
            type="button"
            class="text-[11px] font-medium text-cyan-600 transition-colors hover:text-cyan-700"
            @click="openOutputDetail('输出', result.outputs)"
          >
            查看完整对象
          </button>
        </div>

        <div v-if="outputEntries.length > 0" class="space-y-1.5">
          <button
            v-for="entry in outputEntries"
            :key="entry.key"
            type="button"
            class="flex w-full items-center gap-2 rounded-md border border-transparent bg-white px-2.5 py-2 text-left text-xs transition hover:border-cyan-200 hover:bg-cyan-50"
            @click="openOutputDetail(`输出 · ${entry.key}`, entry.value, entry.typeLabel)"
          >
            <span
              class="inline-flex shrink-0 rounded-md bg-cyan-100 px-2 py-0.5 text-[11px] font-semibold text-cyan-700"
            >
              {{ entry.key }}
            </span>
            <span class="min-w-0 flex-1 truncate text-gray-600">
              {{ entry.preview }}
            </span>
            <span class="shrink-0 text-[10px] uppercase tracking-wide text-gray-400">
              {{ entry.typeLabel }}
            </span>
          </button>
        </div>

        <pre v-else class="text-xs text-gray-700 whitespace-pre-wrap break-all">{{
          pretty(result.outputs)
        }}</pre>
      </div>

      <div
        v-if="result.error"
        class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600"
      >
        {{ result.error }}
      </div>
    </template>

    <CenteredDialog
      :model-value="detailTarget !== null"
      :title="detailTitle"
      :subtitle="detailSubtitle"
      :close-on-mask="true"
      max-width="980px"
      @update:model-value="handleDetailVisibleChange"
    >
      <div class="flex max-h-[70vh] flex-col gap-3">
        <div
          class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600"
        >
          点击输出对象名后，可以在这里查看完整内容，便于检查嵌套字段和中间结果。
        </div>

        <pre
          class="max-h-[60vh] overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs leading-5 text-gray-700 whitespace-pre-wrap break-all"
        >
          {{ detailContent }}
        </pre>

        <div class="flex justify-end">
          <button
            type="button"
            class="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-50"
            @click="closeOutputDetail"
          >
            关闭
          </button>
        </div>
      </div>
    </CenteredDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { OFNodeDebugResult } from '@shared/Orchestraflow-types'
import { OFNodeRunningStatus } from '@shared/Orchestraflow-types'
import CenteredDialog from '@renderer/views/LuminaApp/Maincontent/OrchestraFlowView/EditorView/Common/CenteredDialog.vue'

interface DebugDetailTarget {
  title: string
  subtitle: string
  value: unknown
}

interface DebugOutputEntry {
  key: string
  preview: string
  typeLabel: string
  value: unknown
}

const props = defineProps<{
  result?: OFNodeDebugResult
  loading?: boolean
}>()

const detailTarget = ref<DebugDetailTarget | null>(null)

const statusText = computed(() => {
  if (!props.result) return '未运行'
  if (props.result.status === OFNodeRunningStatus.Succeeded) return '运行成功'
  if (props.result.status === OFNodeRunningStatus.Failed) return '运行失败'
  return props.result.status
})

const statusClass = computed(() => {
  if (!props.result) return 'border-gray-200 bg-gray-50 text-gray-700'
  return props.result.status === OFNodeRunningStatus.Succeeded
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-red-200 bg-red-50 text-red-700'
})

const outputEntries = computed<DebugOutputEntry[]>(() => {
  const outputs = props.result?.outputs
  if (!isPlainObject(outputs)) {
    return []
  }

  // 中文注释：输出是对象时，优先把顶层字段拆开，方便直接点字段名看完整内容。
  return Object.entries(outputs).map(([key, value]) => ({
    key,
    preview: formatPreview(value),
    typeLabel: describeValue(value),
    value
  }))
})

const detailTitle = computed(() => detailTarget.value?.title || '对象详情')
const detailSubtitle = computed(() => detailTarget.value?.subtitle || '完整内容')
const detailContent = computed(() => formatPretty(detailTarget.value?.value))

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function describeValue(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return `array(${value.length})`
  if (typeof value === 'object') return 'object'
  return typeof value
}

function formatPreview(value: unknown): string {
  if (value === undefined) return '(空)'
  if (value === null) return 'null'
  if (typeof value === 'string') {
    return value.length > 48 ? `${value.slice(0, 48)}...` : value
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  if (Array.isArray(value)) {
    return value.length === 0 ? '[]' : `[${value.length} 项]`
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value)
    if (keys.length === 0) return '{}'
    return `{ ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ' ...' : ''} }`
  }
  return String(value)
}

function formatPretty(value: unknown): string {
  if (value === undefined) return '(空)'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function openOutputDetail(title: string, value: unknown, subtitle = '完整内容'): void {
  detailTarget.value = {
    title,
    subtitle,
    value
  }
}

function closeOutputDetail(): void {
  detailTarget.value = null
}

function handleDetailVisibleChange(visible: boolean): void {
  if (!visible) {
    closeOutputDetail()
  }
}

function pretty(value: unknown): string {
  if (value === undefined) return '(空)'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}
</script>
