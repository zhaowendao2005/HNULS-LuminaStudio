<template>
  <button 
    @click="$emit('click')"
    :class="[
      'w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 mb-4 group relative',
      active 
        ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-200' 
        : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-700'
    ]"
  >
    <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <template v-if="icon === 'grid'">
        <rect x="3" y="3" width="7" height="7"/>
        <rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
      </template>
      <template v-else-if="icon === 'file'">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </template>
      <template v-else-if="icon === 'network'">
        <circle cx="12" cy="12" r="2"/>
        <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
      </template>
      <template v-else-if="icon === 'settings'">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m-2 2l-4.2 4.2m13.2-5.2l-4.2-4.2m-2-2l-4.2-4.2"/>
      </template>
    </svg>
    <div v-if="!active" class="absolute right-2 top-2 w-1.5 h-1.5 bg-emerald-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
  </button>
</template>

<script setup lang="ts">
defineProps<{
  icon: string
  active: boolean
}>()

defineEmits<{
  (e: 'click'): void
}>()
</script>
