<template>
  <header class="of-generate-header h-12 shrink-0 border-b border-gray-200 bg-white px-4">
    <div class="grid h-full grid-cols-[1fr_auto_1fr] items-center gap-4">
      <div class="flex min-w-0 items-center gap-4 overflow-hidden">
        <button
          type="button"
          class="shrink-0 rounded p-1 text-gray-500 transition-colors hover:bg-gray-100"
          @click="$emit('toggle-sidebar')"
        >
          <Menu :size="18" />
        </button>
        <div class="flex min-w-0 items-center gap-2 overflow-hidden">
          <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gray-800">
            <span class="text-xs font-bold text-white">L</span>
          </div>
          <span class="truncate text-sm font-semibold tracking-wide text-gray-800">
            LuminaStudio
          </span>
        </div>
      </div>

      <button
        type="button"
        class="max-w-[260px] truncate rounded-full border border-gray-200 bg-white px-4 py-1.5 text-[11px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        @click="$emit('open-model-selector')"
      >
        {{ currentModelLabel || '选择模型' }}
      </button>

      <div class="flex justify-end gap-2 overflow-hidden">
        <button
          type="button"
          title="模型配置"
          class="shrink-0 rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
          @click="$emit('open-config')"
        >
          <Settings :size="16" />
        </button>
        <button
          type="button"
          class="shrink-0 rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
        >
          <Search :size="16" />
        </button>
        <button
          type="button"
          class="relative shrink-0 rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
        >
          <Bell :size="16" />
          <span class="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-500"></span>
        </button>
        <button
          type="button"
          class="shrink-0 rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
        >
          <User :size="16" />
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Bell, Menu, Search, Settings, User } from 'lucide-vue-next'

defineProps<{
  currentModelLabel: string
}>()

defineEmits<{
  (e: 'toggle-sidebar'): void
  (e: 'open-config'): void
  (e: 'open-model-selector'): void
}>()
</script>
