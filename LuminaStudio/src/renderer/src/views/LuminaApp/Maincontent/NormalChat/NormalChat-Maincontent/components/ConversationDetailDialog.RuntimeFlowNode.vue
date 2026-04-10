<template>
  <div class="relative overflow-hidden rounded-[28px] border bg-white" :style="containerStyle">
    <Handle
      id="in"
      type="target"
      :position="Position.Left"
      class="nc-runtime-handle nc-runtime-handle-left"
    />
    <Handle
      id="out"
      type="source"
      :position="Position.Right"
      class="nc-runtime-handle nc-runtime-handle-right"
    />

    <div class="absolute inset-x-0 top-0 h-[46px]" :style="topBandStyle"></div>
    <div
      class="absolute left-[18px] top-[18px] h-[128px] w-1 rounded-full"
      :style="railStyle"
    ></div>
    <div
      class="absolute left-[16px] top-[16px] h-3 w-3 rounded-full border-2 border-white"
      :style="dotStyle"
    ></div>

    <div class="relative flex h-full flex-col gap-2 px-[36px] pb-4 pt-[18px]">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <p class="truncate text-[10px] font-bold uppercase tracking-[0.22em] text-[#7b8a97]">
            {{ kindText }}
          </p>
          <p class="mt-1 truncate text-[11px] font-semibold text-[#5f7381]">{{ data.meta }}</p>
        </div>
        <div class="max-w-[92px] rounded-full px-2.5 py-1 text-[10px] font-bold" :style="pillStyle">
          <span class="block truncate">{{ data.statusLabel }}</span>
        </div>
      </div>

      <div class="h-px bg-[#e8eef3]"></div>

      <div class="line-clamp-2 text-[15px] font-bold leading-[22px] text-[#10212b]">
        {{ data.title }}
      </div>
      <div class="line-clamp-2 text-[12px] leading-[18px] text-[#526673]">
        {{ data.subtitle }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import type { ChatDetailRuntimeNode } from '@renderer/stores/normal-chat/chat-detail-shell/chat-detail-shell.types'

const props = defineProps<{
  id?: string
  data: ChatDetailRuntimeNode & { isSelected?: boolean }
  selected?: boolean
}>()

const kindText = computed(() => {
  switch (props.data.kind) {
    case 'user-query':
      return 'USER REQUEST'
    case 'llm-call':
      return 'LLM CALL'
    case 'functioncall':
      return 'FUNCTIONCALL'
    case 'action':
      return 'SYSTEM ACTION'
    case 'subagent':
      return 'SUBAGENT'
    case 'runtime-hub':
      return 'RUNTIME HUB'
    default:
      return 'RUNTIME NODE'
  }
})

const isSelected = computed(() => Boolean(props.selected ?? props.data.isSelected))

const containerStyle = computed(() => ({
  width: `${props.data.width}px`,
  height: `${props.data.height}px`,
  borderColor: isSelected.value ? props.data.accentColor : props.data.borderColor,
  borderWidth: isSelected.value ? '2px' : '1.4px',
  background: isSelected.value ? `${props.data.accentColor}0f` : '#ffffff'
}))

const topBandStyle = computed(() => ({
  background: isSelected.value ? `${props.data.accentColor}1d` : `${props.data.accentColor}10`
}))

const railStyle = computed(() => ({
  background: props.data.accentColor
}))

const dotStyle = computed(() => ({
  background: props.data.accentColor
}))

const pillStyle = computed(() => ({
  color: props.data.accentColor,
  background: `${props.data.accentColor}20`
}))
</script>

<style scoped>
.nc-runtime-handle {
  width: 2px;
  height: 18px;
  border: none;
  border-radius: 0;
  background: transparent;
  top: 50%;
  transform: translateY(-50%);
}

.nc-runtime-handle::after {
  content: '';
  position: absolute;
  top: 0;
  width: 2px;
  height: 18px;
  border-radius: 999px;
  background: #94a3b8;
}

.nc-runtime-handle-left {
  left: -1px;
}

.nc-runtime-handle-left::after {
  left: 0;
}

.nc-runtime-handle-right {
  right: -1px;
}

.nc-runtime-handle-right::after {
  right: 0;
}
</style>
