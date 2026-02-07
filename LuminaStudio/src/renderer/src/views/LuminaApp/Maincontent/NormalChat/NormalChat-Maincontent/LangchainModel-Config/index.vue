<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-black/20 backdrop-blur-sm"
      style="animation: fadeIn 0.3s ease-out"
      @click="$emit('update:visible', false)"
    ></div>

    <!-- Content -->
    <div
      class="relative w-full max-w-6xl h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
      style="animation: slideUpBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)"
    >
      <!-- Header -->
      <div
        class="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white z-10"
      >
        <h3 class="text-lg font-semibold text-slate-800">Knowledge-Qa 配置</h3>
        <button
          class="text-slate-400 hover:text-slate-600 transition-colors"
          @click="$emit('update:visible', false)"
        >
          <svg
            class="w-6 h-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Main Config Area -->
      <div class="flex-1 overflow-hidden relative">
        <KnowledgeQaConfig />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import KnowledgeQaConfig from './KnowledgeQaConfig.vue'

defineProps<{
  visible: boolean
}>()

defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()
</script>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUpBounce {
  0% {
    opacity: 0;
    transform: translateY(100px) scale(0.95);
  }
  50% {
    opacity: 1;
    transform: translateY(-10px) scale(1.02);
  }
  75% {
    transform: translateY(5px) scale(0.99);
  }
  100% {
    transform: translateY(0) scale(1);
  }
}
</style>
