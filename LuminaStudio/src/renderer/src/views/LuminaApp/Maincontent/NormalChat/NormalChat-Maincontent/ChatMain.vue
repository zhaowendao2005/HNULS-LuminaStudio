<template>
  <section
    class="nc_NormalChat_Center_a8d3 flex-1 min-w-0 bg-white/80 border border-slate-200 rounded-2xl overflow-hidden flex flex-col relative"
  >
    <header
      class="nc_NormalChat_CenterHeader_a8d3 h-12 flex items-center justify-between px-6 border-b border-slate-100 bg-white/60 backdrop-blur-sm"
    >
      <!-- Left: Conversation List Trigger -->
      <button
        @click="$emit('showConversationList')"
        class="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-emerald-600 transition-colors group"
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
        class="flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-600 hover:border-emerald-200 hover:text-emerald-700 hover:shadow-sm transition-all"
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
      <div class="flex items-center gap-2 text-slate-400">
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

    <main
      ref="messagesContainerRef"
      class="nc_NormalChat_CenterMain_a8d3 flex-1 overflow-y-auto px-6 pt-5 pb-44"
    >
      <div class="max-w-3xl mx-auto space-y-8">
        <!-- 消息列表 -->
        <div v-for="msg in messages" :key="msg.id" class="flex w-full gap-4 animate-in fade-in">
          <!-- Avatar -->
          <div
            :class="[
              'w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm',
              msg.role === 'assistant'
                ? 'bg-gradient-to-tr from-emerald-500 to-teal-600'
                : 'bg-slate-100 text-slate-500'
            ]"
          >
            <span v-if="msg.role === 'assistant'" class="text-xs font-bold">AI</span>
            <span v-else class="text-[10px] font-bold">YOU</span>
          </div>

          <!-- 消息内容 -->
          <div class="flex-1 min-w-0 space-y-3">
            <!-- 角色名称 -->
            <div class="text-xs text-slate-400 font-medium">
              {{ msg.role === 'assistant' ? 'LuminaStudio AI' : 'User' }}
            </div>

            <!-- 深度思考区域 (AI only) -->
            <div
              v-if="msg.role === 'assistant' && msg.thinkingSteps && msg.thinkingSteps.length > 0"
              class="mb-4 w-full"
            >
              <button
                @click="toggleThinking(msg.id)"
                :class="[
                  'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 border',
                  isThinkingExpanded(msg.id)
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'
                ]"
              >
                <div class="relative flex items-center justify-center w-5 h-5">
                  <svg
                    v-if="!msg.isThinking"
                    class="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M12 2v4" />
                    <path d="M12 18v4" />
                    <path d="m4.93 4.93 2.83 2.83" />
                    <path d="m16.24 16.24 2.83 2.83" />
                    <path d="M2 12h4" />
                    <path d="M18 12h4" />
                    <path d="m4.93 19.07 2.83-2.83" />
                    <path d="m16.24 7.76 2.83-2.83" />
                  </svg>
                  <div
                    v-else
                    class="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent"
                  ></div>
                </div>
                <span>{{ msg.isThinking ? '正在思考...' : '深度思考已完成' }}</span>
                <svg
                  :class="[
                    'w-3.5 h-3.5 ml-auto opacity-50 transition-transform',
                    isThinkingExpanded(msg.id) ? 'rotate-180' : ''
                  ]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              <!-- 思考步骤展开 -->
              <div
                :class="[
                  'overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]',
                  isThinkingExpanded(msg.id)
                    ? 'max-h-[500px] opacity-100 mt-2'
                    : 'max-h-0 opacity-0'
                ]"
              >
                <div class="pl-4 border-l-2 border-emerald-100 space-y-3 py-2">
                  <div
                    v-for="(step, idx) in msg.thinkingSteps"
                    :key="step.id"
                    class="flex items-start gap-3 text-xs animate-in fade-in"
                  >
                    <span class="text-emerald-500 font-mono mt-0.5">
                      {{ String(idx + 1).padStart(2, '0') }}
                    </span>
                    <span class="text-slate-600 leading-relaxed">{{ step.content }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 工具调用区域 (AI only) -->
            <div
              v-if="msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0"
              class="space-y-2"
            >
              <div
                v-for="tool in msg.toolCalls"
                :key="tool.id"
                :class="[
                  'border rounded-xl px-3 py-2.5 text-xs transition-all',
                  tool.result
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-amber-50 border-amber-200 animate-pulse'
                ]"
              >
                <div class="flex items-center gap-2 font-medium mb-2">
                  <!-- 动态图标：执行中 vs 已完成 -->
                  <div
                    v-if="!tool.result"
                    class="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"
                  ></div>
                  <svg
                    v-else
                    class="w-4 h-4 text-blue-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span :class="tool.result ? 'text-blue-700' : 'text-amber-700'">
                    {{ tool.result ? '工具调用完成' : '正在调用工具...' }}: {{ tool.name }}
                  </span>
                </div>

                <!-- 输入参数 -->
                <div class="pl-6 text-slate-600 space-y-1">
                  <div class="flex items-start gap-2">
                    <span class="text-slate-400 font-medium">输入:</span>
                    <span class="flex-1 font-mono text-[11px] bg-white/50 px-2 py-1 rounded">
                      {{ JSON.stringify(tool.input, null, 2) }}
                    </span>
                  </div>

                  <!-- 结果区域（只在有结果时显示） -->
                  <div v-if="tool.result" class="flex items-start gap-2 mt-2">
                    <span class="text-slate-400 font-medium">结果:</span>
                    <div class="flex-1 space-y-1">
                      <!-- 如果是搜索结果，美化展示 -->
                      <div
                        v-if="tool.result?.results?.length"
                        class="space-y-1.5 bg-white/70 p-2 rounded border border-slate-100"
                      >
                        <div
                          v-for="(item, idx) in (tool.result?.results || []).slice(0, 3)"
                          :key="idx"
                          class="text-[11px]"
                        >
                          <div class="font-medium text-blue-600">• {{ item.title }}</div>
                          <div v-if="item.snippet" class="text-slate-500 ml-3 mt-0.5">
                            {{ item.snippet }}
                          </div>
                        </div>
                      </div>
                      <!-- 其他类型的结果 -->
                      <pre
                        v-else
                        class="font-mono text-[10px] bg-white/50 px-2 py-1 rounded overflow-x-auto"
                        >{{ JSON.stringify(tool.result, null, 2).slice(0, 200) }}...</pre
                      >
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 主文本内容 -->
            <div
              v-if="msg.role === 'assistant'"
              class="text-[15px] leading-relaxed text-slate-800"
            >
              <div v-html="renderMarkdown(msg.content)"></div>
              <span
                v-if="msg.isStreaming"
                class="inline-block w-1 h-4 bg-emerald-500 animate-pulse ml-0.5 align-middle"
              ></span>
            </div>
            <div
              v-else
              class="text-[15px] leading-relaxed text-slate-800 whitespace-pre-wrap bg-emerald-50 px-4 py-3 rounded-2xl inline-block"
            >
              {{ msg.content }}
              <span
                v-if="msg.isStreaming"
                class="inline-block w-1 h-4 bg-emerald-500 animate-pulse ml-0.5 align-middle"
              ></span>
            </div>

            <!-- Token 使用信息 -->
            <div
              v-if="msg.role === 'assistant' && msg.usage && !msg.isStreaming"
              class="text-[10px] text-slate-400 mt-2"
            >
              Tokens: {{ msg.usage.totalTokens }} (输入: {{ msg.usage.inputTokens }}, 输出:
              {{ msg.usage.outputTokens }}
              <span v-if="msg.usage.reasoningTokens">
                , 思考: {{ msg.usage.reasoningTokens }}
              </span>
              )
            </div>

            <!-- 操作按钮 (AI only) -->
            <div
              v-if="msg.role === 'assistant' && !msg.isStreaming"
              class="mt-3 flex items-center gap-2 text-slate-400"
            >
              <button
                class="w-7 h-7 rounded-full hover:bg-slate-100 transition-colors flex items-center justify-center"
                title="复制"
              >
                <svg
                  class="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
              <button
                class="w-7 h-7 rounded-full hover:bg-slate-100 transition-colors flex items-center justify-center"
                title="点赞"
              >
                <svg
                  class="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M14 9V5a3 3 0 0 0-6 0v4" />
                  <path d="M5 11h14l-1 9H6l-1-9z" />
                </svg>
              </button>
              <button
                class="w-7 h-7 rounded-full hover:bg-slate-100 transition-colors flex items-center justify-center"
                title="点踩"
              >
                <svg
                  class="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- 正在生成提示 -->
        <div v-if="isGenerating" class="flex gap-4 animate-pulse">
          <div
            class="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm"
          >
            <span class="text-xs font-bold">AI</span>
          </div>
          <div class="flex items-center gap-1.5 mt-3">
            <span class="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-bounce"></span>
            <span
              class="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-bounce [animation-delay:0.2s]"
            ></span>
            <span
              class="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-bounce [animation-delay:0.4s]"
            ></span>
          </div>
        </div>
      </div>
    </main>

    <div
      class="nc_NormalChat_CenterInput_a8d3 absolute bottom-0 left-0 w-full px-6 pb-6 pt-16 bg-gradient-to-t from-white via-white/95 to-transparent"
    >
      <div class="max-w-3xl mx-auto">
        <!-- 智能工具栏 (暂时隐藏，后续可扩展) -->
        <!-- <div class="flex gap-2 mb-3 ml-2">
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-emerald-600 hover:border-emerald-200 transition-colors"
            >
              智能润色
            </button>
          </div> -->

        <div
          class="relative bg-white border border-slate-200 rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] focus-within:shadow-[0_8px_40px_rgba(16,185,129,0.12)] focus-within:border-emerald-200 transition-all"
        >
          <textarea
            :value="userInput"
            @input="$emit('update:userInput', ($event.target as HTMLTextAreaElement).value)"
            @keydown="handleInputKeydown"
            class="w-full min-h-[56px] max-h-40 overflow-y-auto px-12 py-4 focus:outline-none text-[15px] leading-relaxed text-slate-700 placeholder:text-slate-300 resize-none bg-transparent"
            placeholder="开始输入..."
            :disabled="isGenerating"
          ></textarea>
          <div
            class="absolute left-4 top-4 text-slate-300 hover:text-emerald-500 transition-colors cursor-pointer"
          >
            <svg
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.2-9.19a4 4 0 0 1 5.65 5.65L9.64 16.3a2 2 0 0 1-2.83-2.83l8.49-8.48"
              />
            </svg>
          </div>
          <div class="absolute right-3 bottom-3">
            <!-- 中断按钮 (生成中显示) -->
            <button
              v-if="isGenerating"
              @click="$emit('abort')"
              class="w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg"
              title="中断生成"
            >
              <svg
                class="w-4 h-4"
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
              :disabled="!userInput.trim()"
              class="w-9 h-9 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-100 disabled:bg-slate-300 disabled:cursor-not-allowed"
              title="发送消息"
            >
              <svg
                class="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M12 19V5" />
                <path d="m5 12 7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>
        <p class="text-center mt-3 text-[10px] text-slate-300">
          LuminaStudio AI · 支持深度思考与工具调用
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import MarkdownIt from 'markdown-it'

const props = defineProps<{
  messages: any[]
  isGenerating: boolean
  userInput: string
  displayProviderId: string
  displayModelId: string
}>()

const emit = defineEmits<{
  (e: 'update:userInput', value: string): void
  (e: 'send'): void
  (e: 'abort'): void
  (e: 'showConversationList'): void
  (e: 'showModelSelector'): void
}>()

const messagesContainerRef = ref<HTMLElement | null>(null)

// ===== 深度思考折叠状态 =====
const thinkingExpandedMap = ref<Record<string, boolean>>({})

const toggleThinking = (msgId: string) => {
  thinkingExpandedMap.value[msgId] = !thinkingExpandedMap.value[msgId]
}

const isThinkingExpanded = (msgId: string) => {
  return thinkingExpandedMap.value[msgId] ?? true // 默认展开
}

// Markdown
const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
})

const renderMarkdown = (content: string) => {
  return markdown.render(content || '')
}

// ===== 自动滚动 =====
const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainerRef.value) {
    messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight
  }
}

watch(() => props.messages, () => scrollToBottom(), { deep: true, flush: 'post' })

const handleInputKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    emit('send')
  }
}
</script>
