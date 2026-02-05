<template>
  <section
    class="nc_NormalChat_RightPanel_a8d3 flex-shrink-0 bg-white border border-slate-200 rounded-2xl overflow-hidden transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col"
    :style="{ width: collapsed ? '64px' : '320px' }"
  >
    <div
      class="nc_NormalChat_RightHeader_a8d3 flex items-center border-b border-slate-100"
      :class="collapsed ? 'justify-center px-2 py-3' : 'justify-between px-4 py-3'"
    >
      <div v-if="!collapsed" class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-blue-500"></div>
        <span class="text-sm font-semibold text-slate-700">Studio</span>
      </div>
      <button
        class="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition-colors flex items-center justify-center"
        @click="$emit('update:collapsed', !collapsed)"
      >
        <svg
          class="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path v-if="collapsed" d="M15 6l-6 6 6 6" />
          <path v-else d="M9 6l6 6-6 6" />
        </svg>
      </button>
    </div>

    <div
      v-if="!collapsed"
      class="nc_NormalChat_RightContent_a8d3 flex-1 overflow-y-auto px-4 py-4"
    >
      <div class="grid grid-cols-2 gap-3">
        <button
          v-for="tool in tools"
          :key="tool.id"
          :class="[
            'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors',
            tool.color
          ]"
        >
          <span class="w-7 h-7 rounded-lg bg-white/60 flex items-center justify-center">
            <svg
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <template v-if="tool.icon === 'audio'">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="2" />
                <circle cx="18" cy="16" r="2" />
              </template>
              <template v-else-if="tool.icon === 'video'">
                <rect x="3" y="5" width="15" height="14" rx="2" />
                <path d="m18 9 4-2v10l-4-2z" />
              </template>
              <template v-else-if="tool.icon === 'mind'">
                <circle cx="9" cy="9" r="3" />
                <circle cx="17" cy="7" r="2" />
                <circle cx="17" cy="17" r="2" />
                <path d="M11.5 10.5l3-2" />
                <path d="M11.5 12.5l3 2" />
              </template>
              <template v-else-if="tool.icon === 'report'">
                <rect x="4" y="3" width="16" height="18" rx="2" />
                <path d="M8 7h8" />
                <path d="M8 11h8" />
                <path d="M8 15h5" />
              </template>
              <template v-else-if="tool.icon === 'cards'">
                <rect x="3" y="5" width="12" height="16" rx="2" />
                <rect x="9" y="3" width="12" height="16" rx="2" />
              </template>
              <template v-else-if="tool.icon === 'quiz'">
                <circle cx="12" cy="12" r="9" />
                <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.3-1 .7-1 1.7" />
                <circle cx="12" cy="17" r="1" />
              </template>
              <template v-else-if="tool.icon === 'info'">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 10v6" />
                <circle cx="12" cy="7" r="1" />
              </template>
              <template v-else-if="tool.icon === 'slides'">
                <rect x="3" y="4" width="18" height="12" rx="2" />
                <path d="M8 20h8" />
                <path d="M12 16v4" />
              </template>
              <template v-else>
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M7 8h10" />
                <path d="M7 12h10" />
                <path d="M7 16h10" />
              </template>
            </svg>
          </span>
          <span class="text-slate-700">{{ tool.title }}</span>
        </button>
      </div>

      <div class="mt-6 border-t border-slate-100 pt-4">
        <div class="text-xs font-semibold text-slate-500 mb-3">最近笔记</div>
        <div class="space-y-3">
          <div v-for="note in notes" :key="note.id" class="flex items-start gap-3">
            <div
              class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0"
            >
              <svg
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M4 4h16v12H7l-3 3V4z" />
              </svg>
            </div>
            <div class="min-w-0">
              <div class="text-sm text-slate-700 truncate">{{ note.title }}</div>
              <div class="text-[10px] text-slate-400 mt-1">{{ note.time }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="nc_NormalChat_RightCollapsed_a8d3 flex-1" />
  </section>
</template>

<script setup lang="ts">
defineProps<{
  collapsed: boolean
  tools: any[]
  notes: any[]
}>()

defineEmits<{
  (e: 'update:collapsed', value: boolean): void
}>()
</script>
