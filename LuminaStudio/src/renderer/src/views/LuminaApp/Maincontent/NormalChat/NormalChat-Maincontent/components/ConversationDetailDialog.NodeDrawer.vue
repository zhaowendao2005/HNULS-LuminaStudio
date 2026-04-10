<template>
  <aside
    v-if="node && visible"
    class="flex h-full w-[480px] shrink-0 flex-col border-l border-[#dbe4ea] bg-white"
  >
    <header class="border-b border-[#e5edf3] px-5 py-4">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7b8a97]">
            {{ node.kind }}
          </p>
          <h3 class="mt-1 truncate text-[18px] font-semibold text-[#10212b]">
            {{ node.drawerTitle }}
          </h3>
          <p class="mt-1 text-[12px] leading-5 text-[#5f7381]">
            {{ node.drawerSubtitle }}
          </p>
        </div>

        <button
          class="flex h-9 w-9 items-center justify-center rounded-xl border border-[#d9e3ea] text-[#7b8a97] transition-colors hover:border-[#c7d4dd] hover:text-[#10212b]"
          type="button"
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
      </div>
    </header>

    <div class="border-b border-[#e5edf3] px-4 py-3">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="section in node.drawerSections"
          :key="section.id"
          class="rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors"
          :class="
            section.id === selectedSectionId
              ? 'bg-[#10212b] text-white'
              : 'bg-[#eef4f7] text-[#526673] hover:bg-[#e4edf2]'
          "
          type="button"
          @click="emit('select-section', section.id)"
        >
          {{ section.title }}
        </button>
      </div>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      <div v-if="activeSection" class="space-y-4">
        <div class="rounded-2xl border border-[#dfe8ee] bg-[#f8fbfc] px-4 py-3">
          <p class="text-[12px] leading-5 text-[#526673]">
            {{ activeSection.description }}
          </p>
        </div>

        <template v-if="activeSection.kind === 'documents'">
          <section
            v-for="doc in activeSection.documents ?? []"
            :key="doc.id"
            class="space-y-3 rounded-[22px] border border-[#dfe8ee] bg-white px-4 py-4"
          >
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7b8a97]">
                {{ doc.title }}
              </p>
              <p class="mt-1 text-[13px] font-semibold text-[#10212b]">{{ doc.summary }}</p>
              <p class="mt-1 text-[12px] leading-5 text-[#5f7381]">{{ doc.description }}</p>
            </div>

            <StructuredCodeViewer
              v-if="doc.kind === 'json-object'"
              :payload="doc.payload"
              :mode="resolveSectionMode(activeSection.id)"
            />

            <div
              v-else-if="doc.kind === 'markdown'"
              class="rounded-2xl border border-[#dfe8ee] bg-[#f8fbfc] px-4 py-4"
            >
              <ChatMarkdownContent :content="typeof doc.payload === 'string' ? doc.payload : ''" />
            </div>

            <pre
              v-else
              class="overflow-x-auto whitespace-pre-wrap break-words rounded-2xl border border-[#dfe8ee] bg-[#f8fbfc] px-4 py-4 text-[12px] leading-6 text-[#233743]"
              >{{ formatTextPayload(doc.payload) }}</pre
            >
          </section>
        </template>

        <section
          v-else-if="activeSection.kind === 'structured'"
          class="space-y-3 rounded-[22px] border border-[#dfe8ee] bg-white px-4 py-4"
        >
          <div
            v-if="canToggleMode(activeSection.id)"
            class="flex items-center justify-end rounded-xl bg-[#eef4f7] p-1"
          >
            <button
              class="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
              :class="
                resolveSectionMode(activeSection.id) === 'json'
                  ? 'bg-white text-[#10212b] shadow-sm'
                  : 'text-[#526673] hover:text-[#10212b]'
              "
              type="button"
              @click="setSectionMode(activeSection.id, 'json')"
            >
              JSON
            </button>
            <button
              class="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
              :class="
                resolveSectionMode(activeSection.id) === 'yaml'
                  ? 'bg-white text-[#10212b] shadow-sm'
                  : 'text-[#526673] hover:text-[#10212b]'
              "
              type="button"
              @click="setSectionMode(activeSection.id, 'yaml')"
            >
              YAML
            </button>
          </div>

          <StructuredCodeViewer
            :payload="activeSection.payload ?? {}"
            :mode="resolveSectionMode(activeSection.id)"
            :highlight-keys="activeSection.highlightKeys ?? []"
          />
        </section>

        <section
          v-else
          class="rounded-[22px] border border-[#dfe8ee] bg-white px-4 py-4 text-[13px] leading-6 text-[#233743]"
        >
          <pre class="whitespace-pre-wrap break-words">{{
            formatTextPayload(activeSection.payload)
          }}</pre>
        </section>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type {
  ChatDetailDataViewMode,
  ChatDetailRuntimeDrawerSectionId,
  ChatDetailRuntimeNode
} from '@renderer/stores/normal-chat/chat-detail-shell/chat-detail-shell.types'
import ChatMarkdownContent from './ChatMarkdownContent.vue'
import StructuredCodeViewer from './StructuredCodeViewer.vue'

const props = defineProps<{
  node: ChatDetailRuntimeNode | null
  visible: boolean
  selectedSectionId: ChatDetailRuntimeDrawerSectionId
  requestViewMode: ChatDetailDataViewMode
  responseViewMode: ChatDetailDataViewMode
}>()

const emit = defineEmits<{
  close: []
  'select-section': [sectionId: ChatDetailRuntimeDrawerSectionId]
  'set-request-view-mode': [mode: ChatDetailDataViewMode]
  'set-response-view-mode': [mode: ChatDetailDataViewMode]
}>()

const activeSection = computed(() => {
  return (
    props.node?.drawerSections.find((section) => section.id === props.selectedSectionId) ?? null
  )
})

function resolveSectionMode(sectionId: ChatDetailRuntimeDrawerSectionId): ChatDetailDataViewMode {
  return sectionId === 'response' ? props.responseViewMode : props.requestViewMode
}

function canToggleMode(sectionId: ChatDetailRuntimeDrawerSectionId): boolean {
  return sectionId !== 'stream'
}

function setSectionMode(
  sectionId: ChatDetailRuntimeDrawerSectionId,
  mode: ChatDetailDataViewMode
): void {
  if (sectionId === 'response') {
    emit('set-response-view-mode', mode)
    return
  }
  emit('set-request-view-mode', mode)
}

function formatTextPayload(payload: unknown): string {
  if (payload === null) {
    return 'null'
  }
  if (typeof payload === 'string') {
    return payload
  }
  return JSON.stringify(payload, null, 2)
}
</script>
