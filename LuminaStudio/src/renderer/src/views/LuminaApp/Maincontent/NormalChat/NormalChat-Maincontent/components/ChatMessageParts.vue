<template>
  <div class="nc-chat-message-parts-a9k2 mt-4 space-y-3">
    <template v-if="message.blocks.length > 0">
      <template v-for="block in message.blocks" :key="block.key">
        <div v-if="block.kind === 'markdown'">
          <div
            v-if="message.role === 'user'"
            class="whitespace-pre-wrap break-words text-[14px] leading-[1.75] text-gray-800"
          >
            {{ block.text || ' ' }}
          </div>
          <ChatMarkdownContent
            v-else
            :content="block.text"
            :is-pending="Boolean(message.isPending)"
          />
        </div>

        <ThinkingMessageBlock
          v-else-if="block.kind === 'thinking'"
          :part="block.part"
          :is-pending="Boolean(message.isPending)"
        />

        <SubAgentRenderBlock
          v-else-if="block.kind === 'subagent'"
          :block="block"
          @open-agent-run="emit('open-agent-run', $event)"
        />

        <div
          v-else-if="block.kind === 'placeholder'"
          class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-slate-500"
        >
          {{ block.label }}
        </div>

        <template v-else-if="displayMode === 'detail'">
          <FunctionCallMessageBlock
            v-for="(call, index) in block.calls"
            :key="callKey(call, index, block.batchIndex)"
            :part="call"
            :is-pending="Boolean(message.isPending)"
            @view-detail="emit('open-functioncall-detail', $event)"
          />
        </template>

        <FunctionCallBatchBlock
          v-else
          :batch-index="block.batchIndex"
          :calls="block.calls"
          :is-pending="Boolean(message.isPending)"
          @view-detail="emit('view-detail')"
        />
      </template>
    </template>

    <!-- 兜底分支：理论上正常路径都会先生成 render blocks，这里只处理极少数纯文本兼容态。 -->
    <div v-else-if="message.text">
      <div
        v-if="message.role === 'user'"
        class="whitespace-pre-wrap break-words text-[14px] leading-[1.75] text-gray-800"
      >
        {{ message.text || ' ' }}
      </div>
      <ChatMarkdownContent
        v-else
        :content="message.text"
        :is-pending="Boolean(message.isPending)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NormalChatFunctionCallMessagePart } from '@preload/types'
import { computed } from 'vue'
import type { NormalChatConversationDisplayMessage } from '@renderer/stores/normal-chat/conversation/conversation.types'
import ChatMarkdownContent from './ChatMarkdownContent.vue'
import FunctionCallBatchBlock from './FunctionCallBatchBlock.vue'
import FunctionCallMessageBlock from './FunctionCallMessageBlock.vue'
import SubAgentRenderBlock from './SubAgentRenderBlock.vue'
import ThinkingMessageBlock from './ThinkingMessageBlock.vue'

type DisplayMode = 'summary' | 'detail'

const props = defineProps<{
  message: NormalChatConversationDisplayMessage
  displayMode?: DisplayMode
}>()

const emit = defineEmits<{
  'view-detail': []
  'open-functioncall-detail': [callId: string]
  'open-agent-run': [agentRunId: string]
}>()

const displayMode = computed<DisplayMode>(() => props.displayMode ?? 'summary')

function callKey(
  part: Extract<NormalChatFunctionCallMessagePart, NormalChatFunctionCallMessagePart>,
  index: number,
  batchIndex: number
): string {
  return `${part.kind}-${part.callId}-${batchIndex}-${index}`
}
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
