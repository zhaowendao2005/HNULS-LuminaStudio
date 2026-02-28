<template>
  <div class="of-editor h-full w-full flex flex-col">
    <!-- 占位：Editor 视图将在阶段2实现 -->
    <div class="flex-1 flex items-center justify-center text-slate-400">
      <div class="text-center">
        <p class="text-lg mb-2">OrchestraFlow Editor</p>
        <p class="text-sm mb-4">工作流编辑器（阶段2实现）</p>
        <button
          @click="$emit('back')"
          class="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
        >
          返回列表
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  workflowId: string | null
}>()

defineEmits<{
  (e: 'back'): void
}>()
</script>
