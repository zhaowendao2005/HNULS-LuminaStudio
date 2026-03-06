<template>
  <div
    class="of-node of-iteration-node of-iteration-node-canvas group relative flex h-[417px] w-[650px] rounded-2xl border bg-white/70 p-0.5 pb-1 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-lg"
    :class="containerClass"
  >
    <Handle
      type="target"
      :position="Position.Left"
      id="target"
      class="of-node-handle of-handle-target of-iteration-target-handle"
    />
    <Handle
      type="source"
      :position="Position.Right"
      id="source"
      class="of-node-handle of-handle-source of-iteration-source-handle"
    />

    <div class="of-node-actions absolute -top-7 right-0 hidden h-7 pb-1 group-hover:flex">
      <div
        class="flex h-6 items-center rounded-lg border border-gray-200 bg-white px-1 text-gray-500 shadow-sm"
      >
        <div class="flex h-5 w-5 items-center justify-center rounded-md hover:bg-gray-100">
          <svg viewBox="0 0 24 24" class="h-3 w-3" fill="currentColor">
            <path
              d="M12 3a9 9 0 1 0 8.485 12H18l3.5 3.5L25 15h-2.54A11 11 0 1 1 12 1v2Zm-1 4h2v6h-2V7Zm0 8h2v2h-2v-2Z"
              transform="translate(-1)"
            />
          </svg>
        </div>
      </div>
    </div>

    <div class="flex h-full w-full flex-col rounded-[15px] border border-gray-200 bg-white/70">
      <div class="flex items-center rounded-t-2xl px-3 pb-2 pt-3">
        <div
          class="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-cyan-500 text-white shadow-md"
        >
          <svg
            viewBox="0 0 24 24"
            class="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path
              d="M20 11A8 8 0 1 0 6.062 16.938M20 11V4m0 7h-7M4 13a8 8 0 0 0 13.938 5.938M4 13v7m0-7h7"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <div
          class="mr-1 flex grow items-center truncate text-sm font-semibold uppercase tracking-wide text-gray-800"
        >
          {{ data.title || '迭代' }}
        </div>
        <div
          class="rounded-md bg-cyan-50 px-2 py-0.5 text-[10px] font-medium uppercase text-cyan-700"
        >
          {{ modeLabel }}
        </div>
      </div>

      <div class="grow px-1 pb-1">
        <div
          class="relative h-full w-full overflow-hidden rounded-2xl border border-gray-100/50 bg-[#f4f5f7]"
          :style="canvasBackgroundStyle"
        >
          <div
            class="absolute left-4 top-4 z-10 rounded-md border border-gray-100 bg-white px-3 py-1.5 text-sm text-gray-600 shadow-sm"
          >
            {{ data.preview?.label || '迭代开始' }}
          </div>

          <div class="absolute left-8 top-16 flex items-center">
            <div class="relative z-10 flex items-center">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-100 bg-white shadow-sm"
              >
                <div
                  class="flex h-6 w-6 items-center justify-center rounded-full bg-[#4460f1] text-white"
                >
                  <svg
                    viewBox="0 0 24 24"
                    class="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <path
                      d="M3 10.25 12 3l9 7.25M5 9.5V20h14V9.5M9 20v-5h6v5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div class="relative z-0 h-[2px] w-16 bg-gray-300"></div>

            <div
              class="z-10 w-[260px] cursor-default rounded-xl border border-gray-100 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_15px_rgba(0,0,0,0.08)]"
            >
              <div class="flex items-center border-b border-transparent px-4 py-3">
                <div class="mr-3 rounded-lg bg-[#7c5cfc] p-1.5 text-white">
                  <svg
                    viewBox="0 0 24 24"
                    class="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      d="M12 3v4m0 10v4m9-9h-4M7 12H3m15.364 6.364-2.828-2.828M8.464 8.464 5.636 5.636m12.728 0-2.828 2.828M8.464 15.536l-2.828 2.828"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </div>
                <span class="text-[15px] font-bold text-gray-800">
                  {{ llmPreviewTitle }}
                </span>
              </div>

              <div class="px-4 pb-4">
                <div
                  class="flex cursor-pointer items-center justify-between rounded-lg border border-gray-100/50 bg-gray-50/80 px-3 py-2 transition-colors hover:bg-gray-100/80"
                >
                  <div class="flex items-center space-x-2 overflow-hidden">
                    <div class="shrink-0 text-[#7c5cfc]">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="3"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                    </div>
                    <span class="truncate text-sm text-gray-600">{{ llmPreviewSubtitle }}</span>
                  </div>
                  <span
                    class="shrink-0 rounded bg-gray-200/60 px-1.5 py-0.5 text-[10px] font-medium tracking-wider text-gray-500"
                  >
                    CHAT
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div
            class="absolute bottom-4 right-4 flex items-center gap-2 rounded-xl bg-white/90 px-3 py-2 text-xs text-gray-600 shadow-sm"
          >
            <span class="rounded-full bg-cyan-50 px-2 py-0.5 font-medium text-cyan-700">
              {{ data.iterationCount }} 轮
            </span>
            <span>{{ data.mockTemplateId }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import {
  OFNodeRunningStatus,
  type OFIterationNodeData,
  type OFIterationPreviewNode
} from '@shared/Orchestraflow-types'

const props = defineProps<{
  data: OFIterationNodeData
}>()

const canvasBackgroundStyle = {
  backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)',
  backgroundSize: '14px 14px'
}

const runningStatus = computed(() => props.data?._runningStatus || OFNodeRunningStatus.NotStarted)
const containerClass = computed(() => {
  if (runningStatus.value === OFNodeRunningStatus.Running) return 'border-cyan-400 of-node-running'
  if (runningStatus.value === OFNodeRunningStatus.Succeeded) return 'border-emerald-500'
  if (runningStatus.value === OFNodeRunningStatus.Failed) return 'border-red-400'
  return 'border-transparent'
})

const previewNodes = computed(() => props.data.preview?.nodes || [])
const llmPreviewNode = computed<OFIterationPreviewNode | undefined>(() =>
  previewNodes.value.find((node) => node.type === 'llm')
)
const llmPreviewTitle = computed(() => llmPreviewNode.value?.title || 'LLM 2')
const llmPreviewSubtitle = computed(() => llmPreviewNode.value?.subtitle || 'Pro/moonshotai/Ki...')
const modeLabel = computed(() =>
  props.data.iterationMode === 'mock-source' ? 'MOCK SOURCE' : 'FIXED COUNT'
)
</script>

<style scoped>
.of-iteration-node {
  font-family: inherit;
}

.of-node-running {
  animation: ofIterationPulse 1.3s ease-in-out infinite;
}

.of-iteration-target-handle::after,
.of-iteration-source-handle::after {
  background: #06b6d4;
}

@keyframes ofIterationPulse {
  0%,
  100% {
    box-shadow:
      0 2px 6px rgba(0, 0, 0, 0.05),
      0 0 0 0 rgba(6, 182, 212, 0.18);
  }
  50% {
    box-shadow:
      0 8px 18px rgba(0, 0, 0, 0.08),
      0 0 0 6px rgba(6, 182, 212, 0.08);
  }
}
</style>
