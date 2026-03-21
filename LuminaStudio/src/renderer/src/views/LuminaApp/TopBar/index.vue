<template>
  <header
    class="ls-topbar sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-8 backdrop-blur-md"
  >
    <div class="flex items-center gap-2 select-none text-sm text-slate-500">
      <span class="font-bold tracking-tight text-slate-800">Lumina</span>
      <span class="text-slate-300">/</span>
      <span class="capitalize text-slate-600">{{ activeTab }}</span>
    </div>

    <div
      :class="[
        'relative group flex-shrink-0 transition-all duration-300',
        searchFocused ? 'w-96' : 'w-64'
      ]"
    >
      <svg
        class="absolute left-3 top-2.5 h-[18px] w-[18px] flex-shrink-0 text-slate-400 transition-colors group-focus-within:text-emerald-500"
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
          class="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-400"
        >
          ⌘K
        </span>
      </div>
      <input
        type="text"
        placeholder="Search DNA, proteins, papers..."
        class="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-12 text-sm text-slate-800 transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        @focus="searchFocused = true"
        @blur="searchFocused = false"
      />
    </div>

    <div class="flex flex-shrink-0 items-center gap-4">
      <button
        v-if="showDebugButton"
        type="button"
        :class="[
          'relative flex-shrink-0 rounded-xl p-2.5 transition-colors',
          debugButtonActive
            ? 'border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-sm'
            : 'text-slate-400 hover:bg-slate-100 hover:text-emerald-600'
        ]"
        @click="$emit('debug-click')"
      >
        <svg
          class="h-5 w-5 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <path d="M8 9l3 3-3 3" />
          <path d="M13 15h3" />
        </svg>
      </button>
      <button
        type="button"
        class="relative flex-shrink-0 p-2 text-slate-400 transition-colors hover:text-emerald-600"
      >
        <svg
          class="h-5 w-5 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span
          class="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-emerald-500 shadow-sm"
        ></span>
      </button>
      <div class="hidden text-right lg:block">
        <div class="text-xs font-bold text-slate-800">Dr. Chen</div>
        <div class="text-[10px] font-medium tracking-wide text-emerald-600">Genomics Lead</div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue'

withDefaults(
  defineProps<{
    activeTab: string
    showDebugButton?: boolean
    debugButtonActive?: boolean
  }>(),
  {
    showDebugButton: false,
    debugButtonActive: false
  }
)

defineEmits<{
  (e: 'debug-click'): void
}>()

const searchFocused = ref(false)
</script>
