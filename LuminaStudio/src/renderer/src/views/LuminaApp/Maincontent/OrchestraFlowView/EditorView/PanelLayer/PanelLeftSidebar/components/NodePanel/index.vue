<template>
  <div
    class="of-leftbar-node-panel w-72 bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col overflow-hidden"
  >
    <!-- 标签页 -->
    <div
      class="px-2 pt-2 pb-1 border-b border-gray-200 flex items-center justify-between flex-shrink-0"
    >
      <div class="flex gap-1">
        <button
          class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
          :class="
            activeTab === 'node' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'
          "
          @click="activeTab = 'node'"
        >
          节点
        </button>
        <button
          class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
          :class="
            activeTab === 'tool' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'
          "
          @click="activeTab = 'tool'"
        >
          工具
        </button>
      </div>
      <button
        class="w-5 h-5 hover:bg-gray-100 rounded flex items-center justify-center"
        title="关闭"
        @click="emit('close')"
      >
        <svg class="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    <!-- 搜索框 -->
    <div class="px-3 py-2 border-b border-gray-100 flex-shrink-0">
      <input
        type="text"
        placeholder="搜索..."
        class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
      />
    </div>

    <!-- 节点列表 -->
    <div class="flex-1 overflow-y-auto p-2">
      <!-- 开始节点 -->
      <div class="mb-3">
        <div class="px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">开始</div>
        <div class="flex flex-col gap-1 mt-1">
          <div
            class="px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded cursor-pointer flex items-center gap-2"
            @click="handleAddNode(OFBlockEnum.Start)"
          >
            <div class="w-5 h-5 rounded bg-emerald-100 flex items-center justify-center">
              <svg class="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
              </svg>
            </div>
            开始
          </div>
        </div>
      </div>

      <!-- LLM 节点 -->
      <div class="mb-3">
        <div class="px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">LLM</div>
        <div class="flex flex-col gap-1 mt-1">
          <div
            class="px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded cursor-pointer flex items-center gap-2"
            @click="handleAddNode(OFBlockEnum.LLM)"
          >
            <div class="w-5 h-5 rounded bg-indigo-100 flex items-center justify-center">
              <svg class="w-3 h-3 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"
                />
              </svg>
            </div>
            LLM
          </div>
        </div>
      </div>

      <div class="mb-3">
        <div class="px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">逻辑</div>
        <div class="mt-1 flex flex-col gap-1">
          <div
            class="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm text-gray-700 hover:bg-gray-50"
            @click="handleAddNode(OFBlockEnum.Iteration)"
          >
            <div class="flex h-5 w-5 items-center justify-center rounded bg-cyan-100">
              <svg class="h-3 w-3 text-cyan-600" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M12 3a9 9 0 1 0 8.485 12H18l3.5 3.5L25 15h-2.54A11 11 0 1 1 12 1v2Zm-1 4h2v6h-2V7Zm0 8h2v2h-2v-2Z"
                  transform="translate(-1)"
                />
              </svg>
            </div>
            迭代
          </div>
          <div
            class="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm text-gray-700 hover:bg-amber-50"
            @click="handleAddNode(OFBlockEnum.Loop)"
          >
            <div class="flex h-5 w-5 items-center justify-center rounded bg-amber-100">
              <svg class="h-3 w-3 text-amber-600" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M12 3a9 9 0 1 0 8.485 12H18l3.5 3.5L25 15h-2.54A11 11 0 1 1 12 1v2Zm-1 4h2v6h-2V7Zm0 8h2v2h-2v-2Z"
                  transform="translate(-1)"
                />
              </svg>
            </div>
            循环
          </div>
          <div
            class="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm text-gray-700 hover:bg-gray-50"
            @click="handleAddNode(OFBlockEnum.IfElse)"
          >
            <div class="flex h-5 w-5 items-center justify-center rounded bg-cyan-100">
              <svg class="h-3 w-3 text-cyan-600" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M14 5h5v5h-2V8.414l-4.293 4.293L17 17v-1.5h2V20h-5v-2h1.586l-4-4H3v-2h8.586l4.293-4.293H14V5Z"
                />
              </svg>
            </div>
            条件分支
          </div>
        </div>
      </div>

      <div class="mb-3">
        <div class="px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">检索</div>
        <div class="mt-1 flex flex-col gap-1">
          <div
            class="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm text-gray-700 hover:bg-blue-50"
            @click="handleAddNode(OFBlockEnum.KnowledgeRetrieval)"
          >
            <div class="flex h-5 w-5 items-center justify-center rounded bg-blue-100">
              <svg
                class="h-3 w-3 text-blue-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M10.5 18a7.5 7.5 0 1 1 5.303-2.197L21 21"
                />
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 10h5M8 13h3" />
              </svg>
            </div>
            知识检索
          </div>
          <div
            class="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm text-gray-700 hover:bg-emerald-50"
            @click="handleAddNode(OFBlockEnum.PaperRetrieval)"
          >
            <div class="flex h-5 w-5 items-center justify-center rounded bg-emerald-100">
              <svg
                class="h-3 w-3 text-emerald-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M7 4.75h7.25L19 9.5v9.75A1.75 1.75 0 0 1 17.25 21h-10.5A1.75 1.75 0 0 1 5 19.25v-12.5A1.75 1.75 0 0 1 6.75 5h.25"
                />
                <path stroke-linecap="round" stroke-linejoin="round" d="M14 5v5h5" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h8M8 15.5h6" />
              </svg>
            </div>
            论文检索
          </div>
        </div>
      </div>

      <!-- 结束节点 -->
      <div class="mb-3">
        <div class="px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">结束</div>
        <div class="flex flex-col gap-1 mt-1">
          <div
            class="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm text-gray-700 hover:bg-gray-50"
            @click="handleAddNode(OFBlockEnum.VariableAssign)"
          >
            <div class="flex h-5 w-5 items-center justify-center rounded bg-sky-100">
              <svg
                class="h-3 w-3 text-sky-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M7 7H17M7 12H13M7 17H11M16 12L18 14L22 10"
                />
              </svg>
            </div>
            变量赋值
          </div>
          <div
            class="px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded cursor-pointer flex items-center gap-2"
            @click="handleAddNode(OFBlockEnum.End)"
          >
            <div class="w-5 h-5 rounded bg-rose-100 flex items-center justify-center">
              <svg class="w-3 h-3 text-rose-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            结束
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { OFBlockEnum } from '@shared/Orchestraflow-types'
import { useWorkflowEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor.store'

const emit = defineEmits<{
  close: []
}>()

const editorStore = useWorkflowEditorStore()

type TabType = 'node' | 'tool'
const activeTab = ref<TabType>('node')

function handleAddNode(type: OFBlockEnum) {
  editorStore.addNode(type)
  emit('close')
}
</script>
