<template>
  <header
    class="ls-topbar h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 z-20 shrink-0 sticky top-0"
  >
    <div class="flex items-center gap-2 text-sm text-slate-500 select-none">
      <span class="font-bold text-slate-800 tracking-tight">Lumina</span>
      <span class="text-slate-300">/</span>
      <span class="capitalize text-slate-600">{{ activeTab }}</span>
    </div>

    <div
      :class="[
        'transition-all duration-300 relative group flex-shrink-0',
        searchFocused ? 'w-96' : 'w-64'
      ]"
    >
      <svg
        class="absolute left-3 top-2.5 w-[18px] h-[18px] flex-shrink-0 text-slate-400 group-focus-within:text-emerald-500 transition-colors"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <div class="absolute right-3 top-2.5 flex gap-1">
        <span
          class="text-[10px] font-mono bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded border border-slate-200"
        >
          ⌘K
        </span>
      </div>
      <input
        type="text"
        placeholder="Search DNA, proteins, papers..."
        class="w-full bg-slate-50/50 border border-slate-200 text-slate-800 text-sm rounded-lg pl-10 pr-12 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
        @focus="searchFocused = true"
        @blur="searchFocused = false"
      />
    </div>

    <div class="flex items-center gap-4 flex-shrink-0">
      <button
        class="relative p-2 text-slate-400 hover:text-emerald-600 transition-colors flex-shrink-0"
      >
        <svg
          class="w-5 h-5 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span
          class="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white shadow-sm"
        ></span>
      </button>
      <div class="text-right hidden lg:block">
        <div class="text-xs font-bold text-slate-800">Dr. Chen</div>
        <div class="text-[10px] text-emerald-600 font-medium tracking-wide">Genomics Lead</div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  activeTab: string
}>()

const searchFocused = ref(false)
</script>
