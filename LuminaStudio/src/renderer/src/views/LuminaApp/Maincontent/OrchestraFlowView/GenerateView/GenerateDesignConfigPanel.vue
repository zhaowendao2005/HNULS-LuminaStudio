<template>
  <div class="space-y-5 rounded border border-gray-200 bg-white p-4">
    <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">规划设计配置</div>
    <label class="block text-xs text-gray-500">设计正文记忆数</label>
    <input
      :value="designMemory"
      type="range"
      min="1"
      max="12"
      class="w-full"
      @input="$emit('update:design-memory', Number(($event.target as HTMLInputElement).value))"
    />
    <div class="text-xs text-gray-600">当前保留 {{ designMemory }} 轮规划设计上下文</div>

    <label class="block text-xs text-gray-500">copilot 记忆数</label>
    <input
      :value="copilotMemory"
      type="range"
      min="1"
      max="12"
      class="w-full"
      @input="$emit('update:copilot-memory', Number(($event.target as HTMLInputElement).value))"
    />
    <div class="text-xs text-gray-600">当前保留 {{ copilotMemory }} 轮设计 copilot 上下文</div>

    <label class="block text-xs text-gray-500">校准上下文预算上限</label>
    <input
      :value="calibrationContextBudgetChars"
      type="number"
      min="20000"
      step="10000"
      class="w-full rounded border border-gray-200 px-3 py-2 text-xs text-gray-700 outline-none focus:border-cyan-400"
      @input="
        $emit(
          'update:calibration-context-budget-chars',
          Number(($event.target as HTMLInputElement).value || 100000)
        )
      "
    />
    <div class="text-xs text-gray-600">
      当前校准 agent 最多读取
      {{ calibrationContextBudgetChars }} 个字符的上下文，超出部分会按规则裁剪。
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  designMemory: number
  copilotMemory: number
  calibrationContextBudgetChars: number
}>()

defineEmits<{
  (e: 'update:design-memory', value: number): void
  (e: 'update:copilot-memory', value: number): void
  (e: 'update:calibration-context-budget-chars', value: number): void
}>()
</script>
