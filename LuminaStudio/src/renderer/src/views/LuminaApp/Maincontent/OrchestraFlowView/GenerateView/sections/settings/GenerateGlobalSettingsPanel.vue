<template>
  <section class="gv-settings-s34 p-5">
    <div class="rounded-2xl border border-slate-200 bg-white p-5">
      <div class="mb-2 text-sm font-semibold text-slate-900">全局设置</div>
      <label class="flex items-center gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-slate-300"
          :checked="modelValue"
          @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
        />
        <span>持久化原始 LLM 数据</span>
      </label>
      <div class="mt-2 text-xs text-slate-500">
        默认只保留消息与文档，不落库运行期 memory 与 trace。
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: boolean
}>()

defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()
</script>
