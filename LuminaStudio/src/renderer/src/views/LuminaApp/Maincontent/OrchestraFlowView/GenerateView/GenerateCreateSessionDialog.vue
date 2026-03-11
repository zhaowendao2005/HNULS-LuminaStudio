<template>
  <div
    v-if="visible"
    class="of-generate-session-modal fixed inset-0 z-40 flex items-center justify-center p-6"
  >
    <div class="absolute inset-0 bg-black/20 backdrop-blur-sm" @click="$emit('close')"></div>
    <div class="relative w-full max-w-md border border-gray-200 bg-white p-6 shadow-2xl">
      <div class="text-sm font-semibold text-gray-800">新建会话</div>
      <div class="mt-2 text-xs leading-5 text-gray-500">
        这里只模拟输入会话名称，创建后会自动进入需求分析页面。
      </div>
      <div class="mt-4 space-y-3">
        <input
          :model-value="modelValue"
          type="text"
          placeholder="例如：后台权限管理模块"
          class="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none transition-all focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
          @input="$emit('update:model-value', ($event.target as HTMLInputElement).value)"
          @keydown.enter="$emit('confirm')"
        />
      </div>
      <div class="mt-6 flex items-center justify-end gap-2">
        <button
          type="button"
          class="px-3 py-1.5 text-xs text-gray-500 transition-colors hover:text-gray-700"
          @click="$emit('close')"
        >
          取消
        </button>
        <button
          type="button"
          class="bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          :disabled="!modelValue.trim()"
          @click="$emit('confirm')"
        >
          创建并进入
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
  modelValue: string
}>()

defineEmits<{
  (e: 'update:model-value', value: string): void
  (e: 'close'): void
  (e: 'confirm'): void
}>()
</script>
