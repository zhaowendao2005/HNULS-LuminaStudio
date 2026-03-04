<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="store.visible"
        class="of-variable-selector-overlay fixed inset-0 z-50"
        @click="handleOverlayClick"
      >
        <div
          class="of-variable-selector-panel absolute z-10 w-80 max-h-96 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
          :style="panelStyle"
          @click.stop
        >
          <!-- 搜索框 -->
          <div class="border-b border-gray-100 p-2">
            <div
              class="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5"
            >
              <svg
                class="h-4 w-4 shrink-0 text-gray-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                ref="searchInput"
                v-model="localKeyword"
                class="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                placeholder="搜索变量..."
                @input="handleSearch"
              />
            </div>
          </div>

          <!-- 变量列表 -->
          <div class="max-h-64 overflow-y-auto py-1">
            <div
              v-if="store.availableVariables.length === 0"
              class="px-3 py-4 text-center text-sm text-gray-400"
            >
              暂无可用变量
            </div>
            <div
              v-for="variable in store.availableVariables"
              :key="variable.id"
              class="mx-1 cursor-pointer rounded-md px-3 py-2 hover:bg-indigo-50"
              :class="{ 'bg-indigo-50': selectedId === variable.id }"
              @click="handleSelect(variable)"
              @mouseenter="selectedId = variable.id"
            >
              <div class="flex items-center gap-2">
                <!-- 节点类型图标 -->
                <div
                  class="flex h-5 w-5 items-center justify-center rounded text-xs font-medium"
                  :class="getNodeTypeClass(variable.nodeType)"
                >
                  {{ getNodeTypeIcon(variable.nodeType) }}
                </div>
                <!-- 变量信息 -->
                <div class="flex-1 min-w-0">
                  <div class="truncate text-sm font-medium text-gray-900">{{ variable.label }}</div>
                  <div class="truncate text-xs text-gray-400">{{ variable.nodeTitle }}</div>
                </div>
                <!-- 变量名 -->
                <div class="shrink-0 text-xs text-gray-400 font-mono">
                  {{ variable.variable }}
                </div>
              </div>
            </div>
          </div>

          <!-- 底部提示 -->
          <div class="border-t border-gray-100 px-3 py-2 text-xs text-gray-400">
            <span class="mr-2">确认</span>
            <kbd class="rounded bg-gray-100 px-1 py-0.5 font-mono text-gray-600">Enter</kbd>
            <span class="mx-2">取消</span>
            <kbd class="rounded bg-gray-100 px-1 py-0.5 font-mono text-gray-600">Esc</kbd>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useVariableSelectorStore } from '@renderer/stores/orchestraflow/workflow-editor/variable-selector/variable-selector.store'
import type { OFAvailableVariable } from '@renderer/stores/orchestraflow/workflow-editor/variable-selector/variable-selector.types'
import { OFBlockEnum } from '@shared/Orchestraflow-types'

const store = useVariableSelectorStore()
const searchInput = ref<HTMLInputElement | null>(null)
const localKeyword = ref('')
const selectedId = ref<string | ''>('')

// 面板位置（暂时固定在右侧）
const panelStyle = ref({
  top: '0px',
  right: '420px'
})

// 监听显示状态，自动聚焦搜索框
watch(
  () => store.visible,
  async (visible) => {
    if (visible) {
      localKeyword.value = ''
      selectedId.value = ''
      await nextTick()
      searchInput.value?.focus()
    }
  }
)

// 监听关键词变化
watch(localKeyword, (val) => {
  store.setSearchKeyword(val)
})

// 处理搜索
function handleSearch() {
  store.setSearchKeyword(localKeyword.value)
}

// 处理选择
function handleSelect(variable: OFAvailableVariable) {
  // 触发选择事件
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

// 处理遮罩点击
function handleOverlayClick() {
  store.closeSelector()
}

// 获取节点类型样式
function getNodeTypeClass(type: OFBlockEnum): string {
  switch (type) {
    case OFBlockEnum.Start:
      return 'bg-green-100 text-green-600'
    case OFBlockEnum.LLM:
      return 'bg-indigo-100 text-indigo-600'
    case OFBlockEnum.End:
      return 'bg-red-100 text-red-600'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

// 获取节点类型图标
function getNodeTypeIcon(type: OFBlockEnum): string {
  switch (type) {
    case OFBlockEnum.Start:
      return 'S'
    case OFBlockEnum.LLM:
      return 'L'
    case OFBlockEnum.End:
      return 'E'
    default:
      return '?'
  }
}

// 键盘事件处理
function handleKeydown(e: KeyboardEvent) {
  if (!store.visible) return

  if (e.key === 'Escape') {
    store.closeSelector()
  } else if (e.key === 'Enter') {
    const selected = store.availableVariables.find((v) => v.id === selectedId.value)
    if (selected) {
      handleSelect(selected)
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    const currentIndex = store.availableVariables.findIndex((v) => v.id === selectedId.value)
    if (currentIndex < store.availableVariables.length - 1) {
      selectedId.value = store.availableVariables[currentIndex + 1].id
    } else if (store.availableVariables.length > 0) {
      selectedId.value = store.availableVariables[0].id
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    const currentIndex = store.availableVariables.findIndex((v) => v.id === selectedId.value)
    if (currentIndex > 0) {
      selectedId.value = store.availableVariables[currentIndex - 1].id
    } else if (store.availableVariables.length > 0) {
      selectedId.value = store.availableVariables[store.availableVariables.length - 1].id
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
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

.of-variable-selector-overlay {
  background: transparent;
}
</style>
