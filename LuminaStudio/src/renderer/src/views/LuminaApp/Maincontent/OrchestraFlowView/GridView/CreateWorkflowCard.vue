<template>
  <div
    class="of-create-workflow-card relative col-span-1 inline-flex h-[160px] flex-col justify-between rounded-xl border-[0.5px] border-slate-200 bg-white transition-all hover:border-emerald-300 hover:shadow-md"
  >
    <div class="grow rounded-t-xl p-2">
      <div class="px-6 pb-1 pt-2 text-xs font-medium leading-[18px] text-slate-500">创建工作流</div>
      <button
        type="button"
        class="mb-1 flex w-full cursor-pointer items-center rounded-lg px-6 py-[7px] text-[13px] font-medium leading-[18px] text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
        @click="$emit('create')"
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
        class="flex w-full cursor-pointer items-center rounded-lg px-6 py-[7px] text-[13px] font-medium leading-[18px] text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
        @click="$emit('smart-create')"
      >
        <svg class="mr-2 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9.813 15.904L9 18l-1.813-2.096a5.5 5.5 0 01-1.91-2.402L3 12l2.277-1.502a5.5 5.5 0 011.91-2.402L9 6l.813 2.096a5.5 5.5 0 012.402 1.91L14 12l-1.785 2.094a5.5 5.5 0 01-2.402 1.81zM16 7h5m-2.5-2.5v5M17 17l2 2 4-4"
          />
        </svg>
        智能创建工作流
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  (e: 'create'): void
  (e: 'smart-create'): void
}>()
</script>
