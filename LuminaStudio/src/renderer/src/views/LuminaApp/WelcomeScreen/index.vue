<template>
  <div class="ls-welcome fixed inset-0 bg-white z-50 flex flex-col items-center justify-center animate-fade-in overflow-hidden">
    <!-- Background -->
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-emerald-100/40 rounded-full blur-[100px] animate-pulse-slow"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-teal-100/40 rounded-full blur-[100px] animate-pulse-slow" style="animation-delay: 2s"></div>
    </div>

    <div class="w-full max-w-4xl px-8 flex flex-col items-center text-center relative z-10">
      <div class="mb-8 relative group cursor-pointer flex-shrink-0" @click="$emit('start')">
        <div class="absolute -inset-6 bg-gradient-to-tr from-emerald-200 to-teal-200 rounded-full blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div class="relative bg-white p-5 rounded-2xl shadow-xl border border-emerald-50">
          <svg class="w-14 h-14 flex-shrink-0 text-emerald-600 animate-float" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
      </div>
      
      <h1 class="text-6xl font-bold text-slate-900 mb-6 tracking-tight">
        Lumina.
      </h1>
      <p class="text-xl text-slate-500 max-w-2xl mb-10 leading-relaxed">
        The biological research platform driven by <span class="text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">Life Intelligence</span>. 
        <br/>Seamlessly connecting literature, gene networks, and AI.
      </p>
      
      <button 
        @click="$emit('start')"
        class="group relative inline-flex items-center justify-center px-10 py-4 text-lg font-medium text-white transition-all duration-300 bg-slate-900 rounded-full hover:bg-emerald-900 hover:shadow-xl hover:shadow-emerald-900/20 hover:-translate-y-1 flex-shrink-0"
      >
        <span>Initialize Workspace</span>
        <svg class="ml-2 w-5 h-5 flex-shrink-0 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M7 17L17 7M17 7H7M17 7v10"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  (e: 'start'): void
}>()
</script>

<style scoped>
@keyframes float {
  0% { transform: translate(0, 0); }
  50% { transform: translate(0, -10px); }
  100% { transform: translate(0, 0); }
}
@keyframes pulse-slow {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.05); }
}
.animate-float {
  animation: float 3s ease-in-out infinite;
}
.animate-pulse-slow {
  animation: pulse-slow 4s ease-in-out infinite;
}
</style>
