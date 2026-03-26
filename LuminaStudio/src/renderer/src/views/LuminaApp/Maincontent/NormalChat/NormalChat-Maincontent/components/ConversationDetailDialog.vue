<template>
  <div
    v-if="visible"
    class="nc-conversation-detail-dialog-a9k2 fixed inset-0 z-[70] flex items-center justify-center bg-black/20 backdrop-blur-[1px]"
  >
    <div
      class="nc-conversation-detail-dialog-panel-a9k2 flex h-[760px] w-[1040px] flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--nc-shadow-dialog)]"
    >
      <div class="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
        <div class="min-w-0">
          <h2 class="truncate text-[16px] font-semibold text-gray-900">{{ dialogTitle }}</h2>
          <p class="mt-1 text-[12px] leading-5 text-gray-500">
            详情面板当前保留为兼容壳；后续会按新系统运行时协议重构。
          </p>
        </div>

        <button
          class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          type="button"
          @click="close"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <div class="flex items-center gap-2 border-b border-gray-100 px-6 py-3">
        <button
          class="rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors"
          :class="activeTab === 'raw' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'"
          type="button"
          @click="activeTab = 'raw'"
        >
          原始内容
        </button>
        <button
          class="rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors"
          :class="activeTab === 'rendered' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'"
          type="button"
          @click="activeTab = 'rendered'"
        >
          渲染内容
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto bg-gray-50 px-6 py-5">
        <div
          v-if="loading"
          class="flex h-full items-center justify-center text-[13px] text-gray-400"
        >
          正在加载完整会话...
        </div>

        <div
          v-else-if="errorText"
          class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700"
        >
          {{ errorText }}
        </div>

        <template v-else>
          <div v-if="activeTab === 'raw'" class="space-y-4">
            <ConversationDetailRawSection title="会话元数据" description="当前 turn 的基础信息。" :value="rawMeta" />
            <ConversationDetailRawSection title="请求记录" description="请求参数与提示词窗口。" :value="detail?.requestRecord ?? {}" />
            <ConversationDetailRawSection title="响应记录" description="流式输出与错误信息。" :value="detail?.responseRecord ?? {}" />
            <ConversationDetailRawSection
              title="运行时追踪（兼容壳）"
              description="TODO(normal-chat-rewrite): 新系统上线后替换为新运行时结构。"
              :value="detail?.runtimeTrace ?? null"
            />
            <ConversationDetailRawSection title="消息快照" description="该 turn 的消息数据。" :value="detail?.messages ?? []" />
          </div>

          <div v-else class="space-y-4">
            <section class="rounded-2xl border border-gray-200 bg-white px-4 py-4">
              <h3 class="text-[14px] font-semibold text-gray-900">会话概览</h3>
              <div class="mt-3 grid gap-3 md:grid-cols-2">
                <div class="rounded-xl bg-gray-50 px-3 py-2">
                  <p class="text-[12px] text-gray-400">助手 / 话题</p>
                  <p class="mt-1 text-[13px] text-gray-800">{{ overviewTitle }}</p>
                </div>
                <div class="rounded-xl bg-gray-50 px-3 py-2">
                  <p class="text-[12px] text-gray-400">消息 ID</p>
                  <p class="mt-1 break-all text-[13px] text-gray-800">{{ selectedMessage?.id ?? '' }}</p>
                </div>
              </div>
            </section>

            <section class="rounded-2xl border border-gray-200 bg-white px-4 py-4">
              <h3 class="text-[14px] font-semibold text-gray-900">当前消息</h3>
              <div class="mt-3 grid gap-3">
                <div class="rounded-xl bg-gray-50 px-3 py-2">
                  <p class="text-[12px] text-gray-400">角色</p>
                  <p class="mt-1 text-[13px] text-gray-700">
                    {{ selectedMessage?.role === 'user' ? '用户消息' : '助手消息' }}
                  </p>
                </div>
                <div class="rounded-xl bg-gray-50 px-3 py-2">
                  <p class="text-[12px] text-gray-400">文本</p>
                  <p class="mt-1 whitespace-pre-wrap break-words text-[13px] leading-6 text-gray-700">
                    {{ selectedMessage?.text || '无' }}
                  </p>
                </div>
                <div class="rounded-xl bg-gray-50 px-3 py-2">
                  <p class="text-[12px] text-gray-400">消息块</p>
                  <ChatMessageParts v-if="selectedMessage" :message="selectedMessage" display-mode="detail" />
                  <p v-else class="mt-1 text-[13px] text-gray-700">无</p>
                </div>
                <div class="rounded-xl bg-gray-50 px-3 py-2">
                  <p class="text-[12px] text-gray-400">运行时摘要</p>
                  <p class="mt-1 text-[13px] text-gray-700">{{ executionSummaryText }}</p>
                </div>
              </div>
            </section>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { useNormalChatConversationStore } from '@renderer/stores/normal-chat/conversation/conversation.store'
import { useNormalChatWorkspaceStore } from '@renderer/stores/normal-chat/workspace/workspace.store'
import ConversationDetailRawSection from './ConversationDetailRawSection.vue'
import ChatMessageParts from './ChatMessageParts.vue'
import type { NormalChatConversationDisplayMessage } from '@renderer/stores/normal-chat/conversation/conversation.types'
import type { NormalChatConversationTurnDetail } from '@preload/types'
import { asRuntimeAgentTree } from '@renderer/stores/normal-chat/runtime-trace/types'

const props = defineProps<{
  visible: boolean
  requestId: string
  messageId: string
  focusCallId?: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const conversationStore = useNormalChatConversationStore()
const workspaceStore = useNormalChatWorkspaceStore()

const activeTab = ref<'raw' | 'rendered'>('raw')
const loading = ref(false)
const errorText = ref('')

const detail = computed<NormalChatConversationTurnDetail | null>(() => {
  return conversationStore.getConversationTurnDetailCached(props.requestId)
})

const selectedMessage = computed<NormalChatConversationDisplayMessage | null>(() => {
  if (!props.requestId) {
    return null
  }

  const persisted = detail.value?.messages.find((item) => item.id === props.messageId)
  if (persisted && detail.value) {
    return {
      ...persisted,
      author: persisted.role === 'user' ? '用户' : detail.value.assistantName,
      time: persisted.createdAt,
      text: persisted.parts
        .filter((part) => part.kind === 'text')
        .map((part) => part.text)
        .join('')
    }
  }

  return (
    conversationStore.currentDisplayMessages.find(
      (message) =>
        message.requestId === props.requestId &&
        (message.id === props.messageId || message.role === 'assistant')
    ) ?? null
  )
})

const dialogTitle = computed(() => {
  if (!detail.value) {
    return '完整会话'
  }
  return `${detail.value.assistantName} · ${detail.value.topicTitle}`
})

const overviewTitle = computed(() => {
  if (!detail.value) {
    return '未加载'
  }
  return `${detail.value.assistantName} / ${detail.value.topicTitle}`
})

const rawMeta = computed(() => {
  if (!detail.value) {
    return {}
  }

  return {
    requestId: detail.value.requestId,
    assistant: {
      id: detail.value.assistantId,
      name: detail.value.assistantName,
      emoji: detail.value.assistantEmoji
    },
    topic: {
      id: detail.value.topicId,
      title: detail.value.topicTitle
    },
    saveFullConversationEnabled: detail.value.saveFullConversationEnabled,
    hasTrace: detail.value.hasTrace
  }
})

const executionSummaryText = computed(() => {
  // TODO(normal-chat-rewrite): 新系统接入后，这里的摘要逻辑会改成新运行时结构。
  const tree = asRuntimeAgentTree(detail.value?.runtimeTrace?.agentTree)
  if (!tree) {
    return '旧 Agent 运行树已清理，等待新系统接入。'
  }

  const agents = Object.values(tree.agents)
  const maxDepth = agents.reduce((depth, agent) => Math.max(depth, agent.depth), 0)
  const helperCount = agents.reduce((sum, agent) => sum + agent.helperInvocations.length, 0)
  return `agent ${agents.length} 个，helper 调用 ${helperCount} 次，最大深度 ${maxDepth}`
})

async function loadDetail(): Promise<void> {
  if (!props.visible || !props.requestId) {
    errorText.value = ''
    loading.value = false
    return
  }

  loading.value = true
  errorText.value = ''

  try {
    activeTab.value = 'raw'
    const nextDetail = await conversationStore.loadConversationTurnDetail(props.requestId)
    if (!nextDetail) {
      errorText.value = workspaceStore.currentAssistant?.saveFullConversationEnabled
        ? '当前 turn 没有保存完整会话数据，可能是旧数据或者本次保存关闭。'
        : '当前助手还没有开启完整会话保存。'
    }
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : String(error)
  } finally {
    loading.value = false
  }
}

function close(): void {
  emit('update:visible', false)
}

watch(
  () => [props.visible, props.requestId, props.messageId],
  () => {
    if (!props.visible) {
      errorText.value = ''
      loading.value = false
      return
    }

    if (!props.requestId) {
      errorText.value = ''
      return
    }

    if (conversationStore.getConversationTurnDetailCached(props.requestId)) {
      errorText.value = ''
      loading.value = false
      return
    }

    void loadDetail()
  },
  { immediate: true }
)
</script>
