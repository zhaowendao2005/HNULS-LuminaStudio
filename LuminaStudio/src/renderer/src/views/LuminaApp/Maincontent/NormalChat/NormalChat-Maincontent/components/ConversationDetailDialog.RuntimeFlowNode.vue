<template>
  <div class="relative" :style="containerStyle">
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

    <svg
      class="block overflow-visible"
      width="100%"
      height="100%"
      :viewBox="`0 0 ${width} ${height}`"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <rect
        x="1"
        y="1"
        :width="width - 2"
        :height="height - 2"
        rx="24"
        ry="24"
        :fill="backgroundFill"
        :stroke="strokeColor"
        :stroke-width="strokeWidth"
      />
      <line
        x1="18"
        y1="20"
        x2="18"
        :y2="height - 20"
        :stroke="accentColor"
        stroke-width="3"
        stroke-linecap="round"
      />
      <circle cx="18" cy="18" r="5" :fill="accentColor" />

      <text x="32" y="24" font-size="10" font-weight="700" letter-spacing="2.2" fill="#7b8a97">
        {{ kindText }}
      </text>
      <line x1="32" y1="56" :x2="width - 20" y2="56" stroke="#e7edf2" stroke-width="1" />

      <text x="32" y="90" font-size="17" font-weight="700" fill="#10212b">
        {{ titleText }}
      </text>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import type { ChatDetailRuntimeNode } from '@renderer/stores/normal-chat/chat-detail-shell/chat-detail-shell.types'

const props = defineProps<{
  data: ChatDetailRuntimeNode
  selected?: boolean
}>()

function trimText(value: string, limit: number): string {
  if (!value) {
    return ''
  }
  return value.length > limit ? `${value.slice(0, Math.max(0, limit - 1))}…` : value
}

const width = computed(() => props.data.width)
const height = computed(() => props.data.height)
const accentColor = computed(() => props.data.accentColor)
const strokeColor = computed(() =>
  props.selected ? props.data.accentColor : props.data.borderColor
)
const strokeWidth = computed(() => (props.selected ? 2.2 : 1.4))
const backgroundFill = computed(() => (props.selected ? `${props.data.accentColor}10` : '#ffffff'))
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

const titleText = computed(() => trimText(props.data.title, 28))

const containerStyle = computed(() => ({
  width: `${props.data.width}px`,
  height: `${props.data.height}px`
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
