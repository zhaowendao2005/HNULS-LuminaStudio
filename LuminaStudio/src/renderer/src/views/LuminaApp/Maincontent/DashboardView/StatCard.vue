<template>
  <div
    class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-emerald-100/50 shadow-sm hover:shadow-lg hover:shadow-emerald-100/50 transition-all duration-300 flex flex-col justify-between h-40 group"
  >
    <div class="flex justify-between items-start">
      <div
        :class="[
          'p-3 rounded-xl transition-colors group-hover:scale-110 duration-300 flex-shrink-0',
          stat.bg,
          stat.color
        ]"
      >
        <svg
          class="w-5 h-5 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <template v-if="stat.icon === 'file'">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </template>
          <template v-else-if="stat.icon === 'dna'">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </template>
          <template v-else-if="stat.icon === 'sparkles'">
            <path d="M12 3v18m9-9H3m15.364 6.364L6.636 6.636m12.728 0L6.636 19.364" />
          </template>
        </svg>
      </div>
      <span
        class="text-xs font-medium px-2 py-1 rounded-full bg-white text-emerald-600 border border-emerald-100 shadow-sm"
      >
        {{ stat.trend }}
      </span>
    </div>
    <div>
      <h3 class="text-3xl font-bold text-slate-800 tracking-tight">{{ stat.value }}</h3>
      <p class="text-sm text-slate-500 font-medium mt-1">{{ stat.label }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  stat: {
    label: string
    value: string
    unit: string
    trend: string
    icon: string
    color: string
    bg: string
  }
}>()
</script>
