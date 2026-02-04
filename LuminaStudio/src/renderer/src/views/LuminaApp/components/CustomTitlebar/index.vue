<template>
  <header
    class="ls-titlebar ls-titlebar_root flex h-12 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md select-none"
    @dblclick="handleToggleMaximize"
  >
    <div class="ls-titlebar_drag flex flex-1 items-center gap-2 min-w-0">
      <div class="ls-titlebar_appmark w-2 h-2 rounded-full bg-emerald-500"></div>
      <div class="ls-titlebar_title text-sm font-semibold text-slate-800 truncate">
        LuminaStudio
      </div>
    </div>

    <div class="ls-titlebar_controls flex items-center gap-2">
      <button
        class="ls-titlebar_btn ls-titlebar_btn--min w-9 h-8 rounded-lg border border-transparent text-slate-500 hover:bg-slate-100 hover:text-emerald-700 transition-colors flex items-center justify-center"
        title="最小化"
        @click="handleMinimize"
      >
        <svg
          class="w-4 h-4 -translate-y-[5px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M6 19h12" />
        </svg>
      </button>

      <button
        class="ls-titlebar_btn ls-titlebar_btn--max w-9 h-8 rounded-lg border border-transparent text-slate-500 hover:bg-slate-100 hover:text-emerald-700 transition-colors flex items-center justify-center"
        :title="isMaximized ? '还原' : '最大化'"
        @click="handleToggleMaximize"
      >
        <svg
          v-if="!isMaximized"
          class="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <rect x="4" y="4" width="16" height="16" rx="2" />
        </svg>
        <svg
          v-else
          class="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <rect x="7" y="4" width="13" height="13" rx="2" />
          <path d="M4 7v13a2 2 0 0 0 2 2h13" />
        </svg>
      </button>

      <button
        class="ls-titlebar_btn ls-titlebar_btn--close w-9 h-8 rounded-lg border border-transparent text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors flex items-center justify-center"
        title="关闭"
        @click="handleClose"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6 6 18" />
          <path d="M6 6l12 12" />
        </svg>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'

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
/* Draggable region for frameless window */
.ls-titlebar_drag {
  -webkit-app-region: drag;
}

.ls-titlebar_btn {
  -webkit-app-region: no-drag;
}
</style>
