<template>
  <div
    v-if="snapshot.visible"
    class="nc-conversation-detail-dialog fixed inset-0 z-[70] flex items-center justify-center bg-black/20 backdrop-blur-[1px]"
  >
    <div
      class="flex h-[min(88vh,760px)] min-h-[620px] w-[min(92vw,1280px)] min-w-[960px] overflow-hidden rounded-2xl bg-white shadow-[var(--nc-shadow-dialog)]"
    >
      <ConversationDetailDialogNavRail
        :is-overview="snapshot.currentPage === 'overview' || snapshot.currentPage === 'llm-call'"
        :is-functioncall-page="
          snapshot.currentPage === 'functioncall-overview' ||
          snapshot.currentPage === 'functioncall-detail'
        "
        @close="detailShellStore.closeDialog"
        @open-overview="detailShellStore.goToOverview"
        @open-functioncall-overview="detailShellStore.openFunctioncallOverview"
      />

      <div class="min-w-0 flex-1 bg-[#f8f9fa]">
        <div class="flex h-full min-h-0 flex-col">
          <header class="border-b border-gray-200 bg-white px-6 py-4">
            <div v-if="snapshot.currentPage === 'overview'" class="min-w-0">
              <h2 class="truncate text-[16px] font-semibold text-gray-900">{{ dialogTitle }}</h2>
              <p class="mt-1 text-[12px] leading-5 text-gray-500">
                {{ overviewDescription }}
              </p>
            </div>

            <div v-else class="flex min-w-0 items-center justify-between gap-4">
              <div class="flex min-w-0 items-center gap-3">
                <button
                  class="flex h-9 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-[13px] font-medium text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-900"
                  type="button"
                  @click="handleBack"
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
                  Back
                </button>

                <div class="min-w-0">
                  <p
                    class="truncate font-mono text-[11px] uppercase tracking-[0.14em] text-gray-400"
                  >
                    {{ breadcrumbText }}
                  </p>
                  <h2 class="truncate text-[16px] font-semibold text-gray-900">
                    {{ currentPageTitle }}
                  </h2>
                </div>
              </div>

              <div
                v-if="snapshot.currentPage === 'llm-call'"
                class="flex items-center rounded-lg bg-gray-100 p-1"
              >
                <button
                  class="rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors"
                  :class="
                    currentViewMode === 'json'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  "
                  type="button"
                  @click="setCurrentViewMode('json')"
                >
                  JSON
                </button>
                <button
                  class="rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors"
                  :class="
                    currentViewMode === 'yaml'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  "
                  type="button"
                  @click="setCurrentViewMode('yaml')"
                >
                  YAML
                </button>
              </div>
            </div>
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto p-6">
            <ConversationDetailDialogOverview
              v-if="snapshot.currentPage === 'overview'"
              :items="llmCallItems"
              :empty-message="detail?.llmCallEmptyMessage"
              @open-call="detailShellStore.openCallDetail"
            />

            <ConversationDetailDialogFunctioncallOverview
              v-else-if="snapshot.currentPage === 'functioncall-overview'"
              :items="functioncallItems"
              @open-call="detailShellStore.openFunctioncallDetail"
            />

            <ConversationDetailDialogFunctioncallDetail
              v-else-if="snapshot.currentPage === 'functioncall-detail'"
              :item="selectedFunctioncallItem"
              :request-view-mode="snapshot.requestViewMode"
              :response-view-mode="snapshot.responseViewMode"
              @set-request-view-mode="detailShellStore.setRequestViewMode"
              @set-response-view-mode="detailShellStore.setResponseViewMode"
              @open-agent-run="handleOpenAgentRun"
            />

            <ConversationDetailDialogLlmDetail
              v-else
              :selected-groups="selectedGroups"
              :selected-group-id="snapshot.selectedGroupId"
              :selected-doc-id="snapshot.selectedDocId"
              :active-tooltip-id="activeTooltipId"
              :get-tooltip-style="getTooltipStyle"
              :get-doc-view-mode="getDocViewMode"
              :format-text-payload="formatTextPayload"
              :should-render-markdown="shouldRenderMarkdown"
              :get-doc-item-class="getDocItemClass"
              @set-content-ref="setContentRef"
              @scroll-to-doc="scrollToDoc"
              @register-doc-ref="registerDocRef"
              @register-tooltip-ref="registerTooltipRef"
              @show-tooltip="showTooltip"
              @hide-tooltip="hideTooltip"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type {
  ChatDetailDataViewMode,
  ChatDetailShellDocGroupId,
  ChatDetailShellDocItem
} from '@renderer/stores/normal-chat/chat-detail-shell/chat-detail-shell.types'
import { useNormalChatChatDetailShellStore } from '@renderer/stores/normal-chat/chat-detail-shell/chat-detail-shell.store'
import { useNormalChatAgentDetailShellStore } from '@renderer/stores/normal-chat/agent-detail-shell/agent-detail-shell.store'
import ConversationDetailDialogFunctioncallDetail from './ConversationDetailDialog.FunctioncallDetail.vue'
import ConversationDetailDialogFunctioncallOverview from './ConversationDetailDialog.FunctioncallOverview.vue'
import ConversationDetailDialogLlmDetail from './ConversationDetailDialog.LlmDetail.vue'
import ConversationDetailDialogNavRail from './ConversationDetailDialog.NavRail.vue'
import ConversationDetailDialogOverview from './ConversationDetailDialog.Overview.vue'

const OBSERVER_ROOT_MARGIN = '-8% 0px -70% 0px'
const PROGRAMMATIC_SCROLL_LOCK_MS = 320

const detailShellStore = useNormalChatChatDetailShellStore()
const agentDetailShellStore = useNormalChatAgentDetailShellStore()
const {
  snapshot,
  detail,
  dialogTitle,
  breadcrumbText,
  llmCallItems,
  functioncallItems,
  selectedCallItem,
  selectedFunctioncallItem,
  selectedGroups
} = storeToRefs(detailShellStore)

const contentRef = ref<HTMLElement | null>(null)
const activeTooltipId = ref('')
const tooltipStyles = ref<Record<string, Record<string, string>>>({})
const tooltipRefRegistry = new Map<string, HTMLElement>()
const docRefRegistry = new Map<string, HTMLElement>()
const docMetaMap = computed(() => {
  const entries = selectedGroups.value.flatMap((group) =>
    group.items.map((item) => [item.id, { docId: item.id, groupId: group.id }] as const)
  )
  return new Map(entries)
})
const currentPageTitle = computed(() => {
  if (snapshot.value.currentPage === 'functioncall-overview') return 'Functioncall Records'
  if (snapshot.value.currentPage === 'functioncall-detail') {
    return selectedFunctioncallItem.value?.title ?? 'Functioncall Detail'
  }
  return detail.value?.hasLlmCallDetails
    ? (selectedCallItem.value?.title ?? 'LLM Call Detail')
    : 'LLM Call Unavailable'
})
const overviewDescription = computed(() => {
  return detail.value?.llmCallEmptyMessage ?? '每一行对应当前 turn 中的一次主要模型调用。'
})

const currentViewMode = computed<ChatDetailDataViewMode>(() => {
  switch (snapshot.value.selectedGroupId) {
    case 'response':
      return snapshot.value.responseViewMode
    case 'schema_debug':
      return snapshot.value.schemaViewMode
    case 'request':
    default:
      return snapshot.value.requestViewMode
  }
})

let observer: IntersectionObserver | null = null
let programmaticScrollTimer: ReturnType<typeof setTimeout> | null = null
let programmaticTargetDocId = ''
let isProgrammaticScroll = false

function handleBack(): void {
  if (snapshot.value.currentPage === 'functioncall-detail') {
    detailShellStore.openFunctioncallOverview()
    return
  }
  detailShellStore.goToOverview()
}

function clearProgrammaticScrollLock(): void {
  if (programmaticScrollTimer) {
    clearTimeout(programmaticScrollTimer)
    programmaticScrollTimer = null
  }
  isProgrammaticScroll = false
  programmaticTargetDocId = ''
}

function setCurrentViewMode(mode: ChatDetailDataViewMode): void {
  switch (snapshot.value.selectedGroupId) {
    case 'response':
      detailShellStore.setResponseViewMode(mode)
      break
    case 'schema_debug':
      detailShellStore.setSchemaViewMode(mode)
      break
    default:
      detailShellStore.setRequestViewMode(mode)
      break
  }
}

function setContentRef(el: HTMLElement | null): void {
  contentRef.value = el
  rebuildObserver()
}

function getDocItemClass(docId: string, groupId: ChatDetailShellDocGroupId): string {
  if (snapshot.value.selectedDocId === docId) {
    return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100'
  }
  if (snapshot.value.selectedGroupId === groupId) {
    return 'text-gray-700 hover:bg-blue-50/60'
  }
  return 'text-gray-700 hover:bg-gray-50'
}

function registerDocRef(docId: string, el: Element | { $el?: Element } | null): void {
  const resolved = el instanceof HTMLElement ? el : el && '$el' in el ? el.$el : null
  if (!(resolved instanceof HTMLElement)) {
    docRefRegistry.delete(docId)
    return
  }
  docRefRegistry.set(docId, resolved)
  rebuildObserver()
}

function rebuildObserver(): void {
  observer?.disconnect()
  observer = null
  if (!contentRef.value || typeof IntersectionObserver === 'undefined') {
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      const visibleEntries = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)
      const nextDocId = visibleEntries[0]?.target.getAttribute('id') ?? ''
      if (!nextDocId) return
      if (isProgrammaticScroll && nextDocId !== programmaticTargetDocId) return
      const meta = docMetaMap.value.get(nextDocId)
      if (!meta) return
      detailShellStore.setActiveDocument(meta.docId, meta.groupId)
    },
    {
      root: contentRef.value,
      rootMargin: OBSERVER_ROOT_MARGIN,
      threshold: [0, 0.01, 0.1, 0.25, 0.5]
    }
  )

  Array.from(docRefRegistry.values()).forEach((element) => observer?.observe(element))
}

function scrollToDoc(docId: string, groupId: ChatDetailShellDocGroupId): void {
  if (!docId) {
    detailShellStore.setSelectedGroup(groupId)
    return
  }

  detailShellStore.setActiveDocument(docId, groupId)
  isProgrammaticScroll = true
  programmaticTargetDocId = docId
  if (programmaticScrollTimer) clearTimeout(programmaticScrollTimer)
  programmaticScrollTimer = setTimeout(() => {
    clearProgrammaticScrollLock()
  }, PROGRAMMATIC_SCROLL_LOCK_MS)

  requestAnimationFrame(() => {
    const target = docRefRegistry.get(docId) ?? document.getElementById(docId)
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function registerTooltipRef(docId: string, el: Element | { $el?: Element } | null): void {
  const resolved = el instanceof HTMLElement ? el : el && '$el' in el ? el.$el : null
  if (!(resolved instanceof HTMLElement)) {
    tooltipRefRegistry.delete(docId)
    return
  }
  tooltipRefRegistry.set(docId, resolved)
}

async function showTooltip(docId: string): Promise<void> {
  activeTooltipId.value = docId
  await nextTick()
  const tooltip = tooltipRefRegistry.get(docId)
  if (!tooltip) return

  const rect = tooltip.getBoundingClientRect()
  const viewportPadding = 16
  let offsetX = 0
  if (rect.left < viewportPadding) offsetX += viewportPadding - rect.left
  if (rect.right > window.innerWidth - viewportPadding) {
    offsetX -= rect.right - (window.innerWidth - viewportPadding)
  }

  tooltipStyles.value = {
    ...tooltipStyles.value,
    [docId]: offsetX === 0 ? {} : { transform: `translateX(${Math.round(offsetX)}px)` }
  }
}

function hideTooltip(): void {
  activeTooltipId.value = ''
}

function getTooltipStyle(docId: string): Record<string, string> {
  return tooltipStyles.value[docId] ?? {}
}

function getDocViewMode(doc: ChatDetailShellDocItem): ChatDetailDataViewMode {
  if (doc.groupId === 'response') return snapshot.value.responseViewMode
  if (doc.groupId === 'schema_debug') return snapshot.value.schemaViewMode
  return snapshot.value.requestViewMode
}

function formatTextPayload(doc: ChatDetailShellDocItem): string {
  if (doc.payload === null) return 'null'
  if (typeof doc.payload === 'string') return doc.payload
  return JSON.stringify(doc.payload, null, 2)
}

function shouldRenderMarkdown(doc: ChatDetailShellDocItem): boolean {
  return doc.kind === 'markdown' || doc.kind === 'text'
}

async function handleOpenAgentRun(agentRunId: string): Promise<void> {
  if (!snapshot.value.requestId || !agentRunId) {
    return
  }

  await agentDetailShellStore.openDialog({
    requestId: snapshot.value.requestId,
    messageId: snapshot.value.messageId,
    focusAgentRunId: agentRunId
  })
}

watch(
  () => [snapshot.value.visible, snapshot.value.currentPage, selectedGroups.value.length],
  () => {
    if (snapshot.value.currentPage !== 'llm-call') {
      observer?.disconnect()
      observer = null
      return
    }
    nextTick(() => {
      rebuildObserver()
    })
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
  clearProgrammaticScrollLock()
})
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
