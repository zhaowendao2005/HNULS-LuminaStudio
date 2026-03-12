<template>
  <div class="mt-2 space-y-2">
    <div
      v-for="index in rows"
      :key="index"
      class="h-3 animate-pulse rounded bg-gray-200/80"
      :style="{ width: `${getRowWidth(index)}%` }"
    ></div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    rows?: number
  }>(),
  {
    rows: 2
  }
)

/**
 * 骨架屏宽度故意做成有层次的，
 * 这样看起来更像“正在一条条生成内容”，而不是整块灰条。
 */
function getRowWidth(index: number): number {
  const widths = [92, 78, 64, 86]
  return widths[(index - 1) % widths.length]
}
</script>
