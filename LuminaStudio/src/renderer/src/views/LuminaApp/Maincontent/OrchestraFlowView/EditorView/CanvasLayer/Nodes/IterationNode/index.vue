<template>
  <div
    class="of-node of-iteration-node of-iteration-node-canvas group relative rounded-[22px] border border-[#eceef3] bg-[#fbfbfc] shadow-[0_2px_10px_rgba(15,23,42,0.04)]"
    :class="containerClass"
    :style="containerStyle"
  >
    <NodeResizer
      :min-width="560"
      :min-height="360"
      :color="'#32acd0'"
      :handle-style="resizerHandleStyle"
      :line-style="resizerLineStyle"
      @resize-start="handleResizeStart"
      @resize="handleResize"
      @resize-end="handleResizeEnd"
    />

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

    <div class="relative h-full w-full overflow-hidden rounded-[22px]">
      <div
        v-if="resizePreview"
        class="pointer-events-none absolute inset-0 z-20 rounded-[22px] border-2 border-[#32acd0]/70 bg-[#32acd0]/[0.05] shadow-[0_0_0_1px_rgba(50,172,208,0.08)]"
      >
        <div class="absolute bottom-4 right-4 rounded-lg bg-white/95 px-2.5 py-1 text-[11px] font-medium text-[#0f172a] shadow-sm">
          {{ Math.round(resolvedWidth) }} × {{ Math.round(resolvedHeight) }}
        </div>
      </div>

      <div class="flex items-center gap-3 px-4 pb-3 pt-4">
        <div
          class="flex h-8 w-8 items-center justify-center rounded-xl bg-[#35abd0] text-white shadow-sm"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.2">
            <path
              d="M20 11A8 8 0 1 0 6.062 16.938M20 11V4m0 7h-7M4 13a8 8 0 0 0 13.938 5.938M4 13v7m0-7h7"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <div class="truncate text-[15px] font-semibold text-[#111827]">
          {{ data.title || '迭代 2' }}
        </div>
      </div>

      <div class="px-2 pb-2">
        <div
          class="of-iteration-node__inner nodrag relative h-full min-h-[300px] rounded-[20px] border border-[#edf0f4] bg-[#f5f6f8]"
          :style="innerCanvasStyle"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { NodeResizer } from '@vue-flow/node-resizer'
import {
  OFNodeRunningStatus,
  type OFIterationNodeData
} from '@shared/Orchestraflow-types'
import { useWorkflowEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor.store'

import '@vue-flow/node-resizer/dist/style.css'

const props = defineProps<{
  id: string
  data: OFIterationNodeData
}>()

const editorStore = useWorkflowEditorStore()
const resizePreview = ref<{ width: number; height: number } | null>(null)

const resolvedWidth = computed(() => resizePreview.value?.width || props.data.width || 650)
const resolvedHeight = computed(() => resizePreview.value?.height || props.data.height || 417)

const containerStyle = computed(() => ({
  width: `${resolvedWidth.value}px`,
  height: `${resolvedHeight.value}px`
}))

const runningStatus = computed(() => props.data?._runningStatus || OFNodeRunningStatus.NotStarted)

const containerClass = computed(() => {
  if (runningStatus.value === OFNodeRunningStatus.Running) return 'border-cyan-400 of-node-running'
  if (runningStatus.value === OFNodeRunningStatus.Succeeded) return 'border-emerald-500'
  if (runningStatus.value === OFNodeRunningStatus.Failed) return 'border-red-400'
  return 'border-[#eceef3]'
})

const resizerHandleStyle = {
  width: '12px',
  height: '12px',
  borderRadius: '9999px',
  background: '#32acd0',
  border: '2px solid white',
  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.12)'
}

const resizerLineStyle = {
  borderColor: 'transparent'
}

const innerCanvasStyle = computed(() => ({
  height: `${Math.max(300, resolvedHeight.value - 78)}px`
}))

function handleResizeStart() {
  resizePreview.value = {
    width: props.data.width || 650,
    height: props.data.height || 417
  }
}

function handleResize(event: { params?: { width?: number; height?: number } }) {
  if (!event?.params?.width || !event?.params?.height) return
  resizePreview.value = {
    width: Math.round(event.params.width),
    height: Math.round(event.params.height)
  }
}

function handleResizeEnd(event: { params?: { width?: number; height?: number } }) {
  if (!event?.params?.width || !event?.params?.height) {
    resizePreview.value = null
    return
  }
  editorStore.resizeIterationNode(props.id, event.params.width, event.params.height)
  resizePreview.value = null
}
</script>

<style scoped>
.of-iteration-node {
  font-family: inherit;
}

.of-iteration-node__inner {
  background-image: radial-gradient(#d8dde6 1px, transparent 1px);
  background-size: 18px 18px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.72),
    inset 0 -1px 0 rgba(15, 23, 42, 0.02);
}

.of-node-running {
  animation: ofIterationPulse 1.3s ease-in-out infinite;
}

.of-iteration-target-handle::after,
.of-iteration-source-handle::after {
  background: #35abd0;
}

.of-iteration-node :deep(.vue-flow__resize-control.line) {
  border-color: transparent !important;
}

.of-iteration-node :deep(.vue-flow__resize-control.handle) {
  opacity: 0;
  pointer-events: none;
}

.of-iteration-node :deep(.vue-flow__resize-control.handle.bottom.right) {
  opacity: 1;
  pointer-events: auto;
}

@keyframes ofIterationPulse {
  0%,
  100% {
    box-shadow:
      0 2px 10px rgba(15, 23, 42, 0.05),
      0 0 0 0 rgba(53, 171, 208, 0.16);
  }
  50% {
    box-shadow:
      0 10px 26px rgba(15, 23, 42, 0.08),
      0 0 0 6px rgba(53, 171, 208, 0.06);
  }
}
</style>
