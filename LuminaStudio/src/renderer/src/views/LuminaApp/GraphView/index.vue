<template>
  <div class="ls-graph h-full bg-slate-900 rounded-2xl border border-slate-800 shadow-inner relative overflow-hidden flex items-center justify-center">
    <!-- Background -->
    <div class="absolute inset-0">
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-900/20 rounded-full blur-[100px] animate-pulse-slow"></div>
      <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-900/20 rounded-full blur-[100px] animate-pulse-slow" style="animation-delay: 1s"></div>
    </div>
    
    <div class="absolute top-4 left-4 z-10 bg-slate-800/90 backdrop-blur border border-slate-700 p-2 rounded-lg text-xs font-medium text-slate-300">
      <div class="flex items-center gap-2 mb-1">
        <span class="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></span>
        Target Protein
      </div>
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-slate-500"></span>
        Related Gene
      </div>
    </div>
    
    <svg width="100%" height="100%" viewBox="0 0 800 600" class="z-10 relative">
      <defs>
        <pattern id="grid-dark" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="#1e293b" />
        </pattern>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-dark)" />
      
      <!-- Edges -->
      <g stroke="#334155" stroke-width="1">
        <line x1="400" y1="300" x2="250" y2="150" class="animate-pulse-slow"/>
        <line x1="400" y1="300" x2="550" y2="150" />
        <line x1="400" y1="300" x2="250" y2="450" />
        <line x1="400" y1="300" x2="550" y2="450" />
        <line x1="400" y1="300" x2="600" y2="300" />
        <line x1="250" y1="150" x2="150" y2="100" />
        <line x1="550" y1="150" x2="650" y2="100" />
      </g>
      
      <!-- Central Node -->
      <g filter="url(#glow)">
        <circle cx="400" cy="300" r="30" fill="#064e3b" stroke="#10b981" stroke-width="2" class="animate-pulse-slow" />
        <circle cx="400" cy="300" r="10" fill="#10b981" />
      </g>
      
      <!-- Satellite Nodes -->
      <circle v-for="(pos, i) in nodes" :key="i" :cx="pos.cx" :cy="pos.cy" r="12" fill="#1e293b" stroke="#64748b" stroke-width="2" class="hover:fill-emerald-900 hover:stroke-emerald-500 transition-all duration-300 cursor-pointer" />
      
      <!-- Label -->
      <text x="400" y="355" text-anchor="middle" class="text-sm fill-emerald-400 font-semibold tracking-wide" style="font-size: 12px">Cas9 Enzyme</text>
    </svg>

    <div class="absolute bottom-6 right-6 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg hover:bg-emerald-500 cursor-pointer flex items-center gap-2 transition-all hover:scale-105 flex-shrink-0">
      <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Export Dataset
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const nodes = ref([
  { cx: 250, cy: 150 },
  { cx: 550, cy: 150 },
  { cx: 250, cy: 450 },
  { cx: 550, cy: 450 },
  { cx: 600, cy: 300 }
])
</script>

<style scoped>
@keyframes pulse-slow {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.05); }
}
.animate-pulse-slow {
  animation: pulse-slow 4s ease-in-out infinite;
}
</style>
