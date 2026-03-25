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

      <div
        ref="contentViewportRef"
        class="min-h-0 flex-1 overflow-y-auto bg-gray-50 px-6 py-5"
        @scroll="handleContentViewportScroll"
      >
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
              :value="detail?.requestRecord ?? {}"
            />
            <ConversationDetailRawSection
              title="原始响应 JSON"
              description="包含流式 chunks、最终文本、结束状态和错误信息。"
              :value="detail?.responseRecord ?? {}"
            />
            <AgentTraceJsonSection
              title="Agent Tree JSON"
              description="保存完整会话时，递归式 multi-agent 运行树会直接落在 turn trace 中。"
              :value="detail?.runtimeTrace?.agentTree ?? null"
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
                <div v-if="focusedFunctionCall" class="rounded-xl bg-sky-50 px-3 py-2">
                  <p class="text-[12px] text-sky-500">当前聚焦调用</p>
                  <p class="mt-1 text-[13px] font-medium text-sky-800">
                    {{ focusedFunctionCall.title }} · {{ focusedFunctionCall.functionCallName }}
                  </p>
                  <pre
                    class="mt-2 whitespace-pre-wrap break-words text-[12px] leading-6 text-sky-700"
                    >{{ focusedFunctionCall.input || focusedFunctionCall.output || '无内容' }}</pre
                  >
                </div>
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
                      detail?.responseRecord?.errorMessage
                        ? `错误：${detail.responseRecord.errorMessage}`
                        : detail?.responseRecord?.aborted
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

            <section class="rounded-2xl border border-gray-200 bg-white px-4 py-4">
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-[14px] font-semibold text-gray-900">Helper 调用时间线</h3>
                <span class="text-[12px] text-gray-400">
                  共 {{ helperTimelineParts.length }} 次调用
                </span>
              </div>
              <div v-if="helperTimelineParts.length > 0" class="mt-3 space-y-3">
                <div
                  v-for="entry in helperTimelineParts"
                  :key="entry.callId"
                  class="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3"
                >
                  <div class="mb-2 flex items-center justify-between gap-3">
                    <div class="min-w-0">
                      <p class="truncate text-[13px] font-medium text-gray-800">
                        {{ entry.title }}
                      </p>
                      <p class="mt-1 text-[12px] text-gray-500">
                        depth {{ entry.depth }} · {{ entry.agentLabel }} · {{ entry.helperId }}
                      </p>
                    </div>
                    <span
                      class="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                      :class="entry.statusClass"
                    >
                      {{ entry.statusLabel }}
                    </span>
                  </div>
                  <p v-if="entry.summary" class="mb-2 text-[12px] leading-5 text-gray-600">
                    {{ entry.summary }}
                  </p>
                  <div class="grid gap-3 md:grid-cols-2">
                    <div class="rounded-lg bg-white px-3 py-2">
                      <p class="text-[12px] font-medium text-gray-500">输入</p>
                      <pre
                        class="mt-2 whitespace-pre-wrap break-words text-[12px] leading-5 text-gray-700"
                        >{{ entry.input }}</pre
                      >
                    </div>
                    <div class="rounded-lg bg-white px-3 py-2">
                      <p class="text-[12px] font-medium text-gray-500">输出 / 错误</p>
                      <pre
                        class="mt-2 whitespace-pre-wrap break-words text-[12px] leading-5 text-gray-700"
                        >{{ entry.output }}</pre
                      >
                    </div>
                  </div>
                </div>
              </div>
              <p v-else class="mt-3 text-[13px] text-gray-500">当前没有 helper 调用记录。</p>
            </section>

            <AgentTraceJsonSection
              title="Agent Tree 回放"
              description="这里更偏离线回放视图，实时运行中的树请在主消息区状态条打开 Agent Tree Dialog。"
              :value="detail?.runtimeTrace?.agentTree ?? null"
            />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { useNormalChatConversationStore } from '@renderer/stores/normal-chat/conversation/conversation.store'
import { useNormalChatWorkspaceStore } from '@renderer/stores/normal-chat/workspace/workspace.store'
import ConversationDetailRawSection from './ConversationDetailRawSection.vue'
import AgentTraceJsonSection from './AgentTraceJsonSection.vue'
import ChatMessageParts from './ChatMessageParts.vue'
import type { NormalChatConversationDisplayMessage } from '@renderer/stores/normal-chat/conversation/conversation.types'
import type {
  NormalChatConversationTurnDetail,
  NormalChatFunctionCallMessagePart
} from '@preload/types'

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
const contentViewportRef = ref<HTMLElement | null>(null)
const autoStickToBottom = ref(true)
const BOTTOM_STICK_THRESHOLD_PX = 96

// 详情数据优先走 store 缓存，流式阶段直接吃事件补丁，避免轮询整页重刷闪烁。
const detail = computed<NormalChatConversationTurnDetail | null>(() => {
  return conversationStore.getConversationTurnDetailCached(props.requestId)
})

const selectedMessage = computed<NormalChatConversationDisplayMessage | null>(() => {
  if (!props.requestId) {
    return null
  }

  const persistedMessage = detail.value?.messages.find((item) => item.id === props.messageId)
  if (persistedMessage && detail.value) {
    return {
      ...persistedMessage,
      author: persistedMessage.role === 'user' ? '用户' : detail.value.assistantName,
      time: persistedMessage.createdAt,
      text: persistedMessage.parts
        .filter((part) => part.kind === 'text')
        .map((part) => part.text)
        .join('')
    }
  }

  const requestAssistantMessage =
    detail.value?.messages.find(
      (message) => message.requestId === props.requestId && message.role === 'assistant'
    ) ?? null
  if (requestAssistantMessage && detail.value) {
    return {
      ...requestAssistantMessage,
      author: detail.value.assistantName,
      time: requestAssistantMessage.createdAt,
      text: requestAssistantMessage.parts
        .filter((part) => part.kind === 'text')
        .map((part) => part.text)
        .join('')
    }
  }

  // 正在流式生成时，assistant 正文还没真正入库，此时退回主消息区的 pending 消息。
  return (
    conversationStore.currentDisplayMessages.find(
      (message) =>
        message.requestId === props.requestId &&
        (message.id === props.messageId || message.role === 'assistant')
    ) ?? null
  )
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

const focusedFunctionCall = computed<NormalChatFunctionCallMessagePart | null>(() => {
  if (!selectedMessage.value || !props.focusCallId) {
    return null
  }

  return (
    selectedMessage.value.parts.find(
      (part): part is NormalChatFunctionCallMessagePart =>
        part.kind === 'functioncall' && part.callId === props.focusCallId
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
  const tree = detail.value?.runtimeTrace?.agentTree
  if (!tree) {
    return '无执行记录'
  }

  const agents = Object.values(tree.agents)
  const helperCallCount = agents.reduce((sum, agent) => sum + agent.helperInvocations.length, 0)
  const maxDepth = agents.reduce((depth, agent) => Math.max(depth, agent.depth), 0)

  return `agent ${agents.length} 个，helper 调用 ${helperCallCount} 次，最大深度 ${maxDepth}，fallback ${tree.fallbackTriggered ? '是' : '否'}`
})

const helperTimelineParts = computed(() => {
  const tree = detail.value?.runtimeTrace?.agentTree
  if (!tree) {
    return []
  }

  return Object.values(tree.agents)
    .flatMap((agent) =>
      agent.helperInvocations.map((invocation) => {
        const statusLabel =
          invocation.status === 'success'
            ? '已完成'
            : invocation.status === 'error'
              ? '已失败'
              : invocation.status === 'aborted'
                ? '已中止'
                : '执行中'

        const statusClass =
          invocation.status === 'success'
            ? 'bg-emerald-100 text-emerald-700'
            : invocation.status === 'error'
              ? 'bg-rose-100 text-rose-700'
              : invocation.status === 'aborted'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-sky-100 text-sky-700'

        return {
          callId: invocation.callId,
          helperId: invocation.helperId,
          title: invocation.displayName,
          depth: agent.depth,
          agentLabel: `${agent.roleKind}/${agent.taskKind}`,
          summary: invocation.resultSummary ?? invocation.failureSummary ?? null,
          input: invocation.argsJson || '无',
          output: invocation.outputJson || invocation.errorMessage || '无',
          statusLabel,
          statusClass,
          startedAt: invocation.startedAt
        }
      })
    )
    .sort((left, right) => left.startedAt.localeCompare(right.startedAt))
})

function isNearBottom(): boolean {
  const viewport = contentViewportRef.value
  if (!viewport) {
    return true
  }

  const distanceToBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight
  return distanceToBottom <= BOTTOM_STICK_THRESHOLD_PX
}

function handleContentViewportScroll(): void {
  autoStickToBottom.value = isNearBottom()
}

async function scrollToBottom(behavior: ScrollBehavior = 'auto'): Promise<void> {
  await nextTick()
  const viewport = contentViewportRef.value
  if (!viewport) {
    return
  }

  viewport.scrollTo({
    top: viewport.scrollHeight,
    behavior
  })
  autoStickToBottom.value = true
}

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

    autoStickToBottom.value = true

    if (!props.requestId) {
      errorText.value = ''
      return
    }

    if (conversationStore.getConversationTurnDetailCached(props.requestId)) {
      errorText.value = ''
      loading.value = false
      void scrollToBottom('auto')
      return
    }

    void loadDetail()
  },
  { immediate: true }
)

watch(
  () => [props.visible, activeTab.value],
  ([visible]) => {
    if (!visible) {
      return
    }

    autoStickToBottom.value = true
    void scrollToBottom('auto')
  }
)

watch(
  () =>
    props.visible
      ? JSON.stringify({
          activeTab: activeTab.value,
          requestId: detail.value?.requestId ?? '',
          responseRecord: detail.value?.responseRecord ?? null,
          runtimeTrace: detail.value?.runtimeTrace ?? null,
          messages: detail.value?.messages ?? []
        })
      : '',
  (nextValue, previousValue) => {
    if (!props.visible || !nextValue) {
      return
    }

    // 弹窗内的流式区也遵循主消息区规则：只有贴近底部时才自动跟随。
    if (!previousValue || autoStickToBottom.value) {
      void scrollToBottom('auto')
    }
  }
)
</script>
