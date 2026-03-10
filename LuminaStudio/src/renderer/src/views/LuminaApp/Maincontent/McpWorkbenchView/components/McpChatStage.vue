<template>
  <section class="mw-chat-stage flex h-full min-h-0 gap-4 p-4">
    <aside class="w-[320px] shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">测试配置</h3>
        <button
          class="text-xs font-medium text-slate-500 hover:text-slate-800"
          @click="store.clearChatMessages"
        >
          清空
        </button>
      </div>

      <div class="mt-4 space-y-4">
        <div class="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            模型
          </div>
          <button
            class="mt-2 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left"
            @click="showModelSelector = true"
          >
            <span class="text-sm text-slate-700">{{ modelLabel }}</span>
            <span class="text-xs text-cyan-700">切换</span>
          </button>
        </div>

        <div class="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                MCP 开关
              </div>
              <p class="mt-1 text-xs text-slate-500">开启后会把选中的 MCP session 暴露给模型。</p>
            </div>
            <button
              class="relative h-6 w-11 rounded-full transition-colors"
              :class="store.state.chat.mcpEnabled ? 'bg-emerald-500' : 'bg-slate-300'"
              @click="store.state.chat.mcpEnabled = !store.state.chat.mcpEnabled"
            >
              <span
                class="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
                :class="store.state.chat.mcpEnabled ? 'translate-x-5' : 'translate-x-0.5'"
              />
            </button>
          </div>
        </div>

        <div class="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <div class="flex items-center justify-between">
            <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              可用 MCP
            </div>
            <span class="text-xs text-slate-400">
              {{ store.connectedSessions.length }} sessions
            </span>
          </div>
          <div class="mt-3 space-y-2">
            <label
              v-for="session in store.connectedSessions"
              :key="session.sessionId"
              class="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3"
            >
              <input
                :checked="store.state.chat.selectedSessionIds.includes(session.sessionId)"
                type="checkbox"
                class="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600"
                @change="store.toggleChatSession(session.sessionId)"
              />
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="truncate text-sm font-semibold text-slate-800">
                    {{ session.presetName }}
                  </span>
                  <span
                    class="h-2 w-2 rounded-full"
                    :class="session.connected ? 'bg-emerald-500' : 'bg-rose-500'"
                  />
                </div>
                <div class="mt-1 text-xs text-slate-500">{{ session.serverName || '未握手' }}</div>
                <div class="mt-1 text-[11px] text-slate-400">
                  tools {{ session.capabilities?.tools ? 'on' : 'off' }} · prompts
                  {{ session.capabilities?.prompts ? 'on' : 'off' }}
                </div>
              </div>
            </label>
            <div
              v-if="store.connectedSessions.length === 0"
              class="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-xs text-slate-400"
            >
              先在连接阶段连上至少一个 MCP session。
            </div>
          </div>
        </div>
      </div>
    </aside>

    <div
      class="flex min-w-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <header class="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <div>
          <div class="text-sm font-semibold text-slate-800">MCP 对话测试</div>
          <div class="mt-1 text-xs text-slate-400">
            用当前模型对已连接 MCP sessions 做真实工具联调。
          </div>
        </div>
        <div class="text-xs text-slate-500">
          {{ store.state.chat.mcpEnabled ? selectedSessionsLabel : 'MCP 已关闭' }}
        </div>
      </header>

      <main class="min-h-0 flex-1 overflow-y-auto bg-slate-50/40 px-6 py-5">
        <ChatMainMessage
          :messages="store.state.chat.messages"
          :is-generating="Boolean(store.state.chat.activeRequestId)"
        />
      </main>

      <footer class="border-t border-slate-100 px-5 py-4">
        <div class="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <textarea
            v-model="store.state.chat.userInput"
            rows="3"
            class="min-h-[72px] w-full resize-none rounded-t-2xl bg-transparent px-4 py-3 text-sm text-slate-700 outline-none"
            placeholder="输入测试消息，按 Enter 发送，Shift+Enter 换行"
            @keydown="handleKeydown"
          />
          <div class="flex items-center justify-between border-t border-slate-100 px-3 py-2">
            <label class="flex items-center gap-2 text-xs text-slate-500">
              <input
                v-model="store.state.chat.enableThinking"
                type="checkbox"
                class="h-4 w-4 rounded border-slate-300 text-emerald-600"
              />
              开启 thinking
            </label>
            <div class="flex items-center gap-2">
              <button
                v-if="store.state.chat.activeRequestId"
                class="rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white"
                @click="store.abortChat"
              >
                中断
              </button>
              <button
                v-else
                class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="!canSend"
                @click="store.sendChatMessage"
              >
                发送
              </button>
            </div>
          </div>
        </div>
        <p
          v-if="store.state.error"
          class="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
        >
          {{ store.state.error }}
        </p>
      </footer>
    </div>

    <ModelSelectorModal
      v-model:visible="showModelSelector"
      :current-provider-id="store.state.chat.currentProviderId"
      :current-model-id="store.state.chat.currentModelId"
      @select="handleModelSelect"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Model, ModelProvider } from '@renderer/stores/model-config/types'
import { useMcpStore } from '@renderer/stores/mcp/store'
import ChatMainMessage from '@renderer/views/LuminaApp/Maincontent/NormalChat/NormalChat-Maincontent/ChatMain-Message/index.vue'
import ModelSelectorModal from '@renderer/views/LuminaApp/Maincontent/NormalChat/NormalChat-Maincontent/ModelSelectorModal.vue'

const store = useMcpStore()
const showModelSelector = ref(false)

const modelLabel = computed(() => {
  if (!store.state.chat.currentProviderId || !store.state.chat.currentModelId) {
    return '未选择模型'
  }
  return `${store.state.chat.currentProviderId} / ${store.state.chat.currentModelId}`
})

const selectedSessionsLabel = computed(() => {
  const count = store.state.chat.selectedSessionIds.length
  return count > 0 ? `已选 ${count} 个 MCP` : '未选择 MCP'
})

const canSend = computed(() => store.state.chat.userInput.trim().length > 0)

function handleModelSelect(provider: ModelProvider, model: Model): void {
  store.setChatModel(provider.id, model.id)
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    if (canSend.value) {
      store.sendChatMessage()
    }
  }
}
</script>
