<template>
  <div
    class="ls-mcp-chat-stage flex h-full min-h-0 overflow-hidden rounded-3xl border border-slate-200 bg-white"
  >
    <section class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header class="border-b border-slate-200 px-5 py-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-lg font-semibold text-slate-900">MCP 对话面板</p>
            <p class="mt-1 text-sm text-slate-500">
              使用 LangChain 统一模型协议，按你勾选的 MCP 工具树决定本轮可调用能力。
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
              @click="handleRefreshServers"
            >
              刷新工具树
            </button>
            <button
              type="button"
              class="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:border-rose-300 hover:text-rose-700"
              @click="store.deleteCurrentSession()"
            >
              删除会话
            </button>
            <button
              type="button"
              class="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              @click="store.createSession()"
            >
              新建会话
            </button>
          </div>
        </div>
      </header>

      <div class="border-b border-slate-200 px-5 py-3">
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex items-center gap-2 text-sm text-slate-600">
            <span>会话</span>
            <WhiteSelect
              :model-value="store.state.selectedSessionId"
              :options="sessionOptions"
              placeholder="请选择会话"
              root-class="min-w-[220px]"
              @update:model-value="handleSelectSession"
            />
          </div>

          <button
            type="button"
            class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
            @click="showModelSelector = true"
          >
            <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>{{ currentProviderLabel }}</span>
            <span class="text-slate-300">/</span>
            <span>{{ currentModelLabel }}</span>
          </button>

          <div class="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
            {{ store.state.statusText || '空闲中' }}
          </div>
        </div>
      </div>

      <div class="flex min-h-0 flex-1 overflow-hidden">
        <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div class="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            <template v-if="selectedSession">
              <article
                v-for="message in selectedSession.displayMessages"
                :key="message.id"
                :class="[
                  'rounded-2xl border px-4 py-3 text-sm leading-6 shadow-sm',
                  message.role === 'user'
                    ? 'ml-auto max-w-[78%] border-emerald-200 bg-emerald-50 text-emerald-950'
                    : 'max-w-[82%] border-slate-200 bg-slate-50 text-slate-800'
                ]"
              >
                <div class="mb-2 flex items-center justify-between gap-3 text-xs text-slate-400">
                  <span>{{ message.role === 'user' ? '用户' : '助手' }}</span>
                  <span>{{ formatTime(message.createdAt) }}</span>
                </div>
                <pre class="whitespace-pre-wrap break-words font-sans">{{ message.text }}</pre>
              </article>
            </template>
          </div>

          <footer class="border-t border-slate-200 px-5 py-4">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <textarea
                v-model="inputText"
                class="min-h-[120px] w-full resize-none bg-transparent text-sm leading-6 text-slate-800 outline-none"
                placeholder="输入问题后发送，系统会先做工具规划，再按已启用 MCP 工具执行并流式生成回答。"
              />
              <div class="mt-3 flex items-center justify-between gap-3">
                <p class="text-xs text-slate-500">
                  右侧工具树决定本轮允许使用的 MCP 工具；未勾选的工具不会进入规划与执行流程。
                  如果开启多轮 agent
                  模式，系统会在单次请求里维护独立临时历史，边看工具返回边继续决策。
                </p>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:border-amber-300 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="!store.state.currentRequestId"
                    @click="store.abortCurrentRequest()"
                  >
                    中止
                  </button>
                  <button
                    type="button"
                    class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                    @click="handleSend"
                  >
                    发送
                  </button>
                </div>
              </div>
            </div>
            <p v-if="store.state.error" class="mt-3 text-sm text-rose-600">
              {{ store.state.error }}
            </p>
          </footer>
        </div>

        <div
          class="relative shrink-0 border-l border-slate-200 bg-slate-50/80"
          :style="{ width: `${store.state.rightPanelWidth}px` }"
        >
          <button
            type="button"
            class="absolute left-0 top-0 h-full w-1 -translate-x-1/2 cursor-col-resize bg-transparent"
            @mousedown="startResize"
          />

          <div class="flex h-full flex-col">
            <div class="flex border-b border-slate-200 bg-white/80 px-3 pt-3">
              <button
                v-for="tab in sideTabs"
                :key="tab.id"
                type="button"
                :class="[
                  'rounded-t-xl px-3 py-2 text-sm transition',
                  store.state.activeTab === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-800'
                ]"
                @click="store.state.activeTab = tab.id"
              >
                {{ tab.label }}
              </button>
            </div>

            <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <div v-if="store.state.activeTab === 'tools'" class="space-y-4">
                <article
                  v-for="server in store.groupedServerTree"
                  :key="server.id"
                  class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div class="flex items-start gap-3">
                    <input
                      :id="`server-${server.id}`"
                      :checked="server.checked"
                      type="checkbox"
                      class="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      @change="
                        store.toggleServer(server, ($event.target as HTMLInputElement).checked)
                      "
                    />
                    <div class="min-w-0 flex-1">
                      <label
                        :for="`server-${server.id}`"
                        class="text-sm font-medium text-slate-900"
                      >
                        {{ server.name }}
                      </label>
                      <p class="mt-1 text-xs text-slate-500">
                        {{
                          server.status === 'connected'
                            ? `${server.serverName || 'Server'} · ${server.transport}`
                            : server.error
                        }}
                      </p>
                      <div class="mt-3 space-y-2 border-t border-dashed border-slate-200 pt-3">
                        <label
                          v-for="tool in server.tools"
                          :key="tool.key"
                          class="flex items-start gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        >
                          <input
                            :checked="tool.checked"
                            type="checkbox"
                            class="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            @change="
                              store.toggleTool(
                                server.id,
                                tool.key,
                                ($event.target as HTMLInputElement).checked
                              )
                            "
                          />
                          <div class="min-w-0 flex-1">
                            <p class="font-medium text-slate-800">{{ tool.name }}</p>
                            <p class="mt-1 text-xs leading-5 text-slate-500">
                              {{ tool.description || '这个工具还没有提供额外描述。' }}
                            </p>
                          </div>
                        </label>
                        <p v-if="server.tools.length === 0" class="text-xs text-slate-400">
                          当前没有可用工具，可能是连接失败或服务端未暴露 tools capability。
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              </div>

              <div v-else-if="store.state.activeTab === 'raw-json'" class="space-y-3">
                <article
                  v-for="entry in selectedSession?.rawEntries || []"
                  :key="entry.id"
                  class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div class="mb-2 flex items-center justify-between gap-3">
                    <p class="text-sm font-medium text-slate-900">{{ entry.label }}</p>
                    <span class="text-xs text-slate-400">{{ formatTime(entry.createdAt) }}</span>
                  </div>
                  <pre
                    class="overflow-x-auto rounded-xl bg-slate-950/95 p-3 text-xs leading-6 text-slate-100"
                    >{{ prettyJson(entry.payload) }}</pre
                  >
                </article>
                <p v-if="!selectedSession?.rawEntries.length" class="text-sm text-slate-400">
                  这里显示本轮对话的规划结果、工具调用参数与工具返回值快照。内容不持久化。
                </p>
              </div>

              <div v-else class="space-y-4">
                <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p class="text-sm font-semibold text-slate-900">记忆轮数默认值</p>
                  <p class="mt-2 text-xs leading-5 text-slate-500">
                    这个值会持久化到用户设置，并作为新建 MCP 对话时的默认 memory rounds。
                  </p>
                  <div class="mt-4 flex items-center gap-3">
                    <input
                      v-model.number="store.state.memoryRoundsDefault"
                      type="number"
                      min="1"
                      class="w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                    />
                    <button
                      type="button"
                      class="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                      @click="handleSaveSettings"
                    >
                      保存
                    </button>
                  </div>
                </article>

                <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <p class="text-sm font-semibold text-slate-900">多轮 Agent 模式</p>
                      <p class="mt-2 text-xs leading-5 text-slate-500">
                        打开后，系统会在一次请求里维护一份独立临时历史，调用 MCP
                        工具后继续看返回并自主决策，
                        直到判断可以回答或达到最大轮数。这个临时历史不会写入会话消息。
                      </p>
                    </div>
                    <label class="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        v-model="store.state.enableAgentMode"
                        type="checkbox"
                        class="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{{ store.state.enableAgentMode ? '已开启' : '已关闭' }}</span>
                    </label>
                  </div>

                  <div class="mt-4 flex items-center gap-3">
                    <label class="text-sm text-slate-600">最大轮数</label>
                    <input
                      v-model.number="store.state.agentMaxRounds"
                      type="number"
                      min="1"
                      :disabled="!store.state.enableAgentMode"
                      class="w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <span class="text-xs text-slate-400">
                      {{
                        store.state.enableAgentMode
                          ? '达到轮数后会停止继续规划，转入最终回答。'
                          : '关闭时固定只跑 1 轮。'
                      }}
                    </span>
                  </div>

                  <div class="mt-4">
                    <button
                      type="button"
                      class="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                      @click="handleSaveSettings"
                    >
                      保存 Agent 设置
                    </button>
                  </div>
                </article>

                <article
                  v-if="selectedSession"
                  class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <p class="text-sm font-semibold text-slate-900">当前会话信息</p>
                  <dl class="mt-3 space-y-2 text-sm text-slate-600">
                    <div class="flex items-center justify-between gap-3">
                      <dt>会话标题</dt>
                      <dd>{{ selectedSession.title }}</dd>
                    </div>
                    <div class="flex items-center justify-between gap-3">
                      <dt>当前模型</dt>
                      <dd>{{ selectedSession.modelId }}</dd>
                    </div>
                    <div class="flex items-center justify-between gap-3">
                      <dt>会话记忆轮数</dt>
                      <dd>{{ selectedSession.memoryRounds }}</dd>
                    </div>
                    <div class="flex items-center justify-between gap-3">
                      <dt>启用 Server 数</dt>
                      <dd>{{ selectedSession.enabledServerIds.length }}</dd>
                    </div>
                    <div class="flex items-center justify-between gap-3">
                      <dt>启用 Tool 数</dt>
                      <dd>{{ selectedSession.enabledToolKeys.length }}</dd>
                    </div>
                    <div class="flex items-center justify-between gap-3">
                      <dt>Agent 模式</dt>
                      <dd>
                        {{
                          store.state.enableAgentMode
                            ? `开启 / ${store.state.agentMaxRounds} 轮`
                            : '关闭'
                        }}
                      </dd>
                    </div>
                  </dl>
                </article>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <ModelSelector
      v-model:visible="showModelSelector"
      :current-provider-id="selectedSession?.providerId || null"
      :current-model-id="selectedSession?.modelId || null"
      title="切换 MCP 对话模型"
      hint-text="这里复用全局模型配置，选择结果只写入当前 MCP 会话。"
      :show-manage-button="false"
      @select="handleModelSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ModelSelector from '@renderer/components/ModelSelector'
import WhiteSelect, { type WhiteSelectOption } from '@renderer/components/WhiteSelect/index.vue'
import { useModelConfigStore } from '@renderer/stores/model-config/store'
import type { Model, ModelProvider } from '@renderer/stores/model-config/types'
import { useMcpChatStore } from '@renderer/stores/mcp-chat/store'

const store = useMcpChatStore()
const modelConfigStore = useModelConfigStore()

const inputText = ref('')
const showModelSelector = ref(false)
const sideTabs = [
  { id: 'tools', label: '工具树' },
  { id: 'raw-json', label: '原始 JSON' },
  { id: 'settings', label: '设置' }
] as const

const selectedSession = computed(() => store.selectedSession)
const selectedProvider = computed(() => {
  const provider = modelConfigStore.providers.find(
    (item) => item.id === selectedSession.value?.providerId
  )
  return provider || null
})
const currentProviderLabel = computed(() => selectedProvider.value?.name || 'provider')
const currentModelLabel = computed(() => {
  const model = selectedProvider.value?.models.find(
    (item) => item.id === selectedSession.value?.modelId
  )
  return model?.name || selectedSession.value?.modelId || 'model'
})
const sessionOptions = computed<Array<WhiteSelectOption<string>>>(() =>
  store.state.sessions.map((session) => ({
    label: session.title,
    value: session.id
  }))
)

onMounted(async () => {
  await store.initialize()
})

function prettyJson(payload: unknown): string {
  return JSON.stringify(payload, null, 2)
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

async function handleSend(): Promise<void> {
  if (!inputText.value.trim()) return
  await store.sendMessage(inputText.value)
  inputText.value = ''
}

async function handleRefreshServers(): Promise<void> {
  await store.refreshServers()
}

async function handleSaveSettings(): Promise<void> {
  await store.saveSettings()
}

async function handleSelectSession(value: string | number | null): Promise<void> {
  if (!value || typeof value !== 'string') return
  store.state.selectedSessionId = value
}

async function handleModelSelect(payload: {
  provider: ModelProvider
  model: Model
}): Promise<void> {
  if (!selectedSession.value) return
  await store.updateSession(selectedSession.value.id, {
    providerId: payload.provider.id,
    modelId: payload.model.id
  })
}

function startResize(event: MouseEvent): void {
  const startX = event.clientX
  const startWidth = store.state.rightPanelWidth

  const onMouseMove = (moveEvent: MouseEvent): void => {
    const delta = startX - moveEvent.clientX
    store.state.rightPanelWidth = Math.max(300, Math.min(620, startWidth + delta))
  }

  const onMouseUp = (): void => {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}
</script>
