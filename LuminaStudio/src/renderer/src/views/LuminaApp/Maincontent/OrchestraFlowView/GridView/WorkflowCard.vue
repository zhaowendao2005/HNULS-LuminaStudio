<template>
  <div
    class="of-workflow-card group relative h-[160px] rounded-xl border border-slate-200 bg-white transition-all hover:border-emerald-300 hover:shadow-md cursor-pointer overflow-hidden"
    @click="$emit('open', workflow.id)"
  >
    <!-- 卡片头部 -->
    <div class="flex items-start justify-between p-4">
      <!-- 图标 -->
      <div
        class="flex h-10 w-10 items-center justify-center rounded-lg text-lg"
        :style="{ backgroundColor: workflow.iconBackground || '#E5E7EB' }"
      >
        {{ workflow.icon || '📋' }}
      </div>

      <!-- 更多操作按钮 -->
      <div class="relative">
        <button
          @click.stop="showMenu = !showMenu"
          class="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-100 transition-opacity"
        >
          <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
            />
          </svg>
        </button>

        <!-- 右键菜单 -->
        <div
          v-if="showMenu"
          v-click-outside="() => (showMenu = false)"
          class="absolute right-0 top-8 z-10 w-32 rounded-lg border border-slate-200 bg-white shadow-lg py-1"
        >
          <button
            @click.stop="handleEdit"
            class="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
          >
            编辑
          </button>
          <button
            @click.stop="handleCopy"
            class="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
          >
            复制
          </button>
          <div class="h-px bg-slate-100 my-1" />
          <button
            @click.stop="handleDelete"
            class="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            删除
          </button>
        </div>
      </div>
    </div>

    <!-- 卡片内容 -->
    <div class="px-4 pb-4">
      <h3 class="text-sm font-semibold text-slate-900 mb-1 line-clamp-1">
        {{ workflow.name }}
      </h3>
      <p class="text-xs text-slate-500 line-clamp-2 mb-2">
        {{ workflow.description || '暂无描述' }}
      </p>
      <div class="flex items-center justify-between text-xs text-slate-400">
        <span>{{ formatTime(workflow.updatedAt) }}</span>
        <span>{{ workflow.nodeCount }} 个节点</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { OFWorkflowMeta } from '@preload/types'

const props = defineProps<{
  workflow: OFWorkflowMeta
}>()

const emit = defineEmits<{
  (e: 'open', workflowId: string): void
  (e: 'delete', workflowId: string): void
}>()

const showMenu = ref(false)

function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return '今天'
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days} 天前`
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }
}

function handleEdit() {
  showMenu.value = false
  emit('open', props.workflow.id)
}

function handleCopy() {
  showMenu.value = false
  // TODO: 实现复制功能
}

function handleDelete() {
  showMenu.value = false
  if (confirm(`确定要删除工作流 "${props.workflow.name}" 吗？`)) {
    emit('delete', props.workflow.id)
  }
}

// 点击外部关闭菜单
const vClickOutside = {
  mounted(el: HTMLElement, binding: any) {
    el.clickOutsideEvent = (event: MouseEvent) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value()
      }
    }
    document.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el: HTMLElement) {
    document.removeEventListener('click', (el as any).clickOutsideEvent)
  }
}
</script>

<style scoped>
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
