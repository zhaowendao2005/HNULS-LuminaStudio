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
          <h2 class="truncate text-[16px] font-semibold text-gray-900">
            {{ dialogTitle }}
          </h2>
          <p class="mt-1 text-[12px] leading-5 text-gray-500">
            {{
              detail?.hasTrace
                ? '原始内容页按区块懒加载，渲染页只展示当前消息对应的内容。'
                : '当前助手没有保存完整会话，所以这里看不到原始 JSON。'
            }}
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
            <ConversationDetailRawSection
              title="会话元数据"
              description="当前 turn 的基础信息和开关状态。"
              :value="rawMeta"
            />
            <ConversationDetailRawSection
              title="原始请求 JSON"
              description="包含 system prompt、程序性提示词、history messages 和用户输入。"
              :value="detail?.requestPayload ?? {}"
            />
            <ConversationDetailRawSection
              title="原始响应 JSON"
              description="包含流式 chunks、最终文本、结束状态和错误信息。"
              :value="detail?.responsePayload ?? {}"
            />
            <AgentTraceJsonSection
              title="Agent Tree JSON"
              description="保存完整会话时，递归式 multi-agent 运行树会直接落在 turn trace 中。"
              :value="detail?.responsePayload?.agentTree ?? null"
            />
            <ConversationDetailRawSection
              title="原始消息快照"
              description="这次 turn 在数据库中的消息记录。"
              :value="detail?.messages ?? []"
            />
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
                  <p class="mt-1 break-all text-[13px] text-gray-800">
                    {{ selectedMessage?.id ?? '' }}
                  </p>
                </div>
              </div>
            </section>

            <section class="rounded-2xl border border-gray-200 bg-white px-4 py-4">
              <h3 class="text-[14px] font-semibold text-gray-900">当前消息内容</h3>
              <div class="mt-3 grid gap-3">
                <div class="rounded-xl bg-gray-50 px-3 py-2">
                  <p class="text-[12px] text-gray-400">消息角色</p>
                  <p class="mt-1 text-[13px] text-gray-700">
                    {{ selectedMessage?.role === 'user' ? '用户消息' : '助手消息' }}
                  </p>
                </div>
                <div class="rounded-xl bg-gray-50 px-3 py-2">
                  <p class="text-[12px] text-gray-400">纯文本内容</p>
                  <p
                    class="mt-1 whitespace-pre-wrap break-words text-[13px] leading-6 text-gray-700"
                  >
                    {{ selectedMessage?.text || '无' }}
                  </p>
                  <p class="mt-3 text-[12px] text-gray-400">消息块</p>
                  <ChatMessageParts
                    v-if="selectedMessage"
                    :message="selectedMessage"
                    display-mode="detail"
                  />
                  <p v-else class="mt-1 text-[13px] text-gray-700">无</p>
                </div>
                <div class="rounded-xl bg-gray-50 px-3 py-2">
                  <p class="text-[12px] text-gray-400">原始 JSON 摘要</p>
                  <p
                    class="mt-1 whitespace-pre-wrap break-words text-[13px] leading-6 text-gray-700"
                  >
                    {{ selectedMessageJsonSummary }}
                  </p>
                </div>
              </div>
            </section>

            <section class="rounded-2xl border border-gray-200 bg-white px-4 py-4">
              <h3 class="text-[14px] font-semibold text-gray-900">状态</h3>
              <div class="mt-3 grid gap-3 md:grid-cols-2">
                <div class="rounded-xl bg-gray-50 px-3 py-2">
                  <p class="text-[12px] text-gray-400">完整会话保存</p>
                  <p class="mt-1 text-[13px] text-gray-700">
                    {{ detail?.saveFullConversationEnabled ? '已开启' : '已关闭' }}
                  </p>
                </div>
                <div class="rounded-xl bg-gray-50 px-3 py-2">
                  <p class="text-[12px] text-gray-400">响应状态</p>
                  <p class="mt-1 text-[13px] text-gray-700">
                    {{
                      detail?.responsePayload?.errorMessage
                        ? `错误：${detail.responsePayload.errorMessage}`
                        : detail?.responsePayload?.aborted
                          ? '已中止'
                          : '正常完成'
                    }}
                  </p>
                </div>
                <div class="rounded-xl bg-gray-50 px-3 py-2">
                  <p class="text-[12px] text-gray-400">Agent 执行摘要</p>
                  <p class="mt-1 text-[13px] leading-6 text-gray-700">
                    {{ executionSummaryText }}
                  </p>
                </div>
              </div>
            </section>

            <AgentTraceJsonSection
              title="Agent Tree 回放"
              description="这里更偏离线回放视图，实时运行中的树请在主消息区状态条打开 Agent Tree Dialog。"
              :value="detail?.responsePayload?.agentTree ?? null"
            />
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
import AgentTraceJsonSection from './AgentTraceJsonSection.vue'
import ChatMessageParts from './ChatMessageParts.vue'
import type { NormalChatConversationDisplayMessage } from '@renderer/stores/normal-chat/conversation/conversation.types'
import type { NormalChatConversationTurnDetail } from '@preload/types'

const props = defineProps<{
  visible: boolean
  requestId: string
  messageId: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const conversationStore = useNormalChatConversationStore()
const workspaceStore = useNormalChatWorkspaceStore()

const activeTab = ref<'raw' | 'rendered'>('raw')
const loading = ref(false)
const errorText = ref('')
const detail = ref<NormalChatConversationTurnDetail | null>(null)

const selectedMessage = computed<NormalChatConversationDisplayMessage | null>(() => {
  if (!detail.value || !props.messageId) {
    return null
  }

  const message = detail.value.messages.find((item) => item.id === props.messageId)
  if (!message) {
    return null
  }

  return {
    ...message,
    author: message.role === 'user' ? '用户' : detail.value.assistantName,
    time: message.createdAt,
    text: message.parts
      .filter((part) => part.kind === 'text')
      .map((part) => part.text)
      .join('')
  }
})

const selectedMessageJsonSummary = computed(() => {
  if (!selectedMessage.value || !detail.value) {
    return '无'
  }

  const payload = {
    messageId: selectedMessage.value.id,
    requestId: selectedMessage.value.requestId,
    role: selectedMessage.value.role,
    text: selectedMessage.value.text,
    rawMessage: detail.value.messages.find((item) => item.id === selectedMessage.value?.id) ?? null
  }

  return JSON.stringify(payload, null, 2)
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
  const tree = detail.value?.responsePayload?.agentTree
  if (!tree) {
    return '无执行记录'
  }

  const agents = Object.values(tree.agents)
  const helperCallCount = agents.reduce((sum, agent) => sum + agent.helperInvocations.length, 0)
  const maxDepth = agents.reduce((depth, agent) => Math.max(depth, agent.depth), 0)

  return `agent ${agents.length} 个，helper 调用 ${helperCallCount} 次，最大深度 ${maxDepth}，fallback ${tree.fallbackTriggered ? '是' : '否'}`
})

async function loadDetail(): Promise<void> {
  if (!props.visible || !props.requestId) {
    detail.value = null
    errorText.value = ''
    loading.value = false
    return
  }

  loading.value = true
  errorText.value = ''

  try {
    activeTab.value = 'raw'
    detail.value = await conversationStore.loadConversationTurnDetail(props.requestId)
    if (!detail.value) {
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
      detail.value = null
      errorText.value = ''
      return
    }

    void loadDetail()
  },
  { immediate: true }
)
</script>
