<template>
  <div
    class="ls-welcome fixed inset-0 bg-white flex flex-col items-center justify-center overflow-hidden cursor-pointer"
    @click.stop="handleClick"
  >
    <!-- 轻量透明标题栏 -->
    <header
      class="titlebar absolute top-0 left-0 right-0 h-8 flex items-center justify-end px-2 z-50 select-none"
      @dblclick.stop="handleToggleMaximize"
    >
      <div class="titlebar-drag flex-1 h-full"></div>
      <div class="titlebar-controls flex items-center gap-1" @click.stop>
        <button
          class="w-7 h-6 rounded flex items-center justify-center text-slate-800 hover:bg-black/10 transition-colors"
          title="最小化"
          @click="handleMinimize"
        >
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14" />
          </svg>
        </button>
        <button
          class="w-7 h-6 rounded flex items-center justify-center text-slate-800 hover:bg-black/10 transition-colors"
          :title="isMaximized ? '还原' : '最大化'"
          @click="handleToggleMaximize"
        >
          <svg v-if="!isMaximized" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="4" y="4" width="16" height="16" rx="2" />
          </svg>
          <svg v-else class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="8" y="4" width="12" height="12" rx="1" />
            <path d="M4 8v12a1 1 0 0 0 1 1h12" />
          </svg>
        </button>
        <button
          class="w-7 h-6 rounded flex items-center justify-center text-slate-800 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          title="关闭"
          @click="handleClose"
        >
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </header>

    <!-- Background -->
    <div class="absolute inset-0 pointer-events-none">
      <video class="absolute inset-0 w-full h-full object-cover" autoplay muted loop playsinline>
        <source :src="dnaVideo" type="video/mp4" />
      </video>
      <div class="absolute inset-0 bg-white/70 backdrop-blur-[2px]"></div>
      <div
        class="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-emerald-100/40 rounded-full blur-[100px] animate-pulse-slow"
      ></div>
      <div
        class="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-teal-100/40 rounded-full blur-[100px] animate-pulse-slow"
        style="animation-delay: 2s"
      ></div>
    </div>

    <div class="w-full max-w-4xl px-8 flex flex-col items-center text-center relative z-10">
      <!-- Logo Container -->
      <div class="mb-10 relative group flex-shrink-0 animate-scale-in">
        <div
          class="absolute -inset-8 bg-gradient-to-tr from-emerald-200 to-teal-200 rounded-full blur-2xl opacity-60 animate-pulse-glow"
        ></div>
        <div
          class="relative bg-white p-6 rounded-3xl shadow-2xl border border-emerald-50 transform transition-transform duration-700 hover:scale-105"
        >
          <svg
            class="w-16 h-16 flex-shrink-0 text-emerald-600 animate-float"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
      </div>

      <!-- Text Content -->
      <div class="overflow-hidden">
        <h1
          class="text-7xl font-bold text-slate-900 mb-6 tracking-tight animate-slide-up"
          style="animation-delay: 0.2s"
        >
          Lumina.
        </h1>
      </div>

      <div class="overflow-hidden mb-12">
        <p
          class="text-xl text-slate-500 max-w-2xl leading-relaxed animate-slide-up"
          style="animation-delay: 0.4s"
        >
          The biological research platform driven by
          <span class="text-slate-700 font-semibold">Life Intelligence</span>.<br />
          Seamlessly connecting literature, gene networks, and AI.
        </p>
      </div>

      <!-- Hint -->
      <div
        class="mt-8 text-emerald-800/40 font-medium text-sm tracking-[0.2em] uppercase animate-pulse flex items-center gap-3 opacity-0 animate-fade-in"
        style="animation-delay: 1.2s"
      >
        <span class="w-8 h-[1px] bg-emerald-800/20"></span>
        Click anywhere to initialize
        <span class="w-8 h-[1px] bg-emerald-800/20"></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import dnaVideo from '@renderer/assets/videos/dna_black.mp4'

const emit = defineEmits<{
  (e: 'start'): void
}>()

const isMaximized = ref(false)
let unsubscribe: null | (() => void) = null

const hasWindowApi = () => typeof window !== 'undefined' && !!window.api?.window

const syncMaximized = async () => {
  if (!hasWindowApi()) return
  isMaximized.value = await window.api.window.isMaximized()
}

const handleMinimize = async () => {
  if (!hasWindowApi()) return
  await window.api.window.minimize()
}

const handleToggleMaximize = async () => {
  if (!hasWindowApi()) return
  await window.api.window.toggleMaximize()
  await syncMaximized()
}

const handleClose = async () => {
  if (!hasWindowApi()) return
  await window.api.window.close()
}

const handleClick = (e: MouseEvent) => {
  // 确保点击的不是标题栏按钮
  const target = e.target as HTMLElement
  if (!target.closest('.titlebar-controls')) {
    emit('start')
  }
}

onMounted(async () => {
  await syncMaximized()
  if (!hasWindowApi()) return
  unsubscribe = window.api.window.onMaximizedChanged((payload) => {
    isMaximized.value = payload.isMaximized
  })
})

onBeforeUnmount(() => {
  unsubscribe?.()
  unsubscribe = null
})
</script>

<style scoped>
@keyframes float {
  0% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(0, -10px);
  }
  100% {
    transform: translate(0, 0);
  }
}

@keyframes pulse-slow {
  0%,
  100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.05);
  }
}

@keyframes pulse-glow {
  0%,
  100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.1);
  }
}

@keyframes scale-in {
  0% {
    opacity: 0;
    transform: scale(0.8) translateY(20px);
    filter: blur(10px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
    filter: blur(0);
  }
}

@keyframes slide-up {
  0% {
    opacity: 0;
    transform: translateY(40px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.animate-float {
  animation: float 4s ease-in-out infinite;
}

.animate-pulse-slow {
  animation: pulse-slow 6s ease-in-out infinite;
}

.animate-pulse-glow {
  animation: pulse-glow 3s ease-in-out infinite;
}

.animate-scale-in {
  animation: scale-in 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.animate-slide-up {
  opacity: 0;
  animation: slide-up 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.animate-fade-in {
  animation: fade-in 1s ease-out forwards;
}

/* 标题栏拖动区域 */
.titlebar-drag {
  -webkit-app-region: drag;
}

.titlebar-controls {
  -webkit-app-region: no-drag;
}
</style>
