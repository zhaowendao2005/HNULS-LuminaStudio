<template>
  <div class="nc-test-message border-2 border-purple-300 bg-purple-50 rounded-xl p-4 shadow-sm">
    <!-- 标题区域 -->
    <div class="flex items-center gap-2 mb-3 pb-2 border-b border-purple-200">
      <div
        class="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center"
      >
        <span class="text-white text-xs font-bold">🧪</span>
      </div>
      <span class="text-sm font-semibold text-purple-700">测试消息（原始IPC数据）</span>
      <span class="ml-auto text-xs text-purple-400 font-mono">{{ message.id }}</span>
    </div>

    <!-- 原始数据展示 -->
    <div class="bg-white rounded-lg p-3 border border-purple-100 overflow-hidden">
      <pre class="text-xs text-slate-700 overflow-auto max-h-96 font-mono leading-relaxed">{{
        formattedData
      }}</pre>
    </div>

    <!-- 底部信息 -->
    <div class="mt-3 pt-2 border-t border-purple-100 flex items-center justify-between text-xs">
      <span class="text-purple-600">
        <span class="font-medium">数据大小:</span>
        {{ dataSize }}
      </span>
      <span class="text-purple-400">
        {{ message.createdAt || '刚刚' }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChatMessage } from '@renderer/stores/ai-chat/types'

const props = defineProps<{
  message: ChatMessage
}>()

const formattedData = computed(() => {
  if (props.message.rawData) {
    return JSON.stringify(props.message.rawData, null, 2)
  }
  return '无原始数据'
})

const dataSize = computed(() => {
  const str = formattedData.value
  const bytes = new Blob([str]).size
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
})
</script>
