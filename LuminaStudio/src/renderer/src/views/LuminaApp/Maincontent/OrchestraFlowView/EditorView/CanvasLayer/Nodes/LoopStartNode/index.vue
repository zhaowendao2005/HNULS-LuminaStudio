<template>
  <div
    class="of-node of-loop-start-node group relative rounded-[20px] border border-[#f5e7ab] bg-white p-3 shadow-[0_2px_10px_rgba(15,23,42,0.04)]"
    :class="containerClass"
    style="--of-handle-top: 23px"
  >
    <Handle
      type="source"
      :position="Position.Right"
      id="source"
      class="of-node-handle of-handle-source of-loop-start-source-handle"
    />

    <div class="flex h-9 w-9 items-center justify-center rounded-full bg-[#d4a514] text-white">
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2.2"
          d="M3 11l9-8 9 8v10a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V11z"
        />
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { OFNodeRunningStatus, type OFLoopStartNodeData } from '@shared/Orchestraflow-types'

const props = defineProps<{
  data: OFLoopStartNodeData
}>()

const runningStatus = computed(() => props.data?._runningStatus || OFNodeRunningStatus.NotStarted)
const containerClass = computed(() => {
  if (runningStatus.value === OFNodeRunningStatus.Running)
    return 'border-amber-300 shadow-[0_0_0_4px_rgba(250,204,21,0.10)]'
  if (runningStatus.value === OFNodeRunningStatus.Succeeded) return 'border-emerald-400'
  if (runningStatus.value === OFNodeRunningStatus.Failed) return 'border-red-300'
  return ''
})
</script>

<style scoped>
.of-loop-start-node {
  width: 60px;
  height: 60px;
  font-family: inherit;
}

.of-loop-start-source-handle::after {
  background: #d4a514;
}
</style>
