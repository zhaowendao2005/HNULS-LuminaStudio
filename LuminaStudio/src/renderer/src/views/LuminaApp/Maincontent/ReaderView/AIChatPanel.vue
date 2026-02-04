<template>
  <div
    class="w-80 flex flex-col bg-white/95 backdrop-blur rounded-xl border border-emerald-100 shadow-lg z-10 animate-fade-in flex-shrink-0"
  >
    <div
      class="p-4 border-b border-emerald-50 flex justify-between items-center bg-emerald-50/30 flex-shrink-0"
    >
      <div class="flex items-center gap-2 flex-shrink-0">
        <svg
          class="w-4 h-4 flex-shrink-0 text-emerald-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M12 3v18m9-9H3m15.364 6.364L6.636 6.636m12.728 0L6.636 19.364" />
        </svg>
        <span class="font-semibold text-slate-700 text-sm whitespace-nowrap">Lumina Bio-AI</span>
      </div>
      <button @click="$emit('close')" class="text-slate-400 hover:text-slate-600 flex-shrink-0">
        <svg
          class="w-4 h-4 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <div class="flex-1 p-4 overflow-y-auto space-y-4">
      <div class="flex gap-3">
        <div
          class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0"
        >
          <svg
            class="w-[14px] h-[14px] flex-shrink-0 text-emerald-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <div
          class="bg-emerald-50 p-3 rounded-2xl rounded-tl-none text-sm text-slate-700 border border-emerald-100 min-w-0 flex-1"
        >
          Analyzing gene sequences and protein structures in this document. How can I assist?
        </div>
      </div>

      <div v-if="selectedText" class="flex gap-3 flex-row-reverse">
        <div
          class="bg-slate-900 p-3 rounded-2xl rounded-tr-none text-sm text-white shadow-sm max-w-[80%]"
        >
          Explain the enzymatic function.
        </div>
      </div>

      <div v-if="selectedText" class="flex gap-3 animate-fade-in-up">
        <div
          class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0"
        >
          <svg
            class="w-[14px] h-[14px] flex-shrink-0 text-emerald-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M12 3v18m9-9H3m15.364 6.364L6.636 6.636m12.728 0L6.636 19.364" />
          </svg>
        </div>
        <div
          class="bg-white p-3 rounded-2xl rounded-tl-none text-sm text-slate-700 border border-emerald-100 shadow-sm min-w-0 flex-1"
        >
          Cas9 functions as molecular scissors. The "dual-RNA-guide" refers to the crRNA and
          tracrRNA complex that directs the protein to the specific DNA sequence.
          <div class="mt-3 flex flex-wrap gap-2">
            <span
              class="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full border border-emerald-100 cursor-pointer hover:bg-emerald-100"
              >Show 3D Structure</span
            >
            <span
              class="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full border border-emerald-100 cursor-pointer hover:bg-emerald-100"
              >Find Related Papers</span
            >
          </div>
        </div>
      </div>
    </div>

    <div class="p-4 border-t border-slate-100">
      <div class="relative">
        <input
          type="text"
          placeholder="Ask about protein folding..."
          class="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
        />
        <button
          class="absolute right-2 top-2 p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors flex-shrink-0"
        >
          <svg
            class="w-[14px] h-[14px] flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M7 17L17 7M17 7H7M17 7v10" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  selectedText: string | null
}>()

defineEmits<{
  (e: 'close'): void
}>()
</script>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}
.animate-fade-in-up {
  animation: fade-in-up 0.4s ease-out;
}
</style>
