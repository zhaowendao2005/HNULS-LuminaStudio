<template>
  <div
    class="of-editor-leftbar absolute -left-2 top-0 bottom-0 pointer-events-auto w-12 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col p-2 z-10"
  >
    <div class="flex-1 overflow-y-auto flex flex-col items-center gap-2">
      <!-- 第一组：添加节点和添加注释 -->
      <div class="flex flex-col gap-1.5">
        <!-- 添加节点按钮 -->
        <button
          ref="nodeButtonRef"
          class="w-8 h-8 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
          :class="{ 'bg-green-100': expandedPanel === 'node' }"
          title="添加节点"
          @click="togglePanel('node')"
        >
          <svg
            class="w-4 h-4 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        </button>

        <!-- 添加注释按钮 -->
        <button
          class="w-8 h-8 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
          title="添加注释"
        >
          <svg
            class="w-4 h-4 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
            />
          </svg>
        </button>
      </div>

      <!-- 分隔线 -->
      <div class="w-6 h-px bg-gray-200"></div>

      <!-- 第二组：最大化画布、手模式、指针模式 -->
      <div class="flex flex-col gap-1.5">
        <!-- 最大化画布按钮 -->
        <button
          class="w-8 h-8 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
          title="最大化画布"
        >
          <svg
            class="w-4 h-4 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        </button>

        <!-- 手模式按钮 -->
        <button
          class="w-8 h-8 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
          title="手模式"
        >
          <svg
            class="w-4 h-4 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a8.5 8.5 0 0017 0v-4a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
            />
          </svg>
        </button>

        <!-- 指针模式按钮 -->
        <button
          class="w-8 h-8 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
          title="指针模式"
        >
          <svg
            class="w-4 h-4 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
            />
          </svg>
        </button>
      </div>

      <!-- 分隔线 -->
      <div class="w-6 h-px bg-gray-200"></div>

      <!-- 测试底部展开 -->
      <div class="flex flex-col gap-1.5 mt-auto">
        <button
          ref="bottomButtonRef"
          class="w-8 h-8 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
          :class="{ 'bg-green-100': expandedPanel === 'bottom' }"
          title="底部测试"
          @click="togglePanel('bottom')"
        >
          <svg class="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </button>
      </div>

      <!-- 第三组：更多 -->
      <div class="flex flex-col gap-1.5">
        <!-- 更多按钮 -->
        <button
          class="w-8 h-8 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
          title="更多"
        >
          <svg
            class="w-4 h-4 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- 扩展面板 -->
    <Teleport to="body">
      <!-- 节点面板 -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 -translate-x-2"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 -translate-x-2"
      >
        <NodePanel
          v-if="expandedPanel === 'node'"
          :style="nodePanelStyle"
          @close="expandedPanel = null"
        />
      </Transition>

      <!-- 底部测试面板 -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 -translate-x-2"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 -translate-x-2"
      >
        <BottomPanel
          v-if="expandedPanel === 'bottom'"
          :style="bottomPanelStyle"
          @close="expandedPanel = null"
        />
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import NodePanel from './components/NodePanel/index.vue'
import BottomPanel from './components/BottomPanel/index.vue'

type PanelType = 'node' | 'bottom' | null

const expandedPanel = ref<PanelType>(null)
const nodeButtonRef = ref<HTMLButtonElement | null>(null)
const bottomButtonRef = ref<HTMLButtonElement | null>(null)
const buttonRect = ref<DOMRect | null>(null)

const togglePanel = async (panel: PanelType) => {
  if (expandedPanel.value === panel) {
    expandedPanel.value = null
  } else {
    const ref = panel === 'node' ? nodeButtonRef.value : bottomButtonRef.value
    if (ref) {
      buttonRect.value = ref.getBoundingClientRect()
    }
    expandedPanel.value = panel
  }
}

const nodePanelStyle = computed(() => {
  if (!buttonRect.value || expandedPanel.value !== 'node') return {}

  const PANEL_HEIGHT = 400
  const OFFSET_X = 16
  const containerHeight = window.innerHeight
  const spaceBelow = containerHeight - buttonRect.value.top

  const top =
    spaceBelow >= PANEL_HEIGHT + 20 ? buttonRect.value.top : buttonRect.value.bottom - PANEL_HEIGHT

  return {
    position: 'fixed',
    left: `${buttonRect.value.right + OFFSET_X}px`,
    top: `${top}px`,
    zIndex: 9999
  }
})

const bottomPanelStyle = computed(() => {
  if (!buttonRect.value || expandedPanel.value !== 'bottom') return {}

  const PANEL_HEIGHT = 600 // 更多内容用于测试
  const OFFSET_X = 16
  const containerHeight = window.innerHeight
  const spaceBelow = containerHeight - buttonRect.value.top

  const top =
    spaceBelow >= PANEL_HEIGHT + 20 ? buttonRect.value.top : buttonRect.value.bottom - PANEL_HEIGHT

  return {
    position: 'fixed',
    left: `${buttonRect.value.right + OFFSET_X}px`,
    top: `${top}px`,
    zIndex: 9999
  }
})
</script>
