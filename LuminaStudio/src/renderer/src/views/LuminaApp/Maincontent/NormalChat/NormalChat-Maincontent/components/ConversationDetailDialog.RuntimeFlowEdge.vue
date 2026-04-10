<template>
  <svg style="overflow: visible; position: absolute; pointer-events: none">
    <BaseEdge :path="path" :style="pathStyle" />
    <text
      v-if="showLabel"
      :x="labelX"
      :y="labelY"
      text-anchor="middle"
      dominant-baseline="middle"
      fill="#607381"
      font-size="11"
      font-weight="600"
    >
      {{ labelText }}
    </text>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BaseEdge, getSmoothStepPath } from '@vue-flow/core'

const props = defineProps<{
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition: string
  targetPosition: string
  data?: {
    label?: string
    stroke?: string
    dashed?: boolean
    showLabel?: boolean
  }
}>()

const edgePath = computed(() =>
  getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    borderRadius: 16,
    offset: 24
  })
)

const path = computed(() => edgePath.value[0])
const labelX = computed(() => edgePath.value[1])
const labelY = computed(() => edgePath.value[2])
const labelText = computed(() => props.data?.label ?? '')
const showLabel = computed(() => Boolean(props.data?.showLabel && labelText.value))

const pathStyle = computed(() => ({
  stroke: props.data?.stroke ?? '#94a3b8',
  strokeWidth: 1.6,
  strokeDasharray: props.data?.dashed ? '7 8' : 'none',
  strokeLinecap: 'round'
}))
</script>
