<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="store.visible"
        class="fixed inset-0 z-50"
        @click="handleOverlayClick"
      >
        <div
          class="absolute w-[296px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.18)]"
          :style="panelStyle"
          @click.stop
        >
          <div class="border-b border-gray-100 px-2 py-2">
            <div class="relative">
              <svg
                viewBox="0 0 24 24"
                class="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                fill="currentColor"
              >
                <path
                  d="M18.031 16.6168L22.3137 20.8995L20.8995 22.3137L16.6168 18.031C15.0769 19.263 13.124 20 11 20C6.032 20 2 15.968 2 11C2 6.032 6.032 2 11 2C15.968 2 20 6.032 20 11C20 13.124 19.263 15.0769 18.031 16.6168ZM16.0247 15.8748C17.2475 14.6146 18 12.8956 18 11C18 7.1325 14.8675 4 11 4C7.1325 4 4 7.1325 4 11C4 14.8675 7.1325 18 11 18C12.8956 18 14.6146 17.2475 15.8748 16.0247L16.0247 15.8748Z"
                />
              </svg>
              <input
                ref="searchInput"
                v-model="localKeyword"
                class="h-9 w-full rounded-xl border border-transparent bg-[#f5f7fb] pl-8 pr-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 hover:border-gray-200 focus:border-[#93a3ff] focus:bg-white"
                placeholder="搜索变量"
                @input="handleSearch"
              />
            </div>
          </div>

          <div class="max-h-[72vh] overflow-y-auto py-2">
            <div v-if="rows.length === 0" class="px-4 py-8 text-center text-sm text-gray-400">
              暂无可用变量
            </div>

            <template v-else>
              <template v-for="row in rows" :key="row.id">
                <div
                  v-if="row.kind === 'group'"
                  class="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400"
                >
                  {{ row.title }}
                </div>

                <div
                  v-else
                  class="flex h-7 cursor-pointer items-center gap-2 rounded-md pl-3 pr-2 text-sm"
                  :class="
                    selectedId === row.item.id ? 'bg-[#eef2ff] text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                  "
                  :style="{ paddingLeft: `${12 + row.depth * 16}px` }"
                  @mouseenter="selectedId = row.item.id"
                  @click="handleSelect(row.item)"
                >
                  <button
                    v-if="row.item.expandable"
                    class="flex h-4 w-4 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-100"
                    @click.stop="toggleExpand(row.item.id)"
                  >
                    <svg
                      viewBox="0 0 14 14"
                      class="h-3 w-3 transition-transform"
                      :class="isExpanded(row.item.id) ? 'rotate-90' : ''"
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
                  <span v-else class="h-4 w-4 shrink-0" />

                  <div
                    class="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-semibold"
                    :class="row.item.isSystem ? 'bg-[#fff3ea] text-[#f97316]' : 'bg-[#eef2ff] text-[#4f46e5]'"
                  >
                    {{ row.item.isSystem ? '□' : '{x}' }}
                  </div>

                  <div class="min-w-0 flex-1">
                    <div class="truncate text-[13px] font-medium">
                      {{ row.item.label }}
                    </div>
                  </div>

                  <div class="shrink-0 text-xs capitalize text-gray-400">
                    {{ formatType(row.item.type) }}
                  </div>
                </div>
              </template>
            </template>
          </div>

          <div class="border-t border-gray-100 px-3 py-2 text-[11px] text-gray-400">
            Enter 选择，Esc 关闭，方向键切换
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useVariableSelectorStore } from '@renderer/stores/orchestraflow/workflow-editor/variable-selector/variable-selector.store'
import type {
  OFAvailableVariable
} from '@renderer/stores/orchestraflow/workflow-editor/variable-selector/variable-selector.types'

type SelectorRow =
  | {
      kind: 'group'
      id: string
      title: string
    }
  | {
      kind: 'item'
      id: string
      item: OFAvailableVariable
      depth: number
    }

const store = useVariableSelectorStore()

const searchInput = ref<HTMLInputElement | null>(null)
const localKeyword = ref('')
const selectedId = ref('')
const panelStyle = ref({
  top: '12px',
  left: '12px'
})
const expandedIds = ref<Record<string, boolean>>({})

const isSearching = computed(() => localKeyword.value.trim().length > 0)

function isExpanded(id: string): boolean {
  return isSearching.value || Boolean(expandedIds.value[id])
}

function formatType(type: unknown): string {
  return String(type || 'string')
}

function toggleExpand(id: string) {
  expandedIds.value = {
    ...expandedIds.value,
    [id]: !expandedIds.value[id]
  }
}

function appendRows(
  items: OFAvailableVariable[],
  depth: number,
  target: SelectorRow[]
) {
  for (const item of items) {
    target.push({
      kind: 'item',
      id: item.id,
      item,
      depth
    })

    if (item.children?.length && isExpanded(item.id)) {
      appendRows(item.children, depth + 1, target)
    }
  }
}

const rows = computed<SelectorRow[]>(() => {
  const result: SelectorRow[] = []
  for (const group of store.availableGroups) {
    result.push({
      kind: 'group',
      id: group.id,
      title: group.title
    })
    appendRows(group.items, 0, result)
  }
  return result
})

const selectableItems = computed(() =>
  rows.value
    .filter((row): row is Extract<SelectorRow, { kind: 'item' }> => row.kind === 'item')
    .map((row) => row.item)
    .filter((item) => item.selectable)
)

function updatePanelStyle() {
  const anchor = store.anchorRect
  const panelWidth = 296
  const maxHeight = Math.min(window.innerHeight - 24, 620)
  const padding = 12
  const gap = 8

  if (!anchor) {
    panelStyle.value = {
      top: '12px',
      left: `${Math.max(12, window.innerWidth - panelWidth - 12)}px`
    }
    return
  }

  let left = anchor.left
  let top = anchor.bottom + gap

  if (left + panelWidth > window.innerWidth - padding) {
    left = window.innerWidth - panelWidth - padding
  }
  if (top + maxHeight > window.innerHeight - padding) {
    top = Math.max(padding, anchor.top - maxHeight - gap)
  }

  panelStyle.value = {
    top: `${Math.min(Math.max(top, padding), window.innerHeight - 120)}px`,
    left: `${Math.min(Math.max(left, padding), window.innerWidth - panelWidth - padding)}px`
  }
}

function handleSearch() {
  store.setSearchKeyword(localKeyword.value)
}

function handleSelect(variable: OFAvailableVariable) {
  if (!variable.selectable) return
  window.dispatchEvent(
    new CustomEvent('of:variable-select', {
      detail: {
        nodeId: store.targetNodeId,
        targetType: store.targetType,
        variable,
        cursorPosition: store.cursorPosition
      }
    })
  )
  store.closeSelector()
}

function handleOverlayClick() {
  store.closeSelector()
}

function moveSelection(direction: 1 | -1) {
  if (selectableItems.value.length === 0) return
  const currentIndex = selectableItems.value.findIndex((item) => item.id === selectedId.value)
  if (currentIndex === -1) {
    selectedId.value = selectableItems.value[0].id
    return
  }

  const nextIndex =
    direction === 1
      ? (currentIndex + 1) % selectableItems.value.length
      : (currentIndex - 1 + selectableItems.value.length) % selectableItems.value.length

  selectedId.value = selectableItems.value[nextIndex].id
}

function handleKeydown(event: KeyboardEvent) {
  if (!store.visible) return

  if (event.key === 'Escape') {
    store.closeSelector()
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveSelection(1)
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveSelection(-1)
    return
  }

  if (event.key === 'Enter') {
    const target = selectableItems.value.find((item) => item.id === selectedId.value)
    if (target) {
      handleSelect(target)
    }
  }
}

watch(
  () => store.visible,
  async (visible) => {
    if (!visible) return
    localKeyword.value = ''
    expandedIds.value = {}
    store.setSearchKeyword('')
    updatePanelStyle()
    await nextTick()
    selectedId.value = selectableItems.value[0]?.id || ''
    searchInput.value?.focus()
  }
)

watch(
  () => store.availableGroups,
  () => {
    if (!selectedId.value && selectableItems.value.length > 0) {
      selectedId.value = selectableItems.value[0].id
      return
    }

    if (selectedId.value && !selectableItems.value.some((item) => item.id === selectedId.value)) {
      selectedId.value = selectableItems.value[0]?.id || ''
    }
  },
  { deep: true }
)

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', updatePanelStyle)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', updatePanelStyle)
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
