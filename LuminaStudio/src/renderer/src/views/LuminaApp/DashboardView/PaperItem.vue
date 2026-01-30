<template>
  <div class="p-4 hover:bg-emerald-50/50 transition-colors flex items-center justify-between group cursor-pointer">
    <div class="flex items-start gap-4 min-w-0 flex-1">
      <div class="p-2 bg-white border border-emerald-100 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 flex-shrink-0">
        <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      </div>
      <div class="min-w-0 flex-1">
        <h4 class="text-sm font-semibold text-slate-900 group-hover:text-emerald-800 transition-colors truncate">{{ paper.title }}</h4>
        <p class="text-xs text-slate-500 mt-1 truncate">{{ paper.authors }} • <span class="italic">{{ paper.journal }}</span></p>
      </div>
    </div>
    <div class="flex items-center gap-4 flex-shrink-0">
      <span :class="[
        'text-xs px-2 py-1 rounded-md font-medium border',
        paper.status === 'Reading' ? 'bg-amber-50 text-amber-700 border-amber-100' :
        paper.status === 'New' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
        'bg-slate-50 text-slate-500 border-slate-100'
      ]">
        {{ paper.status }}
      </span>
      <span class="text-xs text-slate-400 w-20 text-right whitespace-nowrap">{{ paper.added }}</span>
      <button class="p-1 text-slate-300 hover:text-emerald-600 transition-colors flex-shrink-0">
        <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  paper: {
    id: number
    title: string
    authors: string
    journal: string
    status: string
    added: string
  }
}>()
</script>
