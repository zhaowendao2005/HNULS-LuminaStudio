<template>
  <div class="of-editor-header pointer-events-auto overflow-x-auto z-20">
    <div class="flex items-center justify-between px-4 py-2 min-w-fit">
      <!-- 左对齐：自动保存状态 -->
      <div class="text-sm text-gray-600 flex-shrink-0">
        <span>自动保存</span>
        <span class="mx-1">·</span>
        <span>{{ autoSaveTime }}</span>
        <span class="mx-1">·</span>
        <span class="text-gray-500">未发布</span>
      </div>

      <!-- 右对齐：圆角 SVG 图标按钮 -->
      <div class="flex items-center gap-2 flex-shrink-0">
        <!-- 测试运行按钮（淡绿色） -->
        <button
          class="relative group flex items-center gap-2 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-md transition-colors border border-green-200"
          title="测试运行 Alt R"
        >
          <svg
            class="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"
            />
          </svg>
          <span class="text-sm font-medium">测试运行</span>
          <span class="text-xs opacity-75">Alt R</span>
        </button>

        <!-- 分隔线 -->
        <div class="w-px h-6 bg-gray-300"></div>

        <!-- 测试历史按钮 -->
        <button
          class="relative group w-8 h-8 bg-white hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
          title="测试历史"
        >
          <svg
            class="w-4 h-4 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </button>

        <!-- 检查清单按钮 -->
        <button
          class="relative group w-8 h-8 bg-white hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
          title="检查清单"
        >
          <svg
            class="w-4 h-4 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        <!-- 环境变量按钮 -->
        <button
          class="relative group w-8 h-8 bg-white hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
          title="环境变量"
        >
          <span class="text-xs font-medium text-gray-700">ENV</span>
        </button>

        <!-- 系统变量按钮 -->
        <button
          class="relative group w-8 h-8 bg-white hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
          title="系统变量"
        >
          <span class="text-xs font-medium text-gray-700">X</span>
        </button>

        <!-- 发布按钮（淡绿色，带下拉箭头） -->
        <button
          class="relative group flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-md transition-colors border border-green-200"
          title="发布"
        >
          <span class="text-sm font-medium">发布</span>
          <svg
            class="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- 历史按钮 -->
        <button
          class="relative group w-8 h-8 bg-white hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
          title="历史"
        >
          <svg
            class="w-4 h-4 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  autoSaveTime: string
}>()
</script>
