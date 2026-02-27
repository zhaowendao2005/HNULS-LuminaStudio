<template>
  <!--
    UserInteractionMessage

    渲染 nodeKind = 'user_interaction' 的节点。
    当 graph 暂停等待用户审批/反馈时，展示 LLM 生成的交互消息、可选选项和文本输入框。

    状态流转：
    1. waiting  — node-start 已到达，等待 user-interaction-request 事件
    2. pending  — 交互请求已到达，用户尚未响应（显示选项 + 输入框）
    3. done     — 用户已提交响应（node-result 已到达）
    4. error    — 节点出错
  -->
  <div
    class="nc-user-interaction border rounded-xl px-3 py-2.5 text-xs transition-all"
    :class="containerClass"
  >
    <!-- Header -->
    <div class="flex items-center gap-2 font-medium mb-2">
      <!-- Spinner: waiting / pending -->
      <div
        v-if="phase === 'waiting' || phase === 'pending'"
        class="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin"
      ></div>
      <!-- Check: done -->
      <svg
        v-else-if="phase === 'done'"
        class="w-4 h-4 text-emerald-600"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
      <!-- Error X -->
      <svg
        v-else
        class="w-4 h-4 text-rose-600"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M18 6L6 18" />
        <path d="m6 6 12 12" />
      </svg>

      <span :class="headerTextClass">{{ statusLabel }}</span>
    </div>

    <!-- Body -->
    <div class="pl-6 text-slate-700 space-y-3">
      <!-- Error -->
      <div v-if="phase === 'error'" class="text-rose-600">⚠️ {{ errorMessage }}</div>

      <!-- LLM Message (markdown) -->
      <div
        v-if="interactionMessage"
        class="text-[11px] leading-relaxed bg-white/70 px-3 py-2 rounded border border-slate-100 whitespace-pre-wrap"
      >
        {{ interactionMessage }}
      </div>

      <!-- Waiting state -->
      <div v-if="phase === 'waiting'" class="text-[11px] text-slate-400">等待交互请求...</div>

      <!-- Options (pending state - interactive) -->
      <div v-if="phase === 'pending' && interactionOptions.length > 0" class="space-y-1.5">
        <div class="text-slate-400 font-medium text-[10px]">请选择方案（可多选）</div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="opt in interactionOptions"
            :key="opt.id"
            class="px-3 py-1.5 rounded-lg border text-[11px] transition-all cursor-pointer"
            :class="
              selectedOptionIds.has(opt.id)
                ? 'bg-indigo-100 border-indigo-400 text-indigo-700 font-medium'
                : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
            "
            @click="toggleOption(opt.id)"
          >
            <div class="font-medium">{{ opt.label }}</div>
            <div v-if="opt.description" class="text-[10px] opacity-70 mt-0.5">
              {{ opt.description }}
            </div>
          </button>
        </div>
      </div>

      <!-- Options (done state - read-only) -->
      <div v-if="phase === 'done' && interactionOptions.length > 0" class="space-y-1">
        <div class="text-slate-400 font-medium text-[10px]">已选方案</div>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="opt in interactionOptions"
            :key="opt.id"
            class="px-2 py-0.5 rounded text-[10px] border"
            :class="
              resultSelectedIds.includes(opt.id)
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-slate-50 border-slate-100 text-slate-400 line-through'
            "
          >
            {{ opt.label }}
          </span>
        </div>
      </div>

      <!-- Text Input (pending state - interactive) -->
      <div v-if="phase === 'pending'" class="space-y-1.5">
        <div class="text-slate-400 font-medium text-[10px]">补充意见（可选）</div>
        <textarea
          v-model="textInput"
          class="w-full px-3 py-2 text-[11px] rounded-lg border border-slate-200 bg-white resize-none focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 transition-colors"
          rows="3"
          placeholder="在此输入补充意见或修改建议..."
        ></textarea>
      </div>

      <!-- Submitted text (done state) -->
      <div v-if="phase === 'done' && resultTextInput" class="space-y-1">
        <div class="text-slate-400 font-medium text-[10px]">用户补充</div>
        <div class="text-[11px] bg-white/70 px-2 py-1 rounded border border-slate-100">
          {{ resultTextInput }}
        </div>
      </div>

      <!-- Action Buttons (pending state) -->
      <div v-if="phase === 'pending'" class="flex items-center gap-2 pt-1">
        <button
          class="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-medium hover:bg-indigo-700 transition-colors cursor-pointer"
          @click="submitResponse('approve')"
        >
          ✓ 批准执行
        </button>
        <button
          class="px-4 py-1.5 rounded-lg bg-amber-500 text-white text-[11px] font-medium hover:bg-amber-600 transition-colors cursor-pointer"
          @click="submitResponse('modify')"
        >
          ✎ 修改计划
        </button>
        <button
          class="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-500 text-[11px] hover:bg-slate-100 transition-colors cursor-pointer"
          @click="submitResponse('reject')"
        >
          ✕ 拒绝
        </button>
      </div>

      <!-- Result action badge (done state) -->
      <div v-if="phase === 'done'" class="flex items-center gap-2 pt-0.5">
        <span class="px-2 py-0.5 rounded text-[10px] font-medium" :class="actionBadgeClass">
          {{ actionLabel }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import type { NodeBlock } from '@renderer/stores/ai-chat/chat-message/types'
import type { UserInteractionRequestPayload } from '@shared/langchain-client.types'
import { useChatMessageStore } from '@renderer/stores/ai-chat/chat-message/store'

const props = defineProps<{
  nodeBlock: NodeBlock
  /** 来自 store 的 pending interaction 数据 */
  interactionPayload?: UserInteractionRequestPayload | null
}>()

const chatMessageStore = useChatMessageStore()

// ==================== 内部状态 ====================

const selectedOptionIds = reactive(new Set<string>())
const textInput = ref('')
const submitted = ref(false)

// ==================== 阶段判断 ====================

const phase = computed<'waiting' | 'pending' | 'done' | 'error'>(() => {
  if (props.nodeBlock.error) return 'error'
  if (props.nodeBlock.result) return 'done'
  if (props.interactionPayload) return 'pending'
  return 'waiting'
})

// ==================== 样式计算 ====================

const containerClass = computed(() => {
  switch (phase.value) {
    case 'error':
      return 'bg-rose-50 border-rose-200'
    case 'done':
      return 'bg-emerald-50 border-emerald-200'
    case 'pending':
      return 'bg-amber-50 border-amber-200'
    default:
      return 'bg-slate-50 border-slate-200 animate-pulse'
  }
})

const headerTextClass = computed(() => {
  switch (phase.value) {
    case 'error':
      return 'text-rose-700'
    case 'done':
      return 'text-emerald-700'
    case 'pending':
      return 'text-amber-700'
    default:
      return 'text-slate-600'
  }
})

const statusLabel = computed(() => {
  switch (phase.value) {
    case 'error':
      return '交互失败'
    case 'done':
      return '已响应'
    case 'pending':
      return '等待您的决定'
    default:
      return '准备交互中...'
  }
})

const errorMessage = computed(() => {
  return props.nodeBlock.error?.error?.message || '未知错误'
})

// ==================== 交互数据 ====================

const interactionMessage = computed(() => {
  // pending 阶段从 interactionPayload 取
  if (props.interactionPayload?.message) {
    return props.interactionPayload.message
  }
  // done/waiting 阶段从 nodeBlock inputs/outputs 取
  const inputs = props.nodeBlock.start?.inputs as any
  return inputs?.message || ''
})

const interactionOptions = computed(() => {
  if (props.interactionPayload?.options) {
    return props.interactionPayload.options
  }
  const inputs = props.nodeBlock.start?.inputs as any
  return Array.isArray(inputs?.options) ? inputs.options : []
})

// ==================== 结果数据（done 阶段） ====================

const resultSelectedIds = computed(() => {
  const outputs = props.nodeBlock.result?.outputs as any
  return Array.isArray(outputs?.selectedOptionIds) ? outputs.selectedOptionIds : []
})

const resultTextInput = computed(() => {
  const outputs = props.nodeBlock.result?.outputs as any
  return typeof outputs?.textInput === 'string' ? outputs.textInput : ''
})

const resultAction = computed(() => {
  const outputs = props.nodeBlock.result?.outputs as any
  return outputs?.action || 'approve'
})

const actionLabel = computed(() => {
  switch (resultAction.value) {
    case 'approve':
      return '✓ 已批准'
    case 'modify':
      return '✎ 已修改计划'
    case 'reject':
      return '✕ 已拒绝'
    default:
      return resultAction.value
  }
})

const actionBadgeClass = computed(() => {
  switch (resultAction.value) {
    case 'approve':
      return 'bg-emerald-100 text-emerald-700'
    case 'modify':
      return 'bg-amber-100 text-amber-700'
    case 'reject':
      return 'bg-rose-100 text-rose-700'
    default:
      return 'bg-slate-100 text-slate-600'
  }
})

// ==================== 交互操作 ====================

function toggleOption(optionId: string): void {
  if (selectedOptionIds.has(optionId)) {
    selectedOptionIds.delete(optionId)
  } else {
    selectedOptionIds.add(optionId)
  }
}

function submitResponse(action: 'approve' | 'reject' | 'modify'): void {
  if (submitted.value || !props.interactionPayload) return
  submitted.value = true

  const requestId = chatMessageStore.currentRequestId
  if (!requestId) return

  window.api.aiChat.respondToUserInteraction({
    requestId,
    payload: {
      interactionId: props.interactionPayload.interactionId,
      selectedOptionIds: Array.from(selectedOptionIds),
      textInput: textInput.value.trim() || undefined,
      action
    }
  })
}
</script>
