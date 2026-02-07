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
        <TestMessage v-if="msg.role === 'test'" :message="msg" />

        <!-- Blocks 渲染 -->
        <template v-for="(block, blockIdx) in msg.blocks" :key="`${msg.id}-${blockIdx}`">
          <!-- Thinking -->
          <ThinkingMessage
            v-if="block.type === 'thinking'"
            :thinking-steps="block.steps"
            :is-thinking="block.isThinking"
            :message-id="msg.id"
          />

          <!-- Retrieval Plan (node) -->
          <RetrievalPlanMessage v-else-if="isRetrievalPlanNodeBlock(block)" :node-block="block" />

          <!-- Retrieval Summary (node) -->
          <RetrievalSummaryMessage v-else-if="isRetrievalSummaryNodeBlock(block)" :node-block="block" />

          <!-- Knowledge Search (node) -->
          <KnowledgeSearchMessage
            v-else-if="isKnowledgeSearchNodeBlock(block)"
            :result="getKnowledgeNodeResult(block)"
            @show-detail="emit('show-knowledge-detail', $event)"
          />

          <!-- Tool block (通用工具调用) -->
          <ToolCallMessage v-else-if="block.type === 'tool'" :tool-blocks="[block]" />

          <!-- Text block -->
          <TextMessage
            v-else-if="block.type === 'text'"
            :content="block.content"
            :role="msg.role"
            :is-streaming="msg.isStreaming"
          />

          <!-- Meta block (usage) -->
          <UsageMessage v-else-if="block.type === 'meta' && block.usage" :usage="block.usage" />
        </template>

        <ActionButtons v-if="msg.role === 'assistant' && !msg.isStreaming" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import TestMessage from './TestMessage.vue'
import ThinkingMessage from './ThinkingMessage.vue'
import ToolCallMessage from './ToolCallMessage.vue'
import KnowledgeSearchMessage from './KnowledgeSearchMessage.vue'
import RetrievalPlanMessage from './RetrievalPlanMessage.vue'
import RetrievalSummaryMessage from './RetrievalSummaryMessage.vue'
import TextMessage from './TextMessage.vue'
import UsageMessage from './UsageMessage.vue'
import ActionButtons from './ActionButtons.vue'

const props = defineProps<{
  messages: any[]
  isGenerating: boolean
}>()

const emit = defineEmits<{
  (e: 'show-knowledge-detail', payload: any): void
}>()

// 反转消息顺序以配合 column-reverse
const reversedMessages = computed(() => [...props.messages].reverse())

// 判断是否是 retrieval_plan 节点 block
function isRetrievalPlanNodeBlock(block: any): boolean {
  return block?.type === 'node' && block?.start?.nodeKind === 'retrieval_plan'
}

// 判断是否是 retrieval_summary 节点 block
function isRetrievalSummaryNodeBlock(block: any): boolean {
  return block?.type === 'node' && block?.start?.nodeKind === 'retrieval_summary'
}

// 判断是否是 knowledge_retrieval 节点 block
function isKnowledgeSearchNodeBlock(block: any): boolean {
  return (
    block?.type === 'node' &&
    block?.start?.nodeKind === 'knowledge_retrieval' &&
    (block?.result || block?.start)
  )
}

function getKnowledgeNodeResult(block: any): any {
  // 优先从 result.outputs.result 获取
  const outputs = block?.result?.outputs
  if (outputs && typeof outputs === 'object' && 'result' in outputs) {
    return (outputs as any).result
  }
  // 如果还没有 result，返回 undefined（会显示“等待中”）
  return undefined
}
</script>
