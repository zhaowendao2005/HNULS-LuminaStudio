<template>
  <div class="space-y-5">
    <div class="space-y-3 rounded border border-gray-200 bg-white p-4">
      <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">需求讨论</div>
      <label class="block text-xs text-gray-500">上下文记忆数</label>
      <input
        :value="discussionMemory"
        type="range"
        min="1"
        max="12"
        class="w-full"
        @input="
          $emit('update:discussion-memory', Number(($event.target as HTMLInputElement).value))
        "
      />
      <div class="text-xs text-gray-600">当前保留 {{ discussionMemory }} 轮需求讨论上下文</div>
    </div>

    <div class="space-y-3 rounded border border-gray-200 bg-white p-4">
      <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">预计划</div>
      <label class="block text-xs text-gray-500">预计划记忆数</label>
      <input
        :value="preplanMemory"
        type="range"
        min="1"
        max="12"
        class="w-full"
        @input="$emit('update:preplan-memory', Number(($event.target as HTMLInputElement).value))"
      />
      <div class="text-xs text-gray-600">当前保留 {{ preplanMemory }} 轮预计划上下文</div>
    </div>

    <div class="space-y-3 rounded border border-gray-200 bg-white p-4">
      <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">copilot</div>
      <label class="block text-xs text-gray-500">copilot 上下文记忆数</label>
      <input
        :value="copilotMemory"
        type="range"
        min="1"
        max="12"
        class="w-full"
        @input="$emit('update:copilot-memory', Number(($event.target as HTMLInputElement).value))"
      />
      <div class="text-xs text-gray-600">
        当前保留 {{ copilotMemory }} 轮需求分析 copilot 上下文
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  discussionMemory: number
  preplanMemory: number
  copilotMemory: number
}>()

defineEmits<{
  (e: 'update:discussion-memory', value: number): void
  (e: 'update:preplan-memory', value: number): void
  (e: 'update:copilot-memory', value: number): void
}>()
</script>
