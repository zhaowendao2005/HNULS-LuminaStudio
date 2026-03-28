<template>
  <div
    v-if="snapshot.visible"
    class="nc-conversation-detail-dialog-a9k2 fixed inset-0 z-[70] flex items-center justify-center bg-black/20 backdrop-blur-[1px]"
  >
    <div
      class="nc-conversation-detail-dialog-panel-a9k2 flex h-[760px] w-[1120px] overflow-hidden rounded-2xl bg-white shadow-[var(--nc-shadow-dialog)]"
    >
      <aside
        class="flex w-[76px] flex-col items-center gap-3 border-r border-gray-100 bg-white px-3 py-4"
      >
        <button
          class="flex h-10 w-10 items-center justify-center rounded-xl border transition-colors"
          :class="
            snapshot.currentPage === 'overview'
              ? 'border-gray-900 bg-gray-900 text-white'
              : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700'
          "
          type="button"
          title="总览"
          @click="detailShellStore.goToOverview"
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

        <button
          class="mt-auto flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-600"
          type="button"
          title="关闭"
          @click="detailShellStore.closeDialog"
        >
          <X class="h-4 w-4" />
        </button>
      </aside>

      <div class="min-w-0 flex-1 bg-gray-50">
        <div class="flex h-full min-h-0 flex-col">
          <header class="border-b border-gray-100 bg-white px-6 py-4">
            <div v-if="snapshot.currentPage === 'overview'" class="min-w-0">
              <h2 class="truncate text-[16px] font-semibold text-gray-900">
                {{ dialogTitle }}
              </h2>
              <p class="mt-1 text-[12px] leading-5 text-gray-500">
                当前详情面板固定显示 mock 数据，用于调试和观察组件。
              </p>
            </div>

            <div v-else class="flex items-center gap-3">
              <button
                class="flex h-9 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-[13px] font-medium text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-900"
                type="button"
                @click="detailShellStore.goToOverview"
              >
                <svg
                  class="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                返回
              </button>

              <div class="min-w-0">
                <p class="truncate text-[11px] uppercase tracking-[0.14em] text-gray-400">
                  {{ breadcrumbText }}
                </p>
                <h2 class="truncate text-[16px] font-semibold text-gray-900">
                  {{ selectedCallItem?.title ?? 'LLM 调用详情' }}
                </h2>
              </div>
            </div>
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto p-6">
            <section v-if="snapshot.currentPage === 'overview'" class="space-y-3">
              <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <div
                  class="grid grid-cols-[64px_320px_220px_88px_88px_24px] items-center gap-3 border-b border-gray-100 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400"
                >
                  <span>序号</span>
                  <span>调用</span>
                  <span>上下文</span>
                  <span>类型</span>
                  <span>状态</span>
                  <span></span>
                </div>

                <button
                  v-for="call in llmCallItems"
                  :key="call.id"
                  class="grid w-full grid-cols-[64px_320px_220px_88px_88px_24px] items-center gap-3 border-b border-gray-100 px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-gray-50"
                  type="button"
                  @click="detailShellStore.openCallDetail(call.id)"
                >
                  <span class="truncate text-[12px] font-medium text-gray-500">
                    {{ call.indexLabel }}
                  </span>
                  <div class="min-w-0">
                    <p class="truncate text-[12px] font-semibold text-gray-900">{{ call.title }}</p>
                    <p class="mt-0.5 truncate text-[11px] text-gray-500">{{ call.summary }}</p>
                  </div>
                  <p class="truncate text-[12px] text-gray-700">{{ call.contextText }}</p>
                  <span class="truncate text-[12px] text-gray-600">{{ call.badge }}</span>
                  <span
                    class="inline-flex max-w-full items-center truncate rounded-full px-2.5 py-1 text-[11px] font-medium"
                    :class="call.statusClass"
                  >
                    {{ call.statusLabel }}
                  </span>
                  <span class="flex items-center justify-end text-gray-300">
                    <svg
                      class="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </span>
                </button>
              </div>
            </section>

            <section v-else class="grid min-w-0 gap-4">
              <div class="min-w-0 rounded-2xl border border-gray-200 bg-white px-4 py-4">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <h3 class="text-[14px] font-semibold text-gray-900">发给 LLM 的原始内容</h3>
                    <p class="mt-1 text-[12px] text-gray-400">固定 mock request payload。</p>
                  </div>

                  <div class="flex items-center rounded-xl bg-gray-100 p-1">
                    <button
                      class="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
                      :class="
                        snapshot.requestViewMode === 'json'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-800'
                      "
                      type="button"
                      @click="detailShellStore.setRequestViewMode('json')"
                    >
                      JSON
                    </button>
                    <button
                      class="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
                      :class="
                        snapshot.requestViewMode === 'yaml'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-800'
                      "
                      type="button"
                      @click="detailShellStore.setRequestViewMode('yaml')"
                    >
                      YAML
                    </button>
                  </div>
                </div>

                <pre
                  class="mt-4 min-w-0 overflow-hidden whitespace-pre-wrap break-words rounded-2xl bg-gray-50 p-4 text-[12px] leading-6 text-gray-700"
                ><code class="block min-w-0 whitespace-pre-wrap break-words">{{ formattedSelectedCallRequest }}</code></pre>
              </div>

              <div class="min-w-0 rounded-2xl border border-gray-200 bg-white px-4 py-4">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <h3 class="text-[14px] font-semibold text-gray-900">收到的原始内容</h3>
                    <p class="mt-1 text-[12px] text-gray-400">固定 mock response payload。</p>
                  </div>

                  <div class="flex items-center rounded-xl bg-gray-100 p-1">
                    <button
                      class="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
                      :class="
                        snapshot.responseViewMode === 'json'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-800'
                      "
                      type="button"
                      @click="detailShellStore.setResponseViewMode('json')"
                    >
                      JSON
                    </button>
                    <button
                      class="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
                      :class="
                        snapshot.responseViewMode === 'yaml'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-800'
                      "
                      type="button"
                      @click="detailShellStore.setResponseViewMode('yaml')"
                    >
                      YAML
                    </button>
                  </div>
                </div>

                <pre
                  class="mt-4 min-w-0 overflow-hidden whitespace-pre-wrap break-words rounded-2xl bg-gray-50 p-4 text-[12px] leading-6 text-gray-700"
                ><code class="block min-w-0 whitespace-pre-wrap break-words">{{ formattedSelectedCallResponse }}</code></pre>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { X } from 'lucide-vue-next'
import { useNormalChatConversationDetailShellStore } from '@renderer/stores/normal-chat/conversation-detail-shell/conversation-detail-shell.store'

const detailShellStore = useNormalChatConversationDetailShellStore()
const {
  snapshot,
  dialogTitle,
  breadcrumbText,
  llmCallItems,
  selectedCallItem,
  formattedSelectedCallRequest,
  formattedSelectedCallResponse
} = storeToRefs(detailShellStore)
</script>
