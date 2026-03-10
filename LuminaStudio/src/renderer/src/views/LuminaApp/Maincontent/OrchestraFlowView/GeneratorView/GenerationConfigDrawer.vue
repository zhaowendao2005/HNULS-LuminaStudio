<template>
  <Teleport to="body">
    <Transition name="of-generation-drawer">
      <div
        v-if="visible"
        class="of-generation-config-drawer fixed inset-0 z-50 flex justify-end bg-slate-900/18 backdrop-blur-[2px]"
        @click.self="$emit('close')"
      >
        <aside
          class="flex h-full w-full max-w-[460px] flex-col border-l border-slate-200 bg-white shadow-2xl"
        >
          <header class="flex items-start justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h3 class="text-[13px] font-semibold uppercase tracking-wider text-slate-800">
                {{ activeTabLabel }}
              </h3>
              <p class="mt-1 text-xs leading-5 text-slate-500">
                Agent 模型、上下文窗口与注入提示词统一在这里维护。
              </p>
            </div>
            <button
              type="button"
              class="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              title="关闭抽屉"
              @click="$emit('close')"
            >
              <svg
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </header>

          <div class="border-b border-slate-100 bg-slate-50/70 px-3 py-2">
            <div class="flex gap-2">
              <button
                v-for="tab in tabs"
                :key="tab.id"
                type="button"
                class="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                :class="
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                "
                @click="activeTab = tab.id"
              >
                {{ tab.label }}
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-4">
            <div v-if="activeTab === 'agents'" class="space-y-3">
              <section
                v-for="agent in agentEntries"
                :key="agent.agent_id"
                class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-[13px] font-semibold text-slate-900">
                        {{ agent.label }}
                      </span>
                      <span
                        class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                        :class="
                          agent.enabled
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        "
                      >
                        {{ agent.enabled ? '启用' : '停用' }}
                      </span>
                    </div>
                    <div class="mt-2 text-xs leading-5 text-slate-500">
                      {{ formatAgentSummary(agent) }}
                    </div>
                  </div>
                  <button
                    type="button"
                    class="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-700 transition-colors hover:border-cyan-500 hover:text-cyan-700"
                    @click="openModelSelector(agent.agent_id)"
                  >
                    选择模型
                  </button>
                </div>

                <div class="mt-4 grid grid-cols-2 gap-3">
                  <label class="flex flex-col gap-1.5">
                    <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Temperature
                    </span>
                    <input
                      :value="String(agent.temperature ?? 0)"
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500"
                      @input="updateNumeric(agent.agent_id, 'temperature', $event)"
                    />
                  </label>
                  <label class="flex flex-col gap-1.5">
                    <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Context N
                    </span>
                    <input
                      :value="String(agent.context_limit)"
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500"
                      @input="updateNumeric(agent.agent_id, 'context_limit', $event)"
                    />
                  </label>
                </div>
              </section>
            </div>

            <div v-else-if="activeTab === 'context'" class="space-y-3">
              <section
                v-for="agent in agentEntries"
                :key="`${agent.agent_id}-context`"
                class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
              >
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <div class="text-[13px] font-semibold text-slate-900">{{ agent.label }}</div>
                    <div class="mt-1 text-xs text-slate-500">
                      仅保留最近 N 条消息作为该 agent 的上下文窗口。
                    </div>
                  </div>
                  <div
                    class="min-w-[108px] rounded-xl bg-slate-50 px-3 py-2 text-right font-mono text-sm text-cyan-700"
                  >
                    {{ agent.context_limit }}
                  </div>
                </div>
              </section>
            </div>

            <div v-else class="space-y-3">
              <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-[13px] font-semibold text-slate-900">当前注入视图</span>
                  <button
                    type="button"
                    class="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-700 transition-colors hover:border-slate-300"
                    @click="copyInjection"
                  >
                    复制
                  </button>
                </div>
                <pre
                  class="mt-3 whitespace-pre-wrap rounded-2xl bg-slate-950 p-4 font-mono text-[12px] leading-6 text-slate-200"
                  >{{ injectionPreview }}</pre
                >
              </section>
            </div>
          </div>

          <footer
            class="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-3"
          >
            <span class="text-xs text-slate-500">
              修改后点击保存，才会写回 generation session。
            </span>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-slate-700 transition-colors hover:border-slate-300"
                @click="$emit('close')"
              >
                取消
              </button>
              <button
                type="button"
                class="rounded-full bg-slate-900 px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-slate-800"
                @click="$emit('save')"
              >
                保存配置
              </button>
            </div>
          </footer>
        </aside>

        <ModelSelector
          v-model:visible="selectorVisible"
          :current-provider-id="selectorProviderId"
          :current-model-id="selectorModelId"
          title="选择 Agent 模型"
          search-placeholder="搜索模型名称..."
          empty-text="未找到可用模型"
          hint-text="选择后会写入当前 Agent 配置"
          :show-manage-button="false"
          @select="handleModelSelect"
        />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type {
  OFGenerationAgentId,
  OFGenerationAgentRuntimeConfig
} from '@shared/Orchestraflow-types'
import ModelSelector from '@renderer/components/ModelSelector/index.vue'
import type { Model, ModelProvider } from '@renderer/stores/model-config/types'

type DrawerTab = 'agents' | 'context' | 'injection'

const props = defineProps<{
  visible: boolean
  activeTab?: DrawerTab
  agentConfigs: Record<OFGenerationAgentId, OFGenerationAgentRuntimeConfig>
  injectionPreview: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save'): void
  (
    e: 'update-agent',
    agentId: OFGenerationAgentId,
    patch: Partial<OFGenerationAgentRuntimeConfig>
  ): void
}>()

const tabs: Array<{ id: DrawerTab; label: string }> = [
  { id: 'agents', label: 'Agent 模型配置' },
  { id: 'context', label: '上下文窗口' },
  { id: 'injection', label: '注入提示词' }
]

const activeTab = ref<DrawerTab>(props.activeTab || 'agents')
const selectorVisible = ref(false)
const selectorAgentId = ref<OFGenerationAgentId>('draft_chat')
const selectorProviderId = ref<string | null>(null)
const selectorModelId = ref<string | null>(null)

const agentEntries = computed(() => [
  props.agentConfigs.draft_chat,
  props.agentConfigs.plan_panel,
  props.agentConfigs.topology_graph
])

const activeTabLabel = computed(
  () => tabs.find((tab) => tab.id === activeTab.value)?.label || '生成配置'
)

function formatAgentSummary(config: OFGenerationAgentRuntimeConfig): string {
  if (!config.model) return '未选择模型'
  return `${config.provider || 'provider'} / ${config.model}`
}

function openModelSelector(agentId: OFGenerationAgentId) {
  const config = props.agentConfigs[agentId]
  selectorAgentId.value = agentId
  selectorProviderId.value = config?.provider || null
  selectorModelId.value = config?.model || null
  selectorVisible.value = true
}

function handleModelSelect(payload: { provider: ModelProvider; model: Model }) {
  emit('update-agent', selectorAgentId.value, {
    provider: payload.provider.id,
    model: payload.model.id,
    enabled: true
  })
}

function updateNumeric(
  agentId: OFGenerationAgentId,
  key: 'temperature' | 'context_limit',
  event: Event
) {
  const value = Number((event.target as HTMLInputElement).value)
  emit('update-agent', agentId, { [key]: Number.isFinite(value) ? value : 0 })
}

async function copyInjection() {
  try {
    await navigator.clipboard.writeText(props.injectionPreview)
  } catch {
    return
  }
}
</script>

<style scoped>
.of-generation-drawer-enter-active,
.of-generation-drawer-leave-active {
  transition: opacity 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

.of-generation-drawer-enter-active aside,
.of-generation-drawer-leave-active aside {
  transition:
    transform 0.42s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

.of-generation-drawer-enter-from,
.of-generation-drawer-leave-to {
  opacity: 0;
}

.of-generation-drawer-enter-from aside,
.of-generation-drawer-leave-to aside {
  transform: translateX(36px) scale(0.985);
  opacity: 0;
}
</style>
