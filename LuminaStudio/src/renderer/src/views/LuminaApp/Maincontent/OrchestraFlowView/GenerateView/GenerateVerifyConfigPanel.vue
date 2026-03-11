<template>
  <div class="space-y-5 rounded border border-gray-200 bg-white p-4">
    <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">校验配置</div>
    <label class="block text-xs text-gray-500">校验面板记忆数</label>
    <input
      :value="verifyMemory"
      type="range"
      min="1"
      max="12"
      class="w-full"
      @input="$emit('update:verify-memory', Number(($event.target as HTMLInputElement).value))"
    />
    <div class="text-xs text-gray-600">当前保留 {{ verifyMemory }} 轮校验上下文</div>

    <label class="block text-xs text-gray-500">copilot 记忆数</label>
    <input
      :value="copilotMemory"
      type="range"
      min="1"
      max="12"
      class="w-full"
      @input="$emit('update:copilot-memory', Number(($event.target as HTMLInputElement).value))"
    />
    <div class="text-xs text-gray-600">当前保留 {{ copilotMemory }} 轮校验 copilot 上下文</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  verifyMemory: number
  copilotMemory: number
}>()

defineEmits<{
  (e: 'update:verify-memory', value: number): void
  (e: 'update:copilot-memory', value: number): void
}>()
</script>
