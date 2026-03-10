<template>
  <div
    class="of-create-workflow-card relative col-span-1 inline-flex h-[160px] flex-col justify-between rounded-xl border-[0.5px] border-slate-200 bg-white transition-all hover:border-emerald-300 hover:shadow-md cursor-pointer"
    @click="$emit('create')"
  >
    <div class="grow rounded-t-xl p-2">
      <div class="px-6 pb-1 pt-2 text-xs font-medium leading-[18px] text-slate-500">创建工作流</div>
      <button
        type="button"
        class="mb-1 flex w-full cursor-pointer items-center rounded-lg px-6 py-[7px] text-[13px] font-medium leading-[18px] text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
        @click.stop="$emit('create')"
      >
        <svg class="mr-2 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        从空白开始
      </button>
      <button
        type="button"
        class="mb-1 flex w-full cursor-pointer items-center rounded-lg px-6 py-[7px] text-[13px] font-medium leading-[18px] text-slate-600 hover:bg-cyan-50 hover:text-cyan-700 transition-colors"
        @click.stop="$emit('generate')"
      >
        <svg class="mr-2 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        智能生成工作流
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  (e: 'create'): void
  (e: 'generate'): void
}>()
</script>
