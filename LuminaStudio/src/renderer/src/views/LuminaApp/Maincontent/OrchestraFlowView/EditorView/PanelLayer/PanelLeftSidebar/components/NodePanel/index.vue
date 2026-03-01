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
        <button
          class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
          :class="
            activeTab === 'start'
              ? 'bg-green-100 text-green-700'
              : 'text-gray-600 hover:bg-gray-100'
          "
          @click="activeTab = 'start'"
        >
          开始
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
      <!-- 输入节点 -->
      <div class="mb-3">
        <div class="px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">输入</div>
        <div class="flex flex-col gap-1 mt-1">
          <div
            class="px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded cursor-pointer flex items-center gap-2"
          >
            <div class="w-5 h-5 rounded bg-blue-100 flex items-center justify-center">
              <svg class="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
              </svg>
            </div>
            用户输入
          </div>
          <div
            class="px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded cursor-pointer flex items-center gap-2"
          >
            <div class="w-5 h-5 rounded bg-purple-100 flex items-center justify-center">
              <svg class="w-3 h-3 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            文件上传
          </div>
          <div
            class="px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded cursor-pointer flex items-center gap-2"
          >
            <div class="w-5 h-5 rounded bg-orange-100 flex items-center justify-center">
              <svg class="w-3 h-3 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            定时触发
          </div>
        </div>
      </div>

      <!-- LLM 节点 -->
      <div class="mb-3">
        <div class="px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">LLM</div>
        <div class="flex flex-col gap-1 mt-1">
          <div
            class="px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded cursor-pointer flex items-center gap-2"
          >
            <div class="w-5 h-5 rounded bg-green-100 flex items-center justify-center">
              <svg class="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"
                />
              </svg>
            </div>
            GPT-4
          </div>
          <div
            class="px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded cursor-pointer flex items-center gap-2"
          >
            <div class="w-5 h-5 rounded bg-indigo-100 flex items-center justify-center">
              <svg class="w-3 h-3 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"
                />
              </svg>
            </div>
            Claude
          </div>
        </div>
      </div>

      <!-- 输出节点 -->
      <div class="mb-3">
        <div class="px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">输出</div>
        <div class="flex flex-col gap-1 mt-1">
          <div
            class="px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded cursor-pointer flex items-center gap-2"
          >
            <div class="w-5 h-5 rounded bg-cyan-100 flex items-center justify-center">
              <svg class="w-3 h-3 text-cyan-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            文本输出
          </div>
          <div
            class="px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded cursor-pointer flex items-center gap-2"
          >
            <div class="w-5 h-5 rounded bg-pink-100 flex items-center justify-center">
              <svg class="w-3 h-3 text-pink-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            Markdown
          </div>
        </div>
      </div>

      <!-- 转换节点 -->
      <div class="mb-3">
        <div class="px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">转换</div>
        <div class="flex flex-col gap-1 mt-1">
          <div
            class="px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded cursor-pointer flex items-center gap-2"
          >
            <div class="w-5 h-5 rounded bg-yellow-100 flex items-center justify-center">
              <svg class="w-3 h-3 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            文本转换
          </div>
          <div
            class="px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded cursor-pointer flex items-center gap-2"
          >
            <div class="w-5 h-5 rounded bg-teal-100 flex items-center justify-center">
              <svg class="w-3 h-3 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 10-2 0v2a1 1 0 102 0V9z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            JSON 解析
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  close: []
}>()

type TabType = 'node' | 'tool' | 'start'
const activeTab = ref<TabType>('node')
</script>
