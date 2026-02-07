<template>
  <section
    class="nc_NormalChat_Center_a8d3 flex-1 min-w-0 bg-white/80 border border-slate-200 rounded-2xl overflow-hidden flex flex-col relative"
  >
    <header
      class="nc_NormalChat_CenterHeader_a8d3 h-12 flex items-center justify-between px-6 border-b border-slate-100 bg-white/60 backdrop-blur-sm overflow-x-auto"
      style="min-width: min-content"
    >
      <!-- Left: Conversation List Trigger -->
      <button
        @click="$emit('showConversationList')"
        class="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-emerald-600 transition-colors group flex-shrink-0"
      >
        <span>对话</span>
        <svg
          class="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <!-- Center: Model Selector -->
      <button
        @click="$emit('showModelSelector')"
        class="flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-600 hover:border-emerald-200 hover:text-emerald-700 hover:shadow-sm transition-all flex-shrink-0"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span class="uppercase">{{ displayProviderId }}</span>
        <span class="text-slate-300">/</span>
        <span>{{ displayModelId }}</span>
        <svg
          class="w-3 h-3 text-slate-400 ml-1"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <!-- Right: Actions -->
      <div class="flex items-center gap-2 text-slate-400 flex-shrink-0">
        <button
          class="w-8 h-8 rounded-full hover:bg-slate-100 transition-colors flex items-center justify-center"
        >
          <svg
            class="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M3 10h18" />
            <path d="M7 6h10" />
            <path d="M7 14h10" />
            <path d="M3 18h18" />
          </svg>
        </button>
        <button
          class="w-8 h-8 rounded-full hover:bg-slate-100 transition-colors flex items-center justify-center"
        >
          <svg
            class="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="19" cy="12" r="1.5" />
            <circle cx="5" cy="12" r="1.5" />
          </svg>
        </button>
      </div>
    </header>

    <main class="nc_NormalChat_CenterMain_a8d3 flex-1 overflow-y-auto flex flex-col-reverse">
      <div class="px-6 pt-5" :style="{ paddingBottom: inputBarHeight + 'px' }">
        <ChatMainMessage
          :messages="messages"
          :is-generating="isGenerating"
          @show-knowledge-detail="handleShowKnowledgeDetail"
        />
      </div>
    </main>

    <div
      ref="inputBarRef"
      class="nc_NormalChat_CenterInput_a8d3 absolute bottom-0 left-0 w-full px-6 pb-6 pt-16 bg-gradient-to-t from-white via-white/95 to-transparent"
    >
      <div class="max-w-3xl mx-auto">
        <ChatInput
          :user-input="userInput"
          :is-generating="isGenerating"
          @update:user-input="$emit('update:userInput', $event)"
          @send="$emit('send')"
          @abort="$emit('abort')"
          @show-conversation-list="$emit('showConversationList')"
        />
        <p class="text-center mt-3 text-[10px] text-slate-300">
          LuminaStudio AI · 支持深度思考与工具调用
        </p>
      </div>
    </div>

    <!-- 知识库检索详情对话框 -->
    <KnowledgeSearchDetailDialog v-model="showDetailDialog" :detail="selectedDetail" />
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import ChatMainMessage from './ChatMain-Message/index.vue'
import ChatInput from './ChatInput/index.vue'
import KnowledgeSearchDetailDialog from './ChatMain-Message/KnowledgeSearchDetailDialog.vue'

defineProps<{
  messages: any[]
  isGenerating: boolean
  userInput: string
  displayProviderId: string
  displayModelId: string
}>()

defineEmits<{
  (e: 'update:userInput', value: string): void
  (e: 'send'): void
  (e: 'abort'): void
  (e: 'showConversationList'): void
  (e: 'showModelSelector'): void
}>()

const inputBarRef = ref<HTMLElement | null>(null)
const inputBarHeight = ref(176) // 默认值 pb-44 = 11rem = 176px

// 知识库检索详情对话框状态
const showDetailDialog = ref(false)
const selectedDetail = ref<any>(null)

// 处理展示知识库检索详情
function handleShowKnowledgeDetail(payload: any) {
  selectedDetail.value = payload
  showDetailDialog.value = true
}

// 使用 ResizeObserver 监听输入栏高度变化
let resizeObserver: ResizeObserver | null = null

const updateInputBarHeight = () => {
  if (inputBarRef.value) {
    inputBarHeight.value = inputBarRef.value.offsetHeight
  }
}

onMounted(() => {
  updateInputBarHeight()

  // 监听输入栏尺寸变化
  if (inputBarRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateInputBarHeight()
    })
    resizeObserver.observe(inputBarRef.value)
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})
</script>
