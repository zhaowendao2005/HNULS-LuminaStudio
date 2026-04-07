<template>
  <div
    v-if="workspaceStore.assistantSettingsOpen"
    class="nc-assistant-settings-modal-a9k2 nc-backdrop-fade-in-a9k2 fixed inset-0 z-50 flex items-center justify-center bg-black/15 backdrop-blur-[1px]"
  >
    <div
      class="nc-dialog-slide-up-a9k2 flex h-[720px] w-[960px] flex-col overflow-hidden rounded-xl bg-white shadow-[var(--nc-shadow-dialog)]"
    >
      <div class="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div class="min-w-0">
          <h2 class="truncate text-[16px] font-semibold text-gray-900">
            {{
              workspaceStore.settingsScope === 'assistant'
                ? (workspaceStore.currentAssistant?.name ?? '未选择助手')
                : (workspaceStore.currentTopic?.title ?? '未选择话题')
            }}
          </h2>
          <p class="mt-1 text-[12px] text-gray-500">
            {{
              workspaceStore.settingsScope === 'assistant'
                ? '这里修改的是助手自身配置。'
                : '这里修改的是当前话题对助手配置的覆写；灰色表示仍在继承助手默认值，直接修改就会自动转成覆写。'
            }}
          </p>
        </div>

        <button
          class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          type="button"
          @click="workspaceStore.closeAssistantSettings"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <div class="flex flex-1 overflow-hidden">
        <aside class="flex w-[180px] flex-col gap-1 border-r border-gray-100 bg-[#fafafa] py-3">
          <button
            v-for="item in workspaceStore.settingsNavItems"
            :key="item.id"
            class="mx-3 rounded-lg px-4 py-2.5 text-left text-[14px] transition-colors"
            :class="
              item.id === workspaceStore.activeSettingsTab
                ? 'bg-gray-200/70 font-medium text-gray-900'
                : 'text-gray-600 hover:bg-gray-200/40'
            "
            type="button"
            @click="workspaceStore.setActiveSettingsTab(item.id)"
          >
            {{ item.label }}
          </button>
        </aside>

        <section class="flex flex-1 flex-col overflow-y-auto bg-white p-6">
          <template v-if="showBasicPage">
            <div class="space-y-5">
              <div v-if="workspaceStore.settingsScope === 'assistant'" class="space-y-2">
                <label class="block text-[13px] font-semibold text-gray-900">助手名称</label>
                <div
                  class="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm"
                >
                  <div
                    class="flex h-9 w-9 items-center justify-center rounded-lg border border-pink-100 bg-pink-50 text-[16px]"
                  >
                    {{ workspaceStore.currentAssistant?.emoji ?? '🤖' }}
                  </div>
                  <input
                    v-model="assistantNameModel"
                    class="flex-1 border-none bg-transparent text-[14px] text-gray-800 outline-none"
                    placeholder="请输入助手名称"
                    type="text"
                  />
                </div>
              </div>

              <section
                v-if="workspaceStore.settingsScope === 'assistant'"
                class="rounded-2xl border border-gray-100 bg-gray-50/60 p-4"
              >
                <div class="mb-3">
                  <h3 class="text-[14px] font-semibold text-gray-900">对话持久化档位</h3>
                  <p class="mt-1 text-[12px] leading-5 text-gray-500">
                    控制 normal-chat 运行时细节在数据库中的保留粒度。聊天流里的正文、
                    thinking 与 inline functioncall 会始终保留。
                  </p>
                </div>

                <WhiteSelect
                  v-model="assistantPersistencePresetModel"
                  :options="persistencePresetOptions"
                  :placeholder="'请选择持久化档位'"
                  teleport-to="body"
                />
              </section>

              <section class="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                <div class="mb-3">
                  <h3 class="text-[14px] font-semibold text-gray-900">是否开启流式</h3>
                  <p class="mt-1 text-[12px] leading-5 text-gray-500">
                    控制回复正文是否默认以流式方式展示。
                  </p>
                </div>

                <div
                  class="flex items-center justify-between rounded-xl border px-3 py-3 transition-colors"
                  :class="panelClass(topicStreamingInherited)"
                >
                  <div>
                    <p class="text-[13px] font-medium" :class="textClass(topicStreamingInherited)">
                      {{ streamingSummary }}
                    </p>
                    <p class="mt-1 text-[12px]" :class="subTextClass(topicStreamingInherited)">
                      {{
                        topicStreamingInherited
                          ? '当前话题沿用助手默认流式配置。'
                          : '当前话题已单独覆写流式配置。'
                      }}
                    </p>
                  </div>
                  <button
                    class="relative inline-flex h-6 w-11 items-center rounded-full border transition-colors duration-200"
                    :class="resolvedStreamingSwitchClass"
                    type="button"
                    @click="toggleStreaming"
                  >
                    <span
                      class="inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200"
                      :class="resolvedStreamingThumbClass"
                    />
                  </button>
                </div>
              </section>
            </div>
          </template>

          <template v-else-if="showModelPage">
            <div class="space-y-5">
              <div class="grid gap-4 lg:grid-cols-2">
                <section class="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                  <div class="mb-3">
                    <h3 class="text-[14px] font-semibold text-gray-900">单 Agent 最大推理深度</h3>
                    <p class="mt-1 text-[12px] leading-5 text-gray-500">
                      指单个 agent 在当前层最多允许多少次 ReAct 推理切换。
                    </p>
                  </div>

                  <input
                    v-model.number="resolvedMaxReasoningStepsModel"
                    class="w-full rounded-xl border px-3 py-2 text-[14px] outline-none transition-colors"
                    :class="inputClass(topicMaxReasoningStepsInherited)"
                    min="0"
                    step="1"
                    type="number"
                  />
                </section>

                <section class="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                  <div class="mb-3">
                    <h3 class="text-[14px] font-semibold text-gray-900">最大递归层级</h3>
                    <p class="mt-1 text-[12px] leading-5 text-gray-500">
                      主 Agent 派发子 Agent 后，允许继续向下递归的最大层级。
                    </p>
                  </div>

                  <input
                    v-model.number="resolvedMaxRecursionDepthModel"
                    class="w-full rounded-xl border px-3 py-2 text-[14px] outline-none transition-colors"
                    :class="inputClass(topicMaxRecursionDepthInherited)"
                    min="0"
                    step="1"
                    type="number"
                  />
                </section>
              </div>

              <div class="grid gap-4 lg:grid-cols-2">
                <section class="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                  <div class="mb-3">
                    <h3 class="text-[14px] font-semibold text-gray-900">上下文记忆轮数</h3>
                    <p class="mt-1 text-[12px] leading-5 text-gray-500">
                      一轮指一次用户输入和一次模型输出，决定默认回带多少历史轮次。
                    </p>
                  </div>

                  <input
                    v-model.number="resolvedContextMemoryRoundsModel"
                    class="w-full rounded-xl border px-3 py-2 text-[14px] outline-none transition-colors"
                    :class="inputClass(topicContextMemoryInherited)"
                    min="0"
                    step="1"
                    type="number"
                  />
                </section>

                <section class="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                  <div class="mb-3">
                    <h3 class="text-[14px] font-semibold text-gray-900">切换次数计费模型优化</h3>
                    <p class="mt-1 text-[12px] leading-5 text-gray-500">
                      用于控制更偏少轮切换，还是更偏 token 利用效率。
                    </p>
                  </div>

                  <WhiteSelect
                    v-model="resolvedCostModeModel"
                    :options="costModeOptions"
                    :placeholder="'请选择计费偏好'"
                    :root-class="inputClass(topicCostInherited)"
                    :trigger-class="inputClass(topicCostInherited)"
                    teleport-to="body"
                  />
                </section>
              </div>

              <section class="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                <div class="mb-3">
                  <h3 class="text-[14px] font-semibold text-gray-900">默认模型</h3>
                  <p class="mt-1 text-[12px] leading-5 text-gray-500">
                    {{
                      workspaceStore.settingsScope === 'assistant'
                        ? '设置这个助手默认使用的模型。'
                        : '当前话题默认沿用助手模型，直接改选择就会自动转成覆写。'
                    }}
                  </p>
                </div>

                <div class="grid gap-3 lg:grid-cols-2">
                  <WhiteSelect
                    v-model="resolvedModelProviderIdModel"
                    :options="providerOptions"
                    :placeholder="'请选择服务商'"
                    :root-class="inputClass(topicModelInherited)"
                    :trigger-class="inputClass(topicModelInherited)"
                    teleport-to="body"
                  />

                  <WhiteSelect
                    v-model="resolvedModelIdModel"
                    :disabled="currentModelOptions.length === 0"
                    :options="modelOptions"
                    :placeholder="'请选择模型'"
                    :root-class="inputClass(topicModelInherited)"
                    :trigger-class="inputClass(topicModelInherited)"
                    teleport-to="body"
                  />
                </div>
              </section>
            </div>
          </template>

          <template v-else-if="showPromptPage">
            <section class="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
              <div class="mb-3">
                <h3 class="text-[14px] font-semibold text-gray-900">系统提示词</h3>
                <p class="mt-1 text-[12px] leading-5 text-gray-500">
                  {{
                    workspaceStore.settingsScope === 'assistant'
                      ? '这里定义助手默认 system prompt。'
                      : '当前话题默认展示继承后的提示词，直接修改即自动转成覆写。'
                  }}
                </p>
              </div>

              <textarea
                v-model="promptTextModel"
                class="min-h-[420px] w-full resize-none rounded-xl border p-4 font-mono text-[13px] leading-6 outline-none transition-colors"
                :class="textareaClass(topicPromptInherited)"
                :placeholder="
                  workspaceStore.settingsScope === 'assistant'
                    ? '输入助手默认 system prompt...'
                    : '输入当前话题的 prompt 覆写内容...'
                "
              />
              <div class="mt-3 flex items-center justify-between text-[12px] text-gray-500">
                <span>
                  {{
                    topicPromptInherited
                      ? '当前展示的是继承后的生效提示词。'
                      : '当前编辑的是该话题自己的提示词覆写。'
                  }}
                </span>
                <span>Tokens: {{ promptTokenCount }}</span>
              </div>
            </section>
          </template>

          <template v-else-if="showActionPage">
            <div class="space-y-6">
              <section class="space-y-3">
                <div>
                  <h3 class="text-[13px] font-semibold text-gray-900">System Action</h3>
                  <p class="mt-0.5 text-[11px] text-gray-500">
                    控制系统级动作开关，便于统一管理默认能力。
                  </p>
                </div>

                <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3">
                  <div
                    v-for="item in systemActionItems"
                    :key="item.id"
                    class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5"
                  >
                    <div class="min-w-0">
                      <p class="text-[12px] font-medium text-gray-900">{{ item.title }}</p>
                      <p class="mt-0.5 text-[10px] text-gray-400">系统内置能力，固定开启</p>
                    </div>
                    <span
                      class="inline-flex h-5 items-center rounded-full border border-emerald-300 bg-emerald-100 px-2 text-[10px] font-medium text-emerald-700"
                    >
                      强制开启
                    </span>
                  </div>
                </div>
              </section>

              <section class="border-t border-gray-200 pt-6">
                <div>
                  <h3 class="text-[13px] font-semibold text-gray-900">Functioncall</h3>
                  <p class="mt-0.5 text-[11px] text-gray-500">
                    控制具体 function call 能力，以及它们的执行模式。
                  </p>
                </div>

                <div class="mt-3 rounded-xl border border-gray-100 bg-gray-50/60 px-3">
                  <div
                    v-for="item in functionCallItems"
                    :key="item.id"
                    class="border-b border-gray-100 last:border-b-0"
                  >
                    <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5">
                      <div class="min-w-0">
                        <p class="text-[12px] font-medium text-gray-900">{{ item.title }}</p>
                        <p
                          v-if="workspaceStore.settingsScope === 'topic'"
                          class="mt-0.5 text-[10px]"
                          :class="subTextClass(isActionInherited(item.id))"
                        >
                          {{ isActionInherited(item.id) ? '继承助手默认值' : '当前话题已覆写' }}
                        </p>
                      </div>
                      <div class="flex items-center gap-2">
                        <button
                          class="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-all hover:border-gray-300 hover:bg-gray-100 hover:text-gray-700"
                          :aria-expanded="
                            workspaceStore.actionExpandedMap[item.id] ? 'true' : 'false'
                          "
                          aria-label="展开更多配置"
                          type="button"
                          @click="workspaceStore.toggleActionExpanded(item.id)"
                        >
                          <svg
                            class="h-3.5 w-3.5 transition-transform duration-200"
                            :class="
                              workspaceStore.actionExpandedMap[item.id] ? 'rotate-90' : 'rotate-0'
                            "
                            viewBox="0 0 20 20"
                            fill="none"
                          >
                            <path
                              d="M7 4.5L12.5 10L7 15.5"
                              stroke="currentColor"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="1.8"
                            />
                          </svg>
                        </button>
                        <button
                          class="relative inline-flex h-5 w-9 items-center rounded-full border transition-colors duration-200"
                          :class="
                            toggleTrackClass(
                              resolveActionEnabled(item.id),
                              isActionInherited(item.id)
                            )
                          "
                          type="button"
                          @click="toggleActionEnabled(item.id)"
                        >
                          <span
                            class="inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200"
                            :class="
                              toggleThumbClass(
                                resolveActionEnabled(item.id),
                                isActionInherited(item.id)
                              )
                            "
                          />
                        </button>
                      </div>
                    </div>

                    <Transition name="action-expand">
                      <div
                        v-if="workspaceStore.actionExpandedMap[item.id]"
                        class="mb-3 rounded-lg border border-dashed border-gray-200 bg-white px-3 py-3"
                      >
                        <p class="text-[11px] font-medium text-gray-700">基本配置</p>
                        <div class="mt-2 flex items-center justify-between gap-3">
                          <div>
                            <p class="text-[12px] font-medium text-gray-900">模式切换</p>
                            <p
                              class="mt-0.5 text-[11px]"
                              :class="
                                workspaceStore.settingsScope === 'topic' &&
                                workspaceStore.topicFunctionCallPubMedExecutionModeDraft ===
                                  'inherit'
                                  ? 'text-gray-400'
                                  : 'text-gray-500'
                              "
                            >
                              通过 fast / slow 控制检索速度和处理深度。
                            </p>
                          </div>
                          <div
                            class="inline-flex rounded-full border border-gray-200 bg-gray-100 p-0.5"
                          >
                            <button
                              v-for="mode in functionCallModeOptions"
                              :key="mode.value"
                              class="rounded-full px-2.5 py-1 text-[11px] transition-colors"
                              :class="
                                resolveFunctionCallMode(item.id) === mode.value
                                  ? 'bg-white font-medium text-gray-900 shadow-sm'
                                  : 'text-gray-500 hover:text-gray-700'
                              "
                              type="button"
                              @click="setFunctionCallMode(item.id, mode.value)"
                            >
                              {{ mode.label }}
                            </button>
                          </div>
                        </div>
                      </div>
                    </Transition>
                  </div>
                </div>
              </section>

              <section class="border-t border-gray-200 pt-6">
                <div>
                  <h3 class="text-[13px] font-semibold text-gray-900">MCP</h3>
                  <p class="mt-0.5 text-[11px] text-gray-500">
                    预留给 MCP 能力的统一入口，后续可继续扩展到更多服务。
                  </p>
                </div>

                <div class="mt-3 rounded-xl border border-gray-100 bg-gray-50/60 px-3">
                  <div
                    v-for="item in mcpActionItems"
                    :key="item.id"
                    class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5"
                  >
                    <div class="min-w-0">
                      <p class="text-[12px] font-medium text-gray-900">{{ item.title }}</p>
                      <p
                        v-if="workspaceStore.settingsScope === 'topic'"
                        class="mt-0.5 text-[10px]"
                        :class="subTextClass(isActionInherited(item.id))"
                      >
                        {{ isActionInherited(item.id) ? '继承助手默认值' : '当前话题已覆写' }}
                      </p>
                    </div>
                    <div class="flex items-center gap-2">
                      <button
                        class="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-all hover:border-gray-300 hover:bg-gray-100 hover:text-gray-700"
                        :aria-expanded="
                          workspaceStore.actionExpandedMap[item.id] ? 'true' : 'false'
                        "
                        aria-label="展开更多配置"
                        type="button"
                        @click="workspaceStore.toggleActionExpanded(item.id)"
                      >
                        <svg
                          class="h-3.5 w-3.5 transition-transform duration-200"
                          :class="
                            workspaceStore.actionExpandedMap[item.id] ? 'rotate-90' : 'rotate-0'
                          "
                          viewBox="0 0 20 20"
                          fill="none"
                        >
                          <path
                            d="M7 4.5L12.5 10L7 15.5"
                            stroke="currentColor"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1.8"
                          />
                        </svg>
                      </button>
                      <button
                        class="relative inline-flex h-5 w-9 items-center rounded-full border transition-colors duration-200"
                        :class="
                          toggleTrackClass(
                            resolveActionEnabled(item.id),
                            isActionInherited(item.id)
                          )
                        "
                        type="button"
                        @click="toggleActionEnabled(item.id)"
                      >
                        <span
                          class="inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200"
                          :class="
                            toggleThumbClass(
                              resolveActionEnabled(item.id),
                              isActionInherited(item.id)
                            )
                          "
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </template>

          <div v-else class="flex h-full items-center justify-center text-gray-400">
            {{ workspaceStore.currentSettingsLabel }} 分页保持原结构，当前轮暂未展开实现。
          </div>
        </section>
      </div>

      <div class="flex items-center justify-between border-t border-gray-100 bg-white px-6 py-4">
        <div class="text-[12px] text-gray-500">
          <span v-if="workspaceStore.settingsScope === 'assistant'">
            保存后会更新当前助手默认配置。
          </span>
          <span v-else>
            {{
              showActionPage
                ? '保存后会按当前范围写入助手默认值或话题覆写值，相同值会自动回到继承状态。'
                : '保存后只会修改当前话题已覆写的配置项，相同值会自动回到继承状态。'
            }}
          </span>
        </div>
        <div class="flex items-center gap-3">
          <button
            class="rounded-lg border border-gray-200 px-4 py-2 text-[14px] text-gray-600 transition-colors hover:bg-gray-50"
            type="button"
            @click="workspaceStore.closeAssistantSettings"
          >
            取消
          </button>
          <button
            class="rounded-lg bg-[var(--nc-accent)] px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-[var(--nc-accent-hover)]"
            type="button"
            @click="workspaceStore.saveSettings"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import WhiteSelect from '@renderer/views/LuminaApp/Maincontent/NormalChat/components/WhiteSelect.vue'
import { useModelConfigStore } from '@renderer/stores/model-config/store'
import { useNormalChatWorkspaceStore } from '@renderer/stores/normal-chat/workspace/workspace.store'

const workspaceStore = useNormalChatWorkspaceStore()
const modelConfigStore = useModelConfigStore()

const providers = computed(() => modelConfigStore.providers)
const showBasicPage = computed(() => workspaceStore.activeSettingsTab === 'basic')
const showModelPage = computed(() => workspaceStore.activeSettingsTab === 'model')
const showPromptPage = computed(() => workspaceStore.activeSettingsTab === 'prompt')
const showActionPage = computed(() => workspaceStore.activeSettingsTab === 'action')

interface ActionListItem {
  id: string
  title: string
}

const systemActionItems: ActionListItem[] = [
  { id: 'system-functioncall', title: '查询可用的 functioncall' },
  { id: 'system-subagent', title: '派发 subagent' }
]

const functionCallItems: ActionListItem[] = [{ id: 'functioncall-pubmed', title: 'PubMed 检索' }]

const mcpActionItems: ActionListItem[] = [{ id: 'mcp-default', title: 'MCP 能力接入' }]

const functionCallModeOptions = [
  { label: 'Fast', value: 'fast' as const },
  { label: 'Slow', value: 'slow' as const }
]

const topicPromptInherited = computed(
  () =>
    workspaceStore.settingsScope === 'topic' && workspaceStore.topicPromptModeDraft === 'inherit'
)
const topicStreamingInherited = computed(
  () =>
    workspaceStore.settingsScope === 'topic' && workspaceStore.topicStreamingModeDraft === 'inherit'
)
const topicCostInherited = computed(
  () => workspaceStore.settingsScope === 'topic' && workspaceStore.topicCostModeDraft === 'inherit'
)
const topicModelInherited = computed(
  () => workspaceStore.settingsScope === 'topic' && workspaceStore.topicModelModeDraft === 'inherit'
)
const topicContextMemoryInherited = computed(
  () =>
    workspaceStore.settingsScope === 'topic' &&
    workspaceStore.topicContextMemoryRoundsModeDraft === 'inherit'
)
const topicMaxRecursionDepthInherited = computed(
  () =>
    workspaceStore.settingsScope === 'topic' &&
    workspaceStore.topicMaxRecursionDepthModeDraft === 'inherit'
)
const topicMaxReasoningStepsInherited = computed(
  () =>
    workspaceStore.settingsScope === 'topic' &&
    workspaceStore.topicMaxReasoningStepsModeDraft === 'inherit'
)

const assistantNameModel = computed({
  get: () => workspaceStore.assistantNameDraft,
  set: (value: string) => {
    workspaceStore.setAssistantNameDraft(value)
  }
})

const assistantStreamingEnabledModel = computed({
  get: () => workspaceStore.assistantStreamingEnabledDraft,
  set: (value: boolean) => {
    workspaceStore.setAssistantStreamingEnabledDraft(value)
  }
})

const assistantCostModeModel = computed({
  get: () => workspaceStore.assistantCostModeDraft,
  set: (value: 'per_call' | 'per_token') => {
    workspaceStore.setAssistantCostModeDraft(value)
  }
})

const assistantDefaultModelProviderIdModel = computed({
  get: () => workspaceStore.assistantDefaultModelProviderIdDraft,
  set: (value: string | null) => {
    workspaceStore.setAssistantDefaultModelProviderIdDraft(value)
  }
})

const assistantPersistencePresetModel = computed({
  get: () => workspaceStore.assistantPersistencePresetDraft,
  set: (value: string | number | null) => {
    if (value !== 'light' && value !== 'full') {
      return
    }
    workspaceStore.setAssistantPersistencePresetDraft(value)
  }
})

const assistantDefaultModelIdModel = computed({
  get: () => workspaceStore.assistantDefaultModelIdDraft,
  set: (value: string | null) => {
    workspaceStore.setAssistantDefaultModelIdDraft(value)
  }
})

const assistantContextMemoryRoundsModel = computed({
  get: () => workspaceStore.assistantContextMemoryRoundsDraft,
  set: (value: number) => {
    workspaceStore.setAssistantContextMemoryRoundsDraft(value)
  }
})

const assistantMaxRecursionDepthModel = computed({
  get: () => workspaceStore.assistantMaxRecursionDepthDraft,
  set: (value: number) => {
    workspaceStore.setAssistantMaxRecursionDepthDraft(value)
  }
})

const assistantMaxReasoningStepsModel = computed({
  get: () => workspaceStore.assistantMaxReasoningStepsDraft,
  set: (value: number) => {
    workspaceStore.setAssistantMaxReasoningStepsDraft(value)
  }
})

const promptTextModel = computed({
  get: () =>
    workspaceStore.settingsScope === 'assistant'
      ? workspaceStore.assistantDefaultPromptDraft
      : workspaceStore.topicPromptDraft,
  set: (value: string) => {
    if (workspaceStore.settingsScope === 'assistant') {
      workspaceStore.setAssistantDefaultPromptDraft(value)
      return
    }

    workspaceStore.setTopicPromptDraft(value)
  }
})

const promptTokenCount = computed(() => {
  const content = promptTextModel.value.trim()
  if (!content) {
    return 0
  }

  return content.split(/\s+/).length
})

const costModeOptions = computed(() => [
  { label: '按 Token 优化', value: 'per_token' },
  { label: '按切换次数优化', value: 'per_call' }
])

const persistencePresetOptions = computed(() => [
  { label: '轻量持久化', value: 'light' },
  { label: '完整持久化', value: 'full' }
])

const resolvedCostModeModel = computed({
  get: () =>
    workspaceStore.settingsScope === 'assistant'
      ? assistantCostModeModel.value
      : (workspaceStore.topicCostModeOverrideDraft ?? workspaceStore.effectiveCostMode),
  set: (value: string | number | null) => {
    if (value !== 'per_call' && value !== 'per_token') {
      return
    }

    if (workspaceStore.settingsScope === 'assistant') {
      assistantCostModeModel.value = value
      return
    }

    workspaceStore.setTopicCostModeOverrideDraft(value)
  }
})

const resolvedContextMemoryRoundsModel = computed({
  get: () =>
    workspaceStore.settingsScope === 'assistant'
      ? assistantContextMemoryRoundsModel.value
      : (workspaceStore.topicContextMemoryRoundsOverrideDraft ??
        workspaceStore.effectiveContextMemoryRounds),
  set: (value: number) => {
    if (workspaceStore.settingsScope === 'assistant') {
      assistantContextMemoryRoundsModel.value = value
      return
    }

    workspaceStore.setTopicContextMemoryRoundsOverrideDraft(value)
  }
})

const resolvedMaxRecursionDepthModel = computed({
  get: () =>
    workspaceStore.settingsScope === 'assistant'
      ? assistantMaxRecursionDepthModel.value
      : (workspaceStore.topicMaxRecursionDepthOverrideDraft ??
        workspaceStore.effectiveMaxRecursionDepth),
  set: (value: number) => {
    if (workspaceStore.settingsScope === 'assistant') {
      assistantMaxRecursionDepthModel.value = value
      return
    }

    workspaceStore.setTopicMaxRecursionDepthOverrideDraft(value)
  }
})

const resolvedMaxReasoningStepsModel = computed({
  get: () =>
    workspaceStore.settingsScope === 'assistant'
      ? assistantMaxReasoningStepsModel.value
      : (workspaceStore.topicMaxReasoningStepsOverrideDraft ??
        workspaceStore.effectiveMaxReasoningSteps),
  set: (value: number) => {
    if (workspaceStore.settingsScope === 'assistant') {
      assistantMaxReasoningStepsModel.value = value
      return
    }

    workspaceStore.setTopicMaxReasoningStepsOverrideDraft(value)
  }
})

const resolvedModelProviderIdModel = computed({
  get: () =>
    workspaceStore.settingsScope === 'assistant'
      ? assistantDefaultModelProviderIdModel.value
      : (workspaceStore.topicModelProviderIdOverrideDraft ??
        workspaceStore.currentTopicModelSelection?.provider.id ??
        null),
  set: (value: string | number | null) => {
    const nextValue = typeof value === 'string' ? value : null
    if (workspaceStore.settingsScope === 'assistant') {
      assistantDefaultModelProviderIdModel.value = nextValue
      return
    }

    workspaceStore.setTopicModelProviderIdOverrideDraft(nextValue)
  }
})

const resolvedModelIdModel = computed({
  get: () =>
    workspaceStore.settingsScope === 'assistant'
      ? assistantDefaultModelIdModel.value
      : (workspaceStore.topicModelIdOverrideDraft ??
        workspaceStore.currentTopicModelSelection?.model.id ??
        null),
  set: (value: string | number | null) => {
    const nextValue = typeof value === 'string' ? value : null
    if (workspaceStore.settingsScope === 'assistant') {
      assistantDefaultModelIdModel.value = nextValue
      return
    }

    workspaceStore.setTopicModelIdOverrideDraft(nextValue)
  }
})

const currentModelOptions = computed(() => {
  const provider =
    providers.value.find((item) => item.id === resolvedModelProviderIdModel.value) ?? null
  return provider?.models ?? []
})

const providerOptions = computed(() =>
  providers.value.map((provider) => ({
    label: provider.name,
    value: provider.id
  }))
)

const modelOptions = computed(() =>
  currentModelOptions.value.map((model) => ({
    label: model.name || model.id,
    value: model.id
  }))
)

const streamingSummary = computed(() => {
  const enabled =
    workspaceStore.settingsScope === 'assistant'
      ? assistantStreamingEnabledModel.value
      : workspaceStore.effectiveStreamingEnabled

  return enabled ? '当前为开启流式' : '当前为关闭流式'
})

const resolvedStreamingSwitchClass = computed(() => {
  const enabled =
    workspaceStore.settingsScope === 'assistant'
      ? assistantStreamingEnabledModel.value
      : workspaceStore.effectiveStreamingEnabled

  return enabled ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 bg-gray-200'
})

const resolvedStreamingThumbClass = computed(() => {
  const enabled =
    workspaceStore.settingsScope === 'assistant'
      ? assistantStreamingEnabledModel.value
      : workspaceStore.effectiveStreamingEnabled

  return enabled ? 'translate-x-5' : 'translate-x-0'
})

function toggleStreaming(): void {
  if (workspaceStore.settingsScope === 'assistant') {
    assistantStreamingEnabledModel.value = !assistantStreamingEnabledModel.value
    return
  }

  workspaceStore.setTopicStreamingEnabledOverrideDraft(!workspaceStore.effectiveStreamingEnabled)
}

function resolveActionEnabled(id: string): boolean {
  switch (id) {
    case 'system-functioncall':
      return workspaceStore.settingsScope === 'assistant'
        ? workspaceStore.assistantSystemActionFunctionCallEnabledDraft
        : workspaceStore.topicSystemActionFunctionCallModeDraft === 'override'
          ? (workspaceStore.topicSystemActionFunctionCallEnabledOverrideDraft ??
            workspaceStore.assistantSystemActionFunctionCallEnabledDraft)
          : workspaceStore.assistantSystemActionFunctionCallEnabledDraft
    case 'system-subagent':
      return workspaceStore.settingsScope === 'assistant'
        ? workspaceStore.assistantSystemActionSubAgentEnabledDraft
        : workspaceStore.topicSystemActionSubAgentModeDraft === 'override'
          ? (workspaceStore.topicSystemActionSubAgentEnabledOverrideDraft ??
            workspaceStore.assistantSystemActionSubAgentEnabledDraft)
          : workspaceStore.assistantSystemActionSubAgentEnabledDraft
    case 'functioncall-pubmed':
      return workspaceStore.settingsScope === 'assistant'
        ? workspaceStore.assistantFunctionCallPubMedEnabledDraft
        : workspaceStore.topicFunctionCallPubMedModeDraft === 'override'
          ? (workspaceStore.topicFunctionCallPubMedEnabledOverrideDraft ??
            workspaceStore.assistantFunctionCallPubMedEnabledDraft)
          : workspaceStore.assistantFunctionCallPubMedEnabledDraft
    case 'mcp-default':
      return workspaceStore.settingsScope === 'assistant'
        ? workspaceStore.assistantMcpEnabledDraft
        : workspaceStore.topicMcpModeDraft === 'override'
          ? (workspaceStore.topicMcpEnabledOverrideDraft ?? workspaceStore.assistantMcpEnabledDraft)
          : workspaceStore.assistantMcpEnabledDraft
    default:
      return false
  }
}

function isActionInherited(id: string): boolean {
  if (workspaceStore.settingsScope !== 'topic') {
    return false
  }

  switch (id) {
    case 'system-functioncall':
      return workspaceStore.topicSystemActionFunctionCallModeDraft === 'inherit'
    case 'system-subagent':
      return workspaceStore.topicSystemActionSubAgentModeDraft === 'inherit'
    case 'functioncall-pubmed':
      return workspaceStore.topicFunctionCallPubMedModeDraft === 'inherit'
    case 'mcp-default':
      return workspaceStore.topicMcpModeDraft === 'inherit'
    default:
      return false
  }
}

function toggleActionEnabled(id: string): void {
  const nextValue = !resolveActionEnabled(id)

  switch (id) {
    case 'system-functioncall':
      if (workspaceStore.settingsScope === 'assistant') {
        workspaceStore.setAssistantSystemActionFunctionCallEnabledDraft(nextValue)
      } else {
        workspaceStore.setTopicSystemActionFunctionCallEnabledOverrideDraft(nextValue)
      }
      return
    case 'system-subagent':
      if (workspaceStore.settingsScope === 'assistant') {
        workspaceStore.setAssistantSystemActionSubAgentEnabledDraft(nextValue)
      } else {
        workspaceStore.setTopicSystemActionSubAgentEnabledOverrideDraft(nextValue)
      }
      return
    case 'functioncall-pubmed':
      if (workspaceStore.settingsScope === 'assistant') {
        workspaceStore.setAssistantFunctionCallPubMedEnabledDraft(nextValue)
      } else {
        workspaceStore.setTopicFunctionCallPubMedEnabledOverrideDraft(nextValue)
      }
      return
    case 'mcp-default':
      if (workspaceStore.settingsScope === 'assistant') {
        workspaceStore.setAssistantMcpEnabledDraft(nextValue)
      } else {
        workspaceStore.setTopicMcpEnabledOverrideDraft(nextValue)
      }
      return
    default:
      return
  }
}

function resolveFunctionCallMode(id: string): 'fast' | 'slow' {
  if (id === 'functioncall-pubmed') {
    return workspaceStore.settingsScope === 'assistant'
      ? workspaceStore.assistantFunctionCallPubMedModeDraft
      : workspaceStore.topicFunctionCallPubMedExecutionModeDraft === 'override'
        ? (workspaceStore.topicFunctionCallPubMedExecutionModeOverrideDraft ??
          workspaceStore.assistantFunctionCallPubMedModeDraft)
        : workspaceStore.assistantFunctionCallPubMedModeDraft
  }

  return 'fast'
}

function setFunctionCallMode(id: string, mode: 'fast' | 'slow'): void {
  if (id === 'functioncall-pubmed') {
    if (workspaceStore.settingsScope === 'assistant') {
      workspaceStore.setAssistantFunctionCallPubMedModeDraft(mode)
    } else {
      workspaceStore.setTopicFunctionCallPubMedExecutionModeOverrideDraft(mode)
    }
  }
}

function toggleTrackClass(enabled: boolean | undefined, inherited = false): string {
  if (inherited) {
    return enabled ? 'border-emerald-300 bg-emerald-200/80' : 'border-gray-300 bg-gray-200'
  }

  return enabled ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 bg-gray-200'
}

function toggleThumbClass(enabled: boolean | undefined, inherited = false): string {
  const translateClass = enabled ? 'translate-x-4' : 'translate-x-0'
  return inherited ? `${translateClass} opacity-80` : translateClass
}

// 这些样式函数只负责把“继承态”渲染成灰色，让页面语义和 store 的继承状态保持一致。
function inputClass(inherited: boolean): string {
  return inherited
    ? 'border-gray-200 bg-gray-100/80 text-gray-400'
    : 'border-gray-200 bg-white text-gray-800 focus:border-emerald-300'
}

function textareaClass(inherited: boolean): string {
  return inherited
    ? 'border-gray-200 bg-gray-100/80 text-gray-400'
    : 'border-gray-200 bg-white text-gray-700 focus:border-emerald-300'
}

function panelClass(inherited: boolean): string {
  return inherited ? 'border-gray-200 bg-gray-100/80' : 'border-emerald-100 bg-white'
}

function textClass(inherited: boolean): string {
  return inherited ? 'text-gray-400' : 'text-gray-800'
}

function subTextClass(inherited: boolean): string {
  return inherited ? 'text-gray-400' : 'text-gray-500'
}
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;

.action-expand-enter-active,
.action-expand-leave-active {
  overflow: hidden;
  transition:
    opacity 180ms ease,
    transform 180ms ease,
    max-height 220ms ease,
    margin 180ms ease;
}

.action-expand-enter-from,
.action-expand-leave-to {
  opacity: 0;
  transform: translateY(-6px);
  max-height: 0;
}

.action-expand-enter-to,
.action-expand-leave-from {
  opacity: 1;
  transform: translateY(0);
  max-height: 220px;
}
</style>
