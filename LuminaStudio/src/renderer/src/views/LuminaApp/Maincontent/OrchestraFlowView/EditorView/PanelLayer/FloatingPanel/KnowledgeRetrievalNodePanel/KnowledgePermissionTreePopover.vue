<template>
  <Teleport to="body">
    <Transition name="of-kr-tree-fade">
      <div v-if="visible" class="fixed inset-0 z-50" @click="emit('close')">
        <div
          ref="panelRef"
          class="of-kr-tree-popover of-kr-tree-popover-locator"
          :style="panelStyle"
          @click.stop
        >
          <div class="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <div class="text-[13px] font-semibold text-gray-800">权限范围</div>
            <button
              type="button"
              class="of-kr-action-text inline-flex items-center gap-1 text-xs"
              :disabled="refreshing || loadingBases"
              @click="emit('refresh')"
            >
              <svg
                viewBox="0 0 24 24"
                class="h-3.5 w-3.5"
                :class="{ 'animate-spin': refreshing || loadingBases }"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"
                />
              </svg>
              刷新
            </button>
          </div>

          <div class="border-b border-gray-100 px-3 py-2">
            <div class="relative">
              <svg
                viewBox="0 0 24 24"
                class="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                fill="currentColor"
              >
                <path
                  d="M18.031 16.6168L22.3137 20.8995L20.8995 22.3137L16.6168 18.031C15.0769 19.263 13.124 20 11 20C6.032 20 2 15.968 2 11C2 6.032 6.032 2 11 2C15.968 2 20 6.032 20 11C20 13.124 19.263 15.0769 18.031 16.6168ZM16.0247 15.8748C17.2475 14.6146 18 12.8956 18 11C18 7.1325 14.8675 4 11 4C7.1325 4 4 7.1325 4 11C4 14.8675 7.1325 18 11 18C12.8956 18 14.6146 17.2475 15.8748 16.0247L16.0247 15.8748Z"
                />
              </svg>
              <input
                ref="searchInputRef"
                v-model="searchKeyword"
                class="h-9 w-full rounded-lg border border-gray-200 bg-[#f6f8fb] pl-8 pr-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-[#8ca7ff] focus:bg-white"
                placeholder="搜索知识库或文档"
              />
            </div>
          </div>

          <div class="max-h-[62vh] overflow-y-auto px-1 py-2">
            <div v-if="loadingBases" class="px-3 py-8 text-center text-sm text-gray-400">
              正在加载知识库...
            </div>

            <div
              v-else-if="filteredKnowledgeBases.length === 0"
              class="px-3 py-8 text-center text-sm text-gray-400"
            >
              暂无可选项
            </div>

            <template v-else>
              <div
                v-for="knowledgeBase in filteredKnowledgeBases"
                :key="knowledgeBase.id"
                class="mb-1 overflow-hidden rounded-lg border border-transparent hover:border-gray-100"
              >
                <div class="flex items-center gap-1.5 px-2 py-1.5">
                  <input
                    type="checkbox"
                    :checked="getKnowledgeBaseCheckState(knowledgeBase).checked"
                    :indeterminate.prop="getKnowledgeBaseCheckState(knowledgeBase).indeterminate"
                    class="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-1 focus:ring-cyan-500"
                    @change="
                      handleKnowledgeBaseCheck(
                        knowledgeBase,
                        ($event.target as HTMLInputElement).checked
                      )
                    "
                  />

                  <button
                    type="button"
                    class="flex h-4 w-4 items-center justify-center rounded text-gray-400 hover:bg-gray-100"
                    @click.stop="toggleExpandKnowledgeBase(knowledgeBase)"
                  >
                    <svg
                      viewBox="0 0 14 14"
                      class="h-3 w-3 transition-transform"
                      :class="isExpanded(knowledgeBase.id) ? 'rotate-90' : ''"
                      fill="none"
                    >
                      <path
                        d="M5.25 10.5L8.75 7L5.25 3.5"
                        stroke="currentColor"
                        stroke-width="1.25"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>

                  <div class="min-w-0 flex-1">
                    <div class="truncate text-[13px] font-semibold text-gray-800">
                      {{ knowledgeBase.name }}
                    </div>
                    <div class="text-[11px] text-gray-500">
                      {{ getKnowledgeBaseSubLabel(knowledgeBase) }}
                    </div>
                  </div>
                </div>

                <div
                  v-if="isExpanded(knowledgeBase.id)"
                  class="border-t border-gray-100 bg-[#fafbfc] px-2 py-1.5"
                >
                  <div
                    v-if="knowledgeBase.loadingDocuments"
                    class="px-7 py-2 text-xs text-gray-400"
                  >
                    文档加载中...
                  </div>
                  <div
                    v-else-if="knowledgeBase.documents.length === 0"
                    class="px-7 py-2 text-xs text-gray-400"
                  >
                    暂无文档
                  </div>
                  <div
                    v-for="document in getVisibleDocuments(knowledgeBase)"
                    :key="`${knowledgeBase.id}-${document.fileKey}`"
                    class="mb-1 flex items-center gap-1.5 px-7 py-1"
                  >
                    <input
                      type="checkbox"
                      :checked="isDocumentChecked(knowledgeBase, document.fileKey)"
                      class="h-3.5 w-3.5 rounded border-gray-300 text-cyan-600 focus:ring-1 focus:ring-cyan-500"
                      @change="
                        handleDocumentCheck(
                          knowledgeBase,
                          document.fileKey,
                          ($event.target as HTMLInputElement).checked
                        )
                      "
                    />
                    <div class="min-w-0 flex-1 text-[12px] text-gray-700">
                      <div class="truncate">{{ document.fileName }}</div>
                      <div class="truncate text-[10px] text-gray-400">{{ document.fileKey }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

interface KnowledgeTreeDocumentOption {
  id: string
  fileKey: string
  fileName: string
}

interface KnowledgeTreeBaseOption {
  id: number
  name: string
  docCount: number
  documentsLoaded: boolean
  loadingDocuments: boolean
  documents: KnowledgeTreeDocumentOption[]
}

interface PermissionSelectionModel {
  selectedKnowledgeBaseIds: number[]
  selectedDocumentsByBase: Record<number, string[]>
}

const props = defineProps<{
  visible: boolean
  anchorRect: DOMRect | null
  knowledgeBases: KnowledgeTreeBaseOption[]
  selection: PermissionSelectionModel
  loadingBases: boolean
  refreshing: boolean
}>()

const emit = defineEmits<{
  close: []
  refresh: []
  requestLoadDocuments: [knowledgeBaseId: number]
  'update:selection': [value: PermissionSelectionModel]
}>()

const panelRef = ref<HTMLDivElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const searchKeyword = ref('')
const expandedKnowledgeBaseMap = ref<Record<number, boolean>>({})
const panelStyle = ref({
  top: '12px',
  left: '12px'
})

const normalizedKeyword = computed(() => searchKeyword.value.trim().toLowerCase())

const filteredKnowledgeBases = computed(() => {
  if (!normalizedKeyword.value) {
    return props.knowledgeBases
  }

  return props.knowledgeBases.filter((knowledgeBase) => {
    const matchesKnowledgeBase = knowledgeBase.name.toLowerCase().includes(normalizedKeyword.value)
    if (matchesKnowledgeBase) {
      return true
    }
    return knowledgeBase.documents.some(
      (document) =>
        document.fileName.toLowerCase().includes(normalizedKeyword.value) ||
        document.fileKey.toLowerCase().includes(normalizedKeyword.value)
    )
  })
})

function isExpanded(knowledgeBaseId: number): boolean {
  if (normalizedKeyword.value) {
    return true
  }
  return Boolean(expandedKnowledgeBaseMap.value[knowledgeBaseId])
}

function getVisibleDocuments(
  knowledgeBase: KnowledgeTreeBaseOption
): KnowledgeTreeDocumentOption[] {
  if (!normalizedKeyword.value) {
    return knowledgeBase.documents
  }

  const knowledgeBaseMatched = knowledgeBase.name.toLowerCase().includes(normalizedKeyword.value)
  if (knowledgeBaseMatched) {
    return knowledgeBase.documents
  }

  return knowledgeBase.documents.filter(
    (document) =>
      document.fileName.toLowerCase().includes(normalizedKeyword.value) ||
      document.fileKey.toLowerCase().includes(normalizedKeyword.value)
  )
}

function getSelectionSets() {
  const selectedKnowledgeBaseIds = new Set(
    props.selection.selectedKnowledgeBaseIds.filter(
      (value): value is number => typeof value === 'number' && Number.isInteger(value) && value > 0
    )
  )

  const selectedDocumentsByBase: Record<number, Set<string>> = {}
  Object.entries(props.selection.selectedDocumentsByBase || {}).forEach(([key, documentKeys]) => {
    const knowledgeBaseId = Number(key)
    if (!Number.isInteger(knowledgeBaseId) || knowledgeBaseId <= 0) return
    selectedDocumentsByBase[knowledgeBaseId] = new Set(
      Array.isArray(documentKeys) ? documentKeys.filter(Boolean) : []
    )
  })

  return { selectedKnowledgeBaseIds, selectedDocumentsByBase }
}

function emitSelectionChange(value: {
  selectedKnowledgeBaseIds: Set<number>
  selectedDocumentsByBase: Record<number, Set<string>>
}) {
  const nextSelection: PermissionSelectionModel = {
    selectedKnowledgeBaseIds: Array.from(value.selectedKnowledgeBaseIds).sort((a, b) => a - b),
    selectedDocumentsByBase: {}
  }

  Object.entries(value.selectedDocumentsByBase).forEach(([key, documentKeys]) => {
    if (!documentKeys.size) return
    nextSelection.selectedDocumentsByBase[Number(key)] = Array.from(documentKeys).sort()
  })

  emit('update:selection', nextSelection)
}

function getKnowledgeBaseCheckState(knowledgeBase: KnowledgeTreeBaseOption): {
  checked: boolean
  indeterminate: boolean
} {
  const { selectedKnowledgeBaseIds, selectedDocumentsByBase } = getSelectionSets()
  const knowledgeBaseChecked = selectedKnowledgeBaseIds.has(knowledgeBase.id)
  const documentSet = selectedDocumentsByBase[knowledgeBase.id] || new Set<string>()

  if (knowledgeBaseChecked && documentSet.size === 0) {
    return { checked: true, indeterminate: false }
  }

  if (!documentSet.size) {
    return { checked: false, indeterminate: false }
  }

  const totalDocuments = knowledgeBase.documentsLoaded
    ? knowledgeBase.documents.length
    : knowledgeBase.docCount
  if (totalDocuments > 0 && documentSet.size >= totalDocuments) {
    return { checked: true, indeterminate: false }
  }

  return { checked: false, indeterminate: true }
}

function getKnowledgeBaseSubLabel(knowledgeBase: KnowledgeTreeBaseOption): string {
  const { selectedKnowledgeBaseIds, selectedDocumentsByBase } = getSelectionSets()
  const documentSet = selectedDocumentsByBase[knowledgeBase.id] || new Set<string>()
  if (selectedKnowledgeBaseIds.has(knowledgeBase.id) && documentSet.size === 0) {
    return `全选文档（${knowledgeBase.docCount}）`
  }

  if (documentSet.size > 0) {
    return `已选 ${documentSet.size} / ${knowledgeBase.docCount}`
  }

  return `${knowledgeBase.docCount} 个文档`
}

function isDocumentChecked(knowledgeBase: KnowledgeTreeBaseOption, fileKey: string): boolean {
  const { selectedKnowledgeBaseIds, selectedDocumentsByBase } = getSelectionSets()
  const documentSet = selectedDocumentsByBase[knowledgeBase.id] || new Set<string>()

  // 中文注释：当知识库被整库勾选且没有“局部文档集合”时，视为该知识库下文档全部选中。
  if (selectedKnowledgeBaseIds.has(knowledgeBase.id) && documentSet.size === 0) {
    return true
  }
  return documentSet.has(fileKey)
}

function handleKnowledgeBaseCheck(knowledgeBase: KnowledgeTreeBaseOption, checked: boolean) {
  const { selectedKnowledgeBaseIds, selectedDocumentsByBase } = getSelectionSets()
  if (checked) {
    selectedKnowledgeBaseIds.add(knowledgeBase.id)
    delete selectedDocumentsByBase[knowledgeBase.id]
  } else {
    selectedKnowledgeBaseIds.delete(knowledgeBase.id)
    delete selectedDocumentsByBase[knowledgeBase.id]
  }
  emitSelectionChange({ selectedKnowledgeBaseIds, selectedDocumentsByBase })
}

function handleDocumentCheck(
  knowledgeBase: KnowledgeTreeBaseOption,
  fileKey: string,
  checked: boolean
) {
  const { selectedKnowledgeBaseIds, selectedDocumentsByBase } = getSelectionSets()
  const wasKnowledgeBaseChecked = selectedKnowledgeBaseIds.has(knowledgeBase.id)

  let documentSet = new Set(selectedDocumentsByBase[knowledgeBase.id] || [])

  // 中文注释：如果当前是“整库选中”状态，第一次改文档勾选要先展开为“显式文档集合”再做增删。
  if (wasKnowledgeBaseChecked && documentSet.size === 0) {
    documentSet = new Set(knowledgeBase.documents.map((document) => document.fileKey))
  }

  if (checked) {
    documentSet.add(fileKey)
  } else {
    documentSet.delete(fileKey)
  }

  if (knowledgeBase.documents.length > 0 && documentSet.size >= knowledgeBase.documents.length) {
    selectedKnowledgeBaseIds.add(knowledgeBase.id)
    delete selectedDocumentsByBase[knowledgeBase.id]
  } else if (documentSet.size === 0) {
    selectedKnowledgeBaseIds.delete(knowledgeBase.id)
    delete selectedDocumentsByBase[knowledgeBase.id]
  } else {
    selectedKnowledgeBaseIds.delete(knowledgeBase.id)
    selectedDocumentsByBase[knowledgeBase.id] = documentSet
  }

  emitSelectionChange({ selectedKnowledgeBaseIds, selectedDocumentsByBase })
}

function toggleExpandKnowledgeBase(knowledgeBase: KnowledgeTreeBaseOption) {
  const nextExpanded = !expandedKnowledgeBaseMap.value[knowledgeBase.id]
  expandedKnowledgeBaseMap.value = {
    ...expandedKnowledgeBaseMap.value,
    [knowledgeBase.id]: nextExpanded
  }
  if (nextExpanded && !knowledgeBase.documentsLoaded && !knowledgeBase.loadingDocuments) {
    emit('requestLoadDocuments', knowledgeBase.id)
  }
}

function updatePanelPosition() {
  const panelWidth = 356
  const panelHeight = panelRef.value?.offsetHeight || 460
  const gap = 10
  const padding = 10

  if (!props.anchorRect) {
    panelStyle.value = { top: '12px', left: '12px' }
    return
  }

  let left = props.anchorRect.left
  let top = props.anchorRect.bottom + gap

  if (left + panelWidth > window.innerWidth - padding) {
    left = Math.max(padding, window.innerWidth - panelWidth - padding)
  }

  if (top + panelHeight > window.innerHeight - padding) {
    top = Math.max(padding, props.anchorRect.top - panelHeight - gap)
  }

  panelStyle.value = {
    top: `${top}px`,
    left: `${left}px`
  }
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if (!props.visible) return
  if (event.key === 'Escape') {
    emit('close')
  }
}

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) return
    searchKeyword.value = ''
    await nextTick()
    updatePanelPosition()
    searchInputRef.value?.focus()
  }
)

watch(
  () => props.knowledgeBases,
  async () => {
    if (!props.visible) return
    await nextTick()
    updatePanelPosition()
  },
  { deep: true }
)

onMounted(() => {
  window.addEventListener('resize', updatePanelPosition)
  window.addEventListener('scroll', updatePanelPosition, true)
  document.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('resize', updatePanelPosition)
  window.removeEventListener('scroll', updatePanelPosition, true)
  document.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<style scoped>
.of-kr-tree-popover {
  position: absolute;
  width: 356px;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.18);
}

.of-kr-action-text {
  color: #2563eb;
  font-weight: 600;
}

.of-kr-action-text:hover {
  color: #1d4ed8;
}

.of-kr-tree-fade-enter-active,
.of-kr-tree-fade-leave-active {
  transition: opacity 0.15s ease;
}

.of-kr-tree-fade-enter-from,
.of-kr-tree-fade-leave-to {
  opacity: 0;
}
</style>
