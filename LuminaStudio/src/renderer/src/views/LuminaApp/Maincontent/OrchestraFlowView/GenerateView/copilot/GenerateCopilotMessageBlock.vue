<template>
  <!--
    Copilot 消息块（message block）

    用途：
    - 在右侧 Copilot 面板里替代“纯文本消息”展示
    - 对 assistant 消息：显示模拟进度、hover 工具栏、以及 streaming 时的“暂停/停止”按钮

    说明：
    - 这里的进度是“模拟进度”，不与 token/迭代等真实数据绑定
    - 暂停按钮只负责把用户意图抛给父组件（父组件再调用 store.abort）
  -->
  <div
    :class="[
      'of-generate-copilot-message-block group w-full rounded-xl border px-3 py-2.5 text-xs transition-all',
      blockStyleClass
    ]"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0 flex-1">
        <!-- Header：状态 + 进度 -->
        <div class="flex flex-wrap items-center gap-2">
          <span :class="statusBadgeClass">{{ statusLabel }}</span>
          <span
            v-if="message.role === 'assistant'"
            class="rounded bg-white/70 px-2 py-0.5 text-[10px] text-gray-500"
          >
            进度：{{ displayProgress }}%
          </span>
          <span
            v-if="message.role === 'assistant' && message.status === 'streaming'"
            class="inline-block h-2 w-2 rounded-full bg-violet-500 animate-pulse"
            title="流式输出中"
          ></span>
        </div>

        <!-- Body：内容 -->
        <div class="relative mt-2 rounded-lg" :class="message.role === 'assistant' ? 'pr-2' : ''">
          <GenerateMessageActionToolbar @copy="$emit('copy')" @inspect="$emit('inspect')" />

          <!-- streaming 时，在消息块内部显示暂停按钮（按你的交互要求） -->
          <button
            v-if="showAbortButton"
            type="button"
            class="absolute right-1 top-7 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700 shadow-sm transition-colors hover:bg-rose-100"
            @click="$emit('abort')"
          >
            暂停
          </button>

          <pre class="whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-gray-800"
            >{{ message.content || '...' }}
</pre
          >
        </div>
      </div>

      <!-- role icon（保持和旧样式一致，但放在 message block 内部） -->
      <div
        class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm"
        :class="iconBoxClass"
      >
        <UserCircle v-if="message.role === 'user'" :size="14" class="text-gray-500" />
        <Bot v-else :size="14" class="text-violet-600" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Bot, UserCircle } from 'lucide-vue-next'
import type { GenerationMessage } from '@preload/types'
import GenerateMessageActionToolbar from '../overlays/message-detail/GenerateMessageActionToolbar.vue'

const props = defineProps<{
  message: GenerationMessage
}>()

defineEmits<{
  (e: 'copy'): void
  (e: 'inspect'): void
  (e: 'abort'): void
}>()

// ===================== 模拟进度（仅用于 UI 展示） =====================
// 规则：
// - streaming：从 20% 缓慢涨到 90%
// - completed：100%
// - failed/aborted：停在当时的值，但展示失败文案
const progress = ref(0)
let timer: number | null = null

const isAssistant = computed(() => props.message.role === 'assistant')

const showAbortButton = computed(() => {
  // 只允许暂停当前“正在流式”的 assistant 消息
  return (
    isAssistant.value && props.message.status === 'streaming' && Boolean(props.message.requestId)
  )
})

const statusLabel = computed(() => {
  if (props.message.role === 'user') return 'User'
  if (props.message.status === 'streaming') return '规划中'
  if (props.message.status === 'completed') return '规划完成'
  if (props.message.status === 'failed') return '规划失败'
  if (props.message.status === 'aborted') return '已暂停'
  return '消息'
})

const displayProgress = computed(() => {
  if (!isAssistant.value) return 0
  if (props.message.status === 'completed') return 100
  return progress.value
})

const statusBadgeClass = computed(() => {
  if (props.message.role === 'user') {
    return 'rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600'
  }
  if (props.message.status === 'completed') {
    return 'rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700'
  }
  if (props.message.status === 'failed') {
    return 'rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700'
  }
  if (props.message.status === 'aborted') {
    return 'rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700'
  }
  return 'rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700'
})

const blockStyleClass = computed(() => {
  if (props.message.role === 'user') return 'border-gray-200 bg-gray-50'
  if (props.message.status === 'failed' || props.message.status === 'aborted') {
    return 'border-rose-200 bg-rose-50/70'
  }
  if (props.message.status === 'completed') return 'border-emerald-200 bg-emerald-50/60'
  return 'border-violet-200 bg-violet-50/60'
})

const iconBoxClass = computed(() => {
  if (props.message.role === 'user') return 'bg-gray-100'
  return 'border border-violet-100 bg-violet-50'
})

function startProgressTimer(): void {
  if (!isAssistant.value) return
  if (timer !== null) return
  progress.value = Math.max(progress.value, 20)
  timer = window.setInterval(() => {
    // streaming 时，缓慢逼近 90%
    if (props.message.status !== 'streaming') return
    const next = progress.value + Math.ceil(Math.random() * 6)
    progress.value = Math.min(next, 90)
  }, 700)
}

function stopProgressTimer(): void {
  if (timer === null) return
  window.clearInterval(timer)
  timer = null
}

watch(
  () => props.message.status,
  (status) => {
    if (!isAssistant.value) return
    if (status === 'streaming') {
      startProgressTimer()
      return
    }
    stopProgressTimer()
    if (status === 'completed') progress.value = 100
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  stopProgressTimer()
})
</script>
