<template>
  <div class="nc-chat-message-parts-a9k2 mt-4 space-y-3">
    <AgentStatusBarBlock
      v-if="message.role === 'assistant' && message.requestId"
      :request-id="message.requestId"
      @open-tree="emit('open-agent-tree')"
    />

    <template v-if="renderBlocks.length > 0">
      <template v-for="block in renderBlocks" :key="block.key">
        <div v-if="block.kind === 'text'">
          <div
            v-if="message.role === 'user'"
            class="whitespace-pre-wrap break-words text-[14px] leading-[1.75] text-gray-800"
          >
            {{ block.text || ' ' }}
          </div>
          <ChatMarkdownContent
            v-else
            class=""
            :content="block.text"
            :is-pending="Boolean(message.isPending)"
          />
        </div>

        <template v-else>
          <template v-if="displayMode === 'detail'">
            <FunctionCallMessageBlock
              v-for="(call, index) in block.calls"
              :key="callKey(call, index, block.batchIndex)"
              :part="call"
              :is-pending="Boolean(message.isPending)"
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
    </template>

    <div v-else-if="message.text">
      <div
        v-if="message.role === 'user'"
        class="whitespace-pre-wrap break-words text-[14px] leading-[1.75] text-gray-800"
      >
        {{ message.text || ' ' }}
      </div>
      <ChatMarkdownContent
        v-else
        class=""
        :content="message.text"
        :is-pending="Boolean(message.isPending)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ChatMarkdownContent from './ChatMarkdownContent.vue'
import AgentStatusBarBlock from './AgentStatusBarBlock.vue'
import FunctionCallBatchBlock from './FunctionCallBatchBlock.vue'
import FunctionCallMessageBlock from './FunctionCallMessageBlock.vue'
import type { NormalChatMessagePart } from '@preload/types'
import type { NormalChatConversationDisplayMessage } from '@renderer/stores/normal-chat/conversation/conversation.types'

type DisplayMode = 'summary' | 'detail'

const props = defineProps<{
  message: NormalChatConversationDisplayMessage
  displayMode?: DisplayMode
}>()

const emit = defineEmits<{
  'view-detail': []
  'open-agent-tree': []
}>()

interface TextRenderBlock {
  kind: 'text'
  key: string
  text: string
}

interface FunctionBatchRenderBlock {
  kind: 'function-batch'
  key: string
  batchIndex: number
  calls: Extract<NormalChatMessagePart, { kind: 'functioncall' }>[]
}

type RenderBlock = TextRenderBlock | FunctionBatchRenderBlock

const displayMode = computed<DisplayMode>(() => props.displayMode ?? 'summary')

const renderBlocks = computed<RenderBlock[]>(() => {
  const parts = props.message.parts ?? []
  const blocks: RenderBlock[] = []
  let batchIndex = 0
  let currentBatch: Extract<NormalChatMessagePart, { kind: 'functioncall' }>[] = []

  const flushBatch = () => {
    if (currentBatch.length === 0) {
      return
    }
    const batchKey = `function-batch-${batchIndex}-${currentBatch[0]?.callId ?? 'unknown'}`
    blocks.push({
      kind: 'function-batch',
      key: batchKey,
      batchIndex,
      calls: currentBatch
    })
    batchIndex += 1
    currentBatch = []
  }

  parts.forEach((part, index) => {
    if (part.kind === 'text') {
      flushBatch()
      // 文本块在渲染层保持原顺序，便于准确定位“工具调用批次”区间。
      blocks.push({
        kind: 'text',
        key: `text-${index}`,
        text: part.text
      })
      return
    }

    currentBatch.push(part)
  })

  flushBatch()
  return blocks
})

function callKey(
  part: Extract<NormalChatMessagePart, { kind: 'functioncall' }>,
  index: number,
  batchIndex: number
): string {
  return `${part.kind}-${part.callId}-${batchIndex}-${index}`
}
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
