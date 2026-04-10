<template>
  <BaseEdge :path="path" :style="pathStyle" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BaseEdge, getStraightPath } from '@vue-flow/core'

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
  }
}>()

const edgePath = computed(() =>
  getStraightPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY
  })
)

const path = computed(() => edgePath.value[0])

const pathStyle = computed(() => ({
  stroke: props.data?.stroke ?? '#94a3b8',
  strokeWidth: 1.5,
  strokeDasharray: props.data?.dashed ? '6 6' : 'none',
  strokeLinecap: 'round',
  opacity: 0.92
}))
</script>
