<template>
  <div
    class="ls-sidebar w-16 h-full bg-white border-r border-slate-200 flex flex-col items-center py-6 z-30 shadow-[4px_0_24px_-12px_rgba(16,185,129,0.1)]"
  >
    <!-- Navigation -->
    <div class="flex-1 flex flex-col w-full px-3 gap-2">
      <SidebarItem
        icon="grid"
        :active="activeTab === 'dashboard'"
        @click="$emit('change-tab', 'dashboard')"
      />
      <SidebarItem
        icon="chat"
        :active="activeTab === 'normal-chat'"
        @click="$emit('change-tab', 'normal-chat')"
      />
    </div>

    <!-- Bottom -->
    <div class="mb-4 w-full px-3 gap-2 flex flex-col">
      <div class="w-full h-[1px] bg-slate-100 my-2"></div>
      <div
        :class="[
          'w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-colors flex-shrink-0',
          activeTab === 'settings'
            ? 'bg-emerald-100 text-emerald-600'
            : 'bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
        ]"
        @click="$emit('change-tab', 'settings')"
      >
        <svg
          class="w-[18px] h-[18px] flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import SidebarItem from './SidebarItem.vue'

defineProps<{
  activeTab: string
}>()

defineEmits<{
  (e: 'change-tab', tab: string): void
}>()
</script>
