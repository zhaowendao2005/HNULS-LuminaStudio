<template>
  <section class="grid min-w-0 gap-4">
    <div class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h3 class="text-[14px] font-semibold text-slate-900">Call Request</h3>
          <p class="mt-1 text-[12px] text-slate-400">
            Structured input for the selected functioncall.
          </p>
        </div>

        <div class="flex items-center rounded-xl bg-gray-100 p-1">
          <button
            class="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
            :class="
              requestViewMode === 'json'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            "
            type="button"
            @click="emit('set-request-view-mode', 'json')"
          >
            JSON
          </button>
          <button
            class="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
            :class="
              requestViewMode === 'yaml'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            "
            type="button"
            @click="emit('set-request-view-mode', 'yaml')"
          >
            YAML
          </button>
        </div>
      </div>

      <div
        v-if="item?.autofilledKeys.length"
        class="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-5 text-amber-800"
      >
        程序已自动补齐：{{ item.autofilledKeys.join(', ') }}
      </div>

      <StructuredCodeViewer
        class="mt-4"
        :payload="item?.requestPayload ?? {}"
        :mode="requestViewMode"
        :highlight-keys="item?.autofilledKeys ?? []"
      />
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h3 class="text-[14px] font-semibold text-slate-900">Call Response</h3>
          <p class="mt-1 text-[12px] text-slate-400">
            Output, error state, and streaming flags for the selected functioncall.
          </p>
        </div>

        <div class="flex items-center rounded-xl bg-gray-100 p-1">
          <button
            class="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
            :class="
              responseViewMode === 'json'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            "
            type="button"
            @click="emit('set-response-view-mode', 'json')"
          >
            JSON
          </button>
          <button
            class="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
            :class="
              responseViewMode === 'yaml'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            "
            type="button"
            @click="emit('set-response-view-mode', 'yaml')"
          >
            YAML
          </button>
        </div>
      </div>

      <StructuredCodeViewer
        class="mt-4"
        :payload="item?.responsePayload ?? {}"
        :mode="responseViewMode"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import type {
  ChatDetailDataViewMode,
  ChatDetailShellFunctioncallItem
} from '@renderer/stores/normal-chat/chat-detail-shell/chat-detail-shell.types'
import StructuredCodeViewer from './StructuredCodeViewer.vue'

defineProps<{
  item: ChatDetailShellFunctioncallItem | null
  requestViewMode: ChatDetailDataViewMode
  responseViewMode: ChatDetailDataViewMode
}>()

const emit = defineEmits<{
  'set-request-view-mode': [mode: ChatDetailDataViewMode]
  'set-response-view-mode': [mode: ChatDetailDataViewMode]
}>()
</script>
