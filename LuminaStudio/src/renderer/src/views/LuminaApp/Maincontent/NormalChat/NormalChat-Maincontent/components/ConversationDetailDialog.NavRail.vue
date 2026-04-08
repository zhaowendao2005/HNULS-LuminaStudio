<template>
  <aside
    class="flex w-[88px] flex-col items-center gap-3 border-r border-gray-100 bg-white px-3 py-4"
  >
    <button
      class="flex h-10 w-10 items-center justify-center rounded-xl border transition-colors"
      :class="isOverview ? 'border-gray-900 bg-gray-900 text-white' : idleClass"
      type="button"
      title="Overview"
      @click="emit('open-overview')"
    >
      <svg
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M4 6h16" />
        <path d="M4 12h16" />
        <path d="M4 18h16" />
        <circle cx="8" cy="6" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="16" cy="12" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="12" cy="18" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    </button>

    <div class="my-1 h-px w-8 bg-gray-200" />
    <p class="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">Action</p>

    <button
      class="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-300"
      type="button"
      title="System Action（暂未实现）"
      disabled
    >
      <svg
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M12 3l2.2 4.5L19 9.2l-3.5 3.4.8 4.8L12 15l-4.3 2.4.8-4.8L5 9.2l4.8-.7z" />
      </svg>
    </button>

    <button
      class="flex h-10 w-10 items-center justify-center rounded-xl border transition-colors"
      :class="isFunctioncallPage ? 'border-gray-900 bg-gray-900 text-white' : idleClass"
      type="button"
      title="Functioncall"
      @click="emit('open-functioncall-overview')"
    >
      <svg
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M8 8l-4 4 4 4" />
        <path d="M16 8l4 4-4 4" />
        <path d="M14 4l-4 16" />
      </svg>
    </button>

    <button
      class="flex h-10 w-10 items-center justify-center rounded-xl border transition-colors"
      :class="isAgentPage ? 'border-gray-900 bg-gray-900 text-white' : idleClass"
      type="button"
      title="Agent"
      @click="emit('open-agent')"
    >
      <svg
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M6 5v14" />
        <path d="M6 8h5" />
        <path d="M11 8v8" />
        <path d="M11 12h7" />
        <path d="M18 12v6" />
        <circle cx="6" cy="5" r="1.5" fill="currentColor" />
        <circle cx="11" cy="8" r="1.5" fill="currentColor" />
        <circle cx="18" cy="12" r="1.5" fill="currentColor" />
        <circle cx="18" cy="18" r="1.5" fill="currentColor" />
      </svg>
    </button>

    <button
      class="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-300"
      type="button"
      title="MCP（暂未实现）"
      disabled
    >
      <svg
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M8 10h8" />
        <path d="M8 14h5" />
      </svg>
    </button>

    <div class="my-1 h-px w-8 bg-gray-200" />

    <button
      class="mt-auto flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-600"
      type="button"
      title="Close"
      @click="emit('close')"
    >
      <svg
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M18 6L6 18" />
        <path d="M6 6l12 12" />
      </svg>
    </button>
  </aside>
</template>

<script setup lang="ts">
defineProps<{
  isOverview: boolean
  isFunctioncallPage: boolean
  isAgentPage: boolean
}>()

const emit = defineEmits<{
  close: []
  'open-overview': []
  'open-functioncall-overview': []
  'open-agent': []
}>()

const idleClass = 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700'
</script>
