<template>
  <div class="max-w-3xl mx-auto flex flex-col-reverse gap-8">
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

    <!-- 消息列表 -->
    <div v-for="msg in reversedMessages" :key="msg.id" class="flex w-full gap-4">
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

        <!-- 根据消息类型渲染不同组件 -->
        <ThinkingMessage
          v-if="msg.role === 'assistant' && msg.thinkingSteps && msg.thinkingSteps.length > 0"
          :thinking-steps="msg.thinkingSteps"
          :is-thinking="msg.isThinking"
          :message-id="msg.id"
        />

        <ToolCallMessage
          v-if="msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0"
          :tool-calls="msg.toolCalls"
        />

        <TextMessage :content="msg.content" :role="msg.role" :is-streaming="msg.isStreaming" />

        <UsageMessage
          v-if="msg.role === 'assistant' && msg.usage && !msg.isStreaming"
          :usage="msg.usage"
        />

        <ActionButtons v-if="msg.role === 'assistant' && !msg.isStreaming" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ThinkingMessage from './ThinkingMessage.vue'
import ToolCallMessage from './ToolCallMessage.vue'
import TextMessage from './TextMessage.vue'
import UsageMessage from './UsageMessage.vue'
import ActionButtons from './ActionButtons.vue'

const props = defineProps<{
  messages: any[]
  isGenerating: boolean
}>()

// 反转消息顺序以配合 column-reverse
const reversedMessages = computed(() => [...props.messages].reverse())
</script>
