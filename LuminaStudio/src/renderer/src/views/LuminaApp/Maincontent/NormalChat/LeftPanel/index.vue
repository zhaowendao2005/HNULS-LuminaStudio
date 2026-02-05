<template>
  <section
    class="nc_NormalChat_LeftPanel_a8d3 flex-shrink-0 bg-white border border-slate-200 rounded-2xl overflow-hidden transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col"
    :style="{ width: collapsed ? '64px' : '320px' }"
  >
    <div
      class="nc_NormalChat_LeftHeader_a8d3 flex items-center gap-2 border-b border-slate-100"
      :class="collapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'"
    >
      <div v-if="!collapsed" class="flex-1 min-w-0">
        <WhiteSelect
          :model-value="currentTab"
          @update:model-value="$emit('update:currentTab', $event)"
          :options="tabOptions"
          placeholder="选择页面"
          trigger-class="!px-3 !py-2 !text-sm !font-semibold border-0 hover:bg-slate-50"
        />
      </div>
      <button
        class="w-7 h-7 flex-shrink-0 rounded-lg border border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition-colors flex items-center justify-center"
        @click="$emit('update:collapsed', !collapsed)"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path v-if="collapsed" d="M9 6l6 6-6 6" />
          <path v-else d="M15 18l-6-6 6-6" />
        </svg>
      </button>
    </div>

    <div
      v-if="!collapsed"
      class="nc_NormalChat_LeftContent_a8d3 flex-1 overflow-y-auto px-4 py-4 space-y-4"
    >
      <!-- Tab: 来源 -->
      <SourcesTab v-if="currentTab === 'sources'" />

      <!-- Tab: 设置 -->
      <div v-else-if="currentTab === 'settings'" class="space-y-4">
        <div class="text-center text-slate-400 py-8">
          <svg
            class="w-12 h-12 mx-auto mb-3 text-slate-300"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="3" />
            <path
              d="M12 1v6m0 6v6m-9-9h6m6 0h6M4.93 4.93l4.24 4.24m5.66 5.66l4.24 4.24M4.93 19.07l4.24-4.24m5.66-5.66l4.24-4.24"
            />
          </svg>
          <p class="text-sm">设置功能开发中...</p>
        </div>
      </div>

      <!-- Tab: 历史 -->
      <div v-else-if="currentTab === 'history'" class="space-y-4">
        <div class="text-center text-slate-400 py-8">
          <svg
            class="w-12 h-12 mx-auto mb-3 text-slate-300"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <p class="text-sm">历史记录功能开发中...</p>
        </div>
      </div>
    </div>
    <div v-else class="nc_NormalChat_LeftCollapsed_a8d3 flex-1" />
  </section>
</template>

<script setup lang="ts">
import WhiteSelect, { type WhiteSelectOption } from '../components/WhiteSelect.vue'
import SourcesTab from './SourcesTab.vue'

defineProps<{
  collapsed: boolean
  currentTab: string
  tabOptions: WhiteSelectOption[]
}>()

defineEmits<{
  (e: 'update:collapsed', value: boolean): void
  (e: 'update:currentTab', value: string): void
}>()
</script>
