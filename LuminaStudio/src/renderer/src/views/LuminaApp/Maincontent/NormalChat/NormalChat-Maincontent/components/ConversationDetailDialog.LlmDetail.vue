<template>
  <section
    class="flex h-full min-h-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
  >
    <div class="flex h-full w-[320px] shrink-0 flex-col border-r border-gray-200 bg-white">
      <div class="border-b border-gray-200 bg-gray-50/50 px-3 py-3">
        <h2 class="text-xs font-bold uppercase tracking-wider text-gray-500">Debug Explorer</h2>
      </div>

      <div class="flex-1 overflow-y-auto py-2">
        <div
          v-for="group in selectedGroups"
          :key="group.id"
          class="mb-2 border-b border-gray-100 pb-2 last:mb-0 last:border-b-0"
        >
          <button
            class="flex w-full items-center justify-between px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider transition-colors"
            :class="
              selectedGroupId === group.id ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
            "
            type="button"
            @click="emit('scroll-to-doc', group.items[0]?.id ?? '', group.id)"
          >
            <span>{{ group.title }}</span>
            <span class="rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
              {{ group.items.length }}
            </span>
          </button>

          <ul class="mt-1 px-2">
            <li v-for="item in group.items" :key="item.id">
              <button
                class="flex w-full items-start rounded-lg px-2 py-2 text-left transition-colors"
                :class="getDocItemClass(item.id, group.id)"
                type="button"
                @click="emit('scroll-to-doc', item.id, group.id)"
              >
                <div class="min-w-0">
                  <div class="truncate text-[12px] font-medium">{{ item.title }}</div>
                  <div class="mt-0.5 truncate text-[11px] text-gray-500">{{ item.summary }}</div>
                </div>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div
      :ref="(el) => emit('set-content-ref', el as HTMLElement | null)"
      class="min-h-0 flex-1 overflow-y-auto bg-[#f8f9fa] p-6 md:p-8"
    >
      <div class="mx-auto max-w-5xl space-y-8 pb-24">
        <template v-for="(group, groupIndex) in selectedGroups" :key="group.id">
          <section
            :id="`group-${group.id}`"
            class="rounded-xl border border-dashed border-gray-200 bg-white/70 px-5 py-4"
          >
            <div class="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
              {{ group.title }}
            </div>
            <div class="mt-2 text-[12px] text-gray-500">共 {{ group.items.length }} 份调试文档</div>
          </section>

          <template v-for="(doc, docIndex) in group.items" :key="doc.id">
            <section
              :id="doc.id"
              :ref="(el) => emit('register-doc-ref', doc.id, el)"
              class="scroll-mt-24 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]"
            >
              <header
                class="flex items-center justify-between border-b border-gray-200 bg-[#fbfcfd] px-5 py-3"
              >
                <div>
                  <div class="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
                    {{ group.title }}
                  </div>
                  <div class="mt-1 flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <span>{{ doc.title }}</span>
                    <span class="relative inline-flex">
                      <span
                        class="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 bg-white text-[10px] font-bold leading-none text-gray-500"
                        @mouseenter="emit('show-tooltip', doc.id)"
                        @mouseleave="emit('hide-tooltip')"
                      >
                        i
                      </span>
                      <span
                        v-show="activeTooltipId === doc.id"
                        :ref="(el) => emit('register-tooltip-ref', doc.id, el)"
                        class="pointer-events-none absolute left-0 top-6 z-[120] inline-block min-w-[16rem] max-w-[28rem] whitespace-normal break-words rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-left text-[11px] font-normal leading-5 text-white shadow-xl"
                        :style="getTooltipStyle(doc.id)"
                      >
                        <span class="block text-white opacity-100">{{ doc.description }}</span>
                      </span>
                    </span>
                  </div>
                </div>
                <span
                  class="rounded bg-gray-100 px-2 py-1 text-[10px] uppercase tracking-wider text-gray-500"
                >
                  {{ doc.kind }}
                </span>
              </header>

              <div class="overflow-x-auto p-5">
                <StructuredCodeViewer
                  v-if="doc.kind === 'json-object'"
                  :payload="doc.payload"
                  :mode="getDocViewMode(doc)"
                />
                <div v-else-if="shouldRenderMarkdown(doc)" class="rounded-2xl bg-white px-1 py-1">
                  <MarkdownJsonContent :content="formatTextPayload(doc)" />
                </div>
                <pre
                  v-else
                  class="m-0 whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-gray-800"
                ><code>{{ formatTextPayload(doc) }}</code></pre>
              </div>
            </section>

            <hr
              v-if="
                !(groupIndex === selectedGroups.length - 1 && docIndex === group.items.length - 1)
              "
              class="border-0 border-t border-dashed border-gray-300"
            />
          </template>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import MarkdownJsonContent from './MarkdownJsonContent.vue'
import StructuredCodeViewer from './StructuredCodeViewer.vue'
import type {
  ChatDetailDataViewMode,
  ChatDetailShellDocGroup,
  ChatDetailShellDocGroupId,
  ChatDetailShellDocItem
} from '@renderer/stores/normal-chat/chat-detail-shell/chat-detail-shell.types'

defineProps<{
  selectedGroups: ChatDetailShellDocGroup[]
  selectedGroupId: ChatDetailShellDocGroupId
  selectedDocId: string
  activeTooltipId: string
  getTooltipStyle: (docId: string) => Record<string, string>
  getDocViewMode: (doc: ChatDetailShellDocItem) => ChatDetailDataViewMode
  formatTextPayload: (doc: ChatDetailShellDocItem) => string
  shouldRenderMarkdown: (doc: ChatDetailShellDocItem) => boolean
  getDocItemClass: (docId: string, groupId: ChatDetailShellDocGroupId) => string
}>()

const emit = defineEmits<{
  'scroll-to-doc': [docId: string, groupId: ChatDetailShellDocGroupId]
  'set-content-ref': [el: HTMLElement | null]
  'register-doc-ref': [docId: string, el: Element | { $el?: Element } | null]
  'register-tooltip-ref': [docId: string, el: Element | { $el?: Element } | null]
  'show-tooltip': [docId: string]
  'hide-tooltip': []
}>()
</script>
