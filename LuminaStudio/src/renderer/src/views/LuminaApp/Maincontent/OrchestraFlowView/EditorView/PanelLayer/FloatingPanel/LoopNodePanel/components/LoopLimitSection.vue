<template>
  <section class="of-doc-section">
    <div class="of-doc-section">
      <div class="of-doc-title-strong">最大循环次数</div>
      <p class="of-doc-line-soft">限制单次运行的最大迭代次数，避免循环失控。</p>
    </div>

    <div class="of-condition-line">
      <span>本次循环最多执行</span>
      <input
        :value="modelValue"
        type="number"
        min="1"
        class="of-condition-input w-16 text-center font-semibold text-violet-700"
        :class="theme.controlFocusClass"
        @input="updateValue(Number(($event.target as HTMLInputElement).value || 1))"
      />
      <span>次，超过上限后自动结束。</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { OFPanelTheme } from '../../panel-theme'

defineProps<{
  modelValue: number
  theme: OFPanelTheme
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

function updateValue(value: number) {
  emit('update:modelValue', Math.max(1, Number.isFinite(value) ? Math.trunc(value) : 1))
}
</script>

<style scoped src="../../../../../styles/node-panel.scss"></style>
