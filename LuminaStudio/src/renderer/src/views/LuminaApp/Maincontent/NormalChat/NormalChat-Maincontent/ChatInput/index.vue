<template>
  <div
    class="nc_ChatInput_Container relative z-20 bg-white border border-slate-200 rounded-2xl shadow-lg"
  >
    <!-- 文本输入区域 -->
    <textarea
      :value="userInput"
      @input="$emit('update:userInput', ($event.target as HTMLTextAreaElement).value)"
      @keydown="handleKeydown"
      placeholder="在这里输入消息，按 Enter 发送"
      spellcheck="false"
      rows="2"
      :disabled="isGenerating"
      class="w-full px-4 py-3 text-sm focus:outline-none resize-none overflow-y-auto text-slate-700 placeholder:text-slate-300 bg-transparent"
      style="min-height: 46px; max-height: 406px"
    ></textarea>

    <!-- 底部工具栏 -->
    <div class="flex items-center justify-between px-3 py-2 border-t border-slate-100">
      <!-- 左侧工具按钮组 -->
      <div class="flex items-center gap-1 flex-shrink-0 overflow-x-auto max-w-[60%]">
        <!-- 新建对话 -->
        <button
          type="button"
          @click="$emit('showConversationList')"
          class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          title="新建对话"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m5 19-2 2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2"></path>
            <path d="M9 10h6"></path>
            <path d="M12 7v6"></path>
            <path d="M9 17h6"></path>
          </svg>
        </button>

        <!-- 附件 -->
        <button
          type="button"
          class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          title="上传附件"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="m16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551"
            ></path>
          </svg>
        </button>

        <!-- 网络搜索 -->
        <button
          type="button"
          class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          title="网络搜索"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
            <path d="M2 12h20"></path>
          </svg>
        </button>

        <!-- 知识库 -->
        <button
          type="button"
          class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          title="知识库"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
            <path d="M4.268 21a2 2 0 0 0 1.727 1H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3"></path>
            <path d="m9 18-1.5-1.5"></path>
            <circle cx="5" cy="14" r="3"></circle>
          </svg>
        </button>

        <!-- MCP -->
        <button
          type="button"
          class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          title="MCP 工具"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9"></path>
            <path d="m18 15 4-4"></path>
            <path
              d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5"
            ></path>
          </svg>
        </button>

        <!-- 选择模型 -->
        <button
          type="button"
          class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          title="选择模型"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="4"></circle>
            <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"></path>
          </svg>
        </button>

        <div class="w-px h-4 bg-slate-200 mx-1"></div>

        <!-- 快捷短语 -->
        <button
          type="button"
          class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          title="快捷短语"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"
            ></path>
          </svg>
        </button>

        <!-- 清除对话 -->
        <button
          type="button"
          class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          title="清除对话"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M10 2v2"></path>
            <path d="M14 2v4"></path>
            <path d="M17 2a1 1 0 0 1 1 1v9H6V3a1 1 0 0 1 1-1z"></path>
            <path
              d="M6 12a1 1 0 0 0-1 1v1a2 2 0 0 0 2 2h2a1 1 0 0 1 1 1v2.9a2 2 0 1 0 4 0V17a1 1 0 0 1 1-1h2a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1"
            ></path>
          </svg>
        </button>

        <!-- 展开/折叠 -->
        <button
          type="button"
          class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          title="展开"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
            <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
            <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
            <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
          </svg>
        </button>

        <!-- 清除上下文 -->
        <button
          type="button"
          class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          title="清除上下文 Ctrl+K"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21"
            ></path>
            <path d="m5.082 11.09 8.828 8.828"></path>
          </svg>
        </button>
      </div>

      <!-- 右侧操作按钮 -->
      <div class="flex items-center gap-2 flex-shrink-0">
        <!-- 模式选择 -->
        <div class="relative z-10">
          <WhiteSelect
            :model-value="inputBarStore.mode"
            @update:model-value="(v) => inputBarStore.setMode((v as any) ?? 'normal')"
            :options="modeOptions"
            placeholder="选择模式"
            root-class="w-28"
            trigger-class="!py-1.5 !px-2.5 !h-7 !text-xs"
            panel-class="!w-32 !bottom-full !top-auto !mb-2 !mt-0"
          />
        </div>

        <!-- 中断按钮 (生成中显示) -->
        <button
          v-if="isGenerating"
          @click="$emit('abort')"
          type="button"
          class="w-8 h-8 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-all"
          title="中断生成"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
        </button>

        <!-- 发送按钮 (默认显示) -->
        <button
          v-else
          @click="$emit('send')"
          :disabled="!canSend"
          type="button"
          class="w-8 h-8 flex items-center justify-center rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          :class="
            canSend
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
              : 'bg-slate-200 text-slate-400'
          "
          title="发送消息"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 19V5" />
            <path d="m5 12 7-7 7 7" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WhiteSelect, { type WhiteSelectOption } from '../../components/WhiteSelect.vue'
import { useInputBarStore } from '@renderer/stores/ai-chat/input-bar.store'

const props = defineProps<{
  userInput: string
  isGenerating: boolean
}>()

const emit = defineEmits<{
  (e: 'update:userInput', value: string): void
  (e: 'send'): void
  (e: 'abort'): void
  (e: 'showConversationList'): void
}>()

const inputBarStore = useInputBarStore()

const modeOptions: WhiteSelectOption[] = [
  { label: 'Normal', value: 'normal' },
  { label: 'Agent', value: 'agent' }
]

const canSend = computed(() => props.userInput.trim().length > 0)

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    if (canSend.value && !props.isGenerating) {
      emit('send')
    }
  }
}
</script>
