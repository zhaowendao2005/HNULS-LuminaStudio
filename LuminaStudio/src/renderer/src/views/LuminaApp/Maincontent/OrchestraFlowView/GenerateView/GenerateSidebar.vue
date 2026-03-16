<template>
  <aside class="gv-sidebar-p33 flex w-[220px] flex-col border-r border-slate-200 bg-slate-950 p-3">
    <div class="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
      导航
    </div>
    <button
      v-for="item in menus"
      :key="item.value"
      type="button"
      class="mb-2 flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors"
      :class="
        activeMenu === item.value
          ? 'bg-cyan-500 text-slate-950'
          : 'text-slate-300 hover:bg-slate-900'
      "
      @click="$emit('change-menu', item.value)"
    >
      <component :is="item.icon" class="h-4 w-4" />
      <span>{{ item.label }}</span>
    </button>
  </aside>
</template>

<script setup lang="ts">
import type { MenuItem } from './generate-view.types'

defineProps<{
  menus: MenuItem[]
  activeMenu: MenuItem['value']
}>()

defineEmits<{
  (e: 'change-menu', value: MenuItem['value']): void
}>()
</script>
