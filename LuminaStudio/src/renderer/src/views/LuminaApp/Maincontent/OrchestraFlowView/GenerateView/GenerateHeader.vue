<template>
  <header class="of-generate-header h-12 shrink-0 border-b border-gray-200 bg-white px-4">
    <div class="flex h-full items-center justify-between">
      <div class="flex items-center gap-4">
        <button
          type="button"
          class="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100"
          @click="$emit('toggle-sidebar')"
        >
          <Menu :size="18" />
        </button>
        <div class="flex items-center gap-2">
          <div class="flex h-6 w-6 items-center justify-center rounded bg-gray-800">
            <span class="text-xs font-bold text-white">L</span>
          </div>
          <span class="text-sm font-semibold tracking-wide text-gray-800">LuminaStudio</span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
        >
          <Search :size="16" />
        </button>
        <button
          type="button"
          class="relative rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
        >
          <Bell :size="16" />
          <span class="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-500"></span>
        </button>
        <button
          type="button"
          class="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
        >
          <User :size="16" />
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Bell, Menu, Search, User } from 'lucide-vue-next'

defineEmits<{
  (e: 'toggle-sidebar'): void
}>()
</script>
