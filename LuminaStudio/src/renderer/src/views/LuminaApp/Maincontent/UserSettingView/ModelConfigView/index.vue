<template>
  <div
    class="usersetting-model-config flex h-full w-full overflow-hidden bg-[linear-gradient(180deg,_#fbfcfe_0%,_#f6f8fb_100%)] text-slate-800"
  >
    <aside
      class="w-72 shrink-0 border-r border-slate-200 bg-white px-4 py-4 shadow-[2px_0_18px_rgba(15,23,42,0.04)]"
    >
      <div class="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div class="rounded-2xl bg-slate-900 p-2 text-white">
          <svg
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
            <path d="M9 9h6v6H9z" />
          </svg>
        </div>
        <div>
          <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            User Setting
          </div>
          <div class="text-lg font-bold text-slate-900">模型管理</div>
        </div>
      </div>

      <div class="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
        模型服务商
      </div>
      <div class="mt-3 flex flex-col gap-2 overflow-y-auto">
        <button
          v-for="provider in providers"
          :key="provider.id"
          type="button"
          class="group rounded-2xl border px-4 py-3 text-left transition-all"
          :class="
            selectedProviderId === provider.id
              ? 'border-cyan-200 bg-cyan-50/70 shadow-sm'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
          "
          @click="selectProvider(provider.id)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="truncate text-[13px] font-semibold text-slate-900">
                {{ provider.name }}
              </div>
              <div class="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                <span
                  class="h-2 w-2 rounded-full"
                  :class="provider.enabled ? 'bg-emerald-500' : 'bg-slate-300'"
                ></span>
                {{ provider.type }} / {{ provider.apiMode }}
              </div>
            </div>
            <button
              class="rounded-full p-1.5 text-slate-400 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
              title="删除提供商"
              @click.stop="handleDeleteProvider(provider.id)"
            >
              <svg
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              </svg>
            </button>
          </div>
        </button>
      </div>

      <button
        type="button"
        class="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-cyan-300 hover:text-cyan-700"
        @click="isAddProviderModalOpen = true"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
        添加提供商
      </button>
    </aside>

    <main class="min-w-0 flex-1 overflow-y-auto px-8 py-8">
      <div v-if="selectedProvider" class="mx-auto flex max-w-5xl flex-col gap-8 pb-16">
        <section class="space-y-4">
          <div class="flex items-center gap-2">
            <div class="rounded-2xl bg-cyan-100 p-2 text-cyan-700">
              <svg
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M12 3v6" />
                <path d="M12 15v6" />
                <path d="M5.64 5.64l4.24 4.24" />
                <path d="m14.12 14.12 4.24 4.24" />
                <path d="M3 12h6" />
                <path d="M15 12h6" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div>
              <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                服务配置
              </div>
              <div class="text-lg font-bold text-slate-900">{{ selectedProvider.name }}</div>
            </div>
          </div>

          <div class="grid gap-4 xl:grid-cols-2">
            <article class="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
              <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                API Key
              </div>
              <input
                v-model="apiKeyDraft"
                type="password"
                class="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-800 outline-none focus:border-cyan-500"
                placeholder="sk-..."
                @blur="handleApiKeyBlur"
              />
            </article>

            <article class="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
              <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                API Host URL
              </div>
              <input
                v-model="baseUrlDraft"
                type="text"
                class="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-800 outline-none focus:border-cyan-500"
                placeholder="https://api.openai.com"
                @blur="handleBaseUrlBlur"
              />
              <div
                class="mt-3 space-y-1 rounded-2xl bg-slate-50 px-4 py-3 font-mono text-[11px] text-slate-500"
              >
                <div>Models: {{ computedModelsEndpoint || '-' }}</div>
                <div>Chat: {{ computedChatEndpoint || '-' }}</div>
                <div>Completion: {{ computedCompletionEndpoint || '-' }}</div>
                <div>Responses: {{ computedResponsesEndpoint || '-' }}</div>
              </div>
            </article>
          </div>
        </section>

        <section class="space-y-4">
          <div class="flex items-center gap-2">
            <div class="rounded-2xl bg-violet-100 p-2 text-violet-700">
              <svg
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M4 6h16" />
                <path d="M7 12h10" />
                <path d="M10 18h4" />
              </svg>
            </div>
            <div>
              <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Provider API Mode
              </div>
              <div class="text-lg font-bold text-slate-900">
                OpenAI Responses / Chat Completions
              </div>
            </div>
          </div>

          <div class="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
            <div class="grid gap-3 md:grid-cols-3">
              <button
                v-for="mode in apiModes"
                :key="mode.id"
                type="button"
                class="rounded-2xl border px-4 py-4 text-left transition-all"
                :class="
                  selectedProvider.apiMode === mode.id
                    ? 'border-cyan-200 bg-cyan-50/70 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                "
                @click="handleApiModeSelect(mode.id)"
              >
                <div class="text-[13px] font-semibold text-slate-900">{{ mode.label }}</div>
                <div class="mt-2 text-xs leading-5 text-slate-500">{{ mode.description }}</div>
              </button>
            </div>
          </div>
        </section>

        <section class="space-y-4">
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-2">
              <div class="rounded-2xl bg-emerald-100 p-2 text-emerald-700">
                <svg
                  class="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
                  />
                </svg>
              </div>
              <div>
                <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  模型列表
                </div>
                <div class="text-lg font-bold text-slate-900">
                  {{ selectedProvider.models.length }} 个已订阅模型
                </div>
              </div>
            </div>
            <div class="flex gap-2">
              <button
                type="button"
                class="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300"
                @click="handleOpenManageModels"
              >
                管理模型
              </button>
              <button
                type="button"
                class="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
                @click="isAddModelModalOpen = true"
              >
                手动添加
              </button>
            </div>
          </div>

          <div class="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div v-if="groupedModels.length" class="divide-y divide-slate-100">
              <div v-for="[groupName, models] in groupedModels" :key="groupName" class="px-5 py-4">
                <div class="flex items-center gap-2">
                  <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {{ groupName }}
                  </div>
                  <span
                    class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500"
                  >
                    {{ models.length }}
                  </span>
                </div>
                <div class="mt-3 flex flex-col gap-2">
                  <div
                    v-for="model in models"
                    :key="model.id"
                    class="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3"
                  >
                    <div class="min-w-0">
                      <div class="truncate font-mono text-xs text-slate-500">{{ model.id }}</div>
                      <div class="truncate text-sm font-semibold text-slate-900">
                        {{ model.name }}
                      </div>
                    </div>
                    <button
                      type="button"
                      class="rounded-full p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      @click="removeModel(model.id)"
                    >
                      <svg
                        class="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path d="M5 12h14" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="px-5 py-10 text-center text-sm text-slate-400">
              暂无模型，点击“管理模型”从 API 拉取或手动添加。
            </div>
          </div>
        </section>
      </div>

      <div
        v-else
        class="mx-auto flex h-full max-w-3xl items-center justify-center text-sm text-slate-400"
      >
        请先添加模型服务商。
      </div>
    </main>

    <div
      v-if="isManageModelsModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/28 p-4 backdrop-blur-sm"
      @click="isManageModelsModalOpen = false"
    >
      <div
        class="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        @click.stop
      >
        <div class="border-b border-slate-100 px-6 py-5">
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                模型列表
              </div>
              <div class="mt-1 text-lg font-bold text-slate-900">从 API 获取并管理模型</div>
            </div>
            <button
              class="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              @click="isManageModelsModalOpen = false"
            >
              <svg
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
          <input
            v-model="modelSearchQuery"
            type="text"
            placeholder="搜索模型 ID 或分组..."
            class="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-cyan-500"
          />
        </div>
        <div class="flex-1 overflow-y-auto bg-slate-50/70 p-5">
          <div
            v-if="isLoadingModels"
            class="flex h-56 items-center justify-center text-sm text-slate-400"
          >
            正在连接 API 获取模型列表...
          </div>
          <div v-else class="space-y-4">
            <div
              v-if="modelSearchQuery && filteredModelGroups.length === 0"
              class="rounded-3xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400 shadow-sm"
            >
              未找到匹配模型。
            </div>
            <div
              v-for="[groupName, models] in filteredModelGroups"
              :key="groupName"
              class="rounded-3xl border border-slate-200 bg-white shadow-sm"
            >
              <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div class="flex items-center gap-2">
                  <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {{ groupName }}
                  </div>
                  <span
                    class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500"
                  >
                    {{ models.length }}
                  </span>
                </div>
                <button
                  type="button"
                  class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-cyan-700 transition-colors hover:border-cyan-300"
                  @click="
                    isGroupFullyAdded(groupName, models)
                      ? handleRemoveGroupModels(groupName, models)
                      : handleAddGroupModels(groupName, models)
                  "
                >
                  {{ isGroupFullyAdded(groupName, models) ? '取消订阅整组' : '添加整组' }}
                </button>
              </div>
              <div class="space-y-2 px-4 py-4">
                <div
                  v-for="model in models"
                  :key="model.id"
                  class="flex items-center justify-between rounded-2xl px-3 py-3"
                  :class="isModelAdded(model.id) ? 'bg-cyan-50/70' : 'bg-slate-50'"
                >
                  <div class="min-w-0">
                    <div class="truncate font-mono text-xs text-slate-500">{{ model.id }}</div>
                    <div class="text-[11px] text-slate-400">
                      Created: {{ new Date(model.created * 1000).toLocaleDateString() }}
                    </div>
                  </div>
                  <button
                    type="button"
                    class="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
                    :class="
                      isModelAdded(model.id)
                        ? 'border-rose-200 bg-white text-rose-700 hover:border-rose-300'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    "
                    @click="
                      isModelAdded(model.id)
                        ? handleRemoveSingleModel(model.id)
                        : handleAddSingleModel(model)
                    "
                  >
                    {{ isModelAdded(model.id) ? '取消订阅' : '添加模型' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="isAddModelModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/24 p-4 backdrop-blur-sm"
      @click="isAddModelModalOpen = false"
    >
      <div
        class="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
        @click.stop
      >
        <div class="text-lg font-bold text-slate-900">手动添加模型</div>
        <div class="mt-4 space-y-4">
          <input
            v-model="newModelForm.id"
            type="text"
            placeholder="模型 ID"
            class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-500"
          />
          <input
            v-model="newModelForm.name"
            type="text"
            placeholder="显示名称"
            class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-500"
          />
          <input
            v-model="newModelForm.group"
            type="text"
            placeholder="分组，可为空"
            class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-500"
          />
        </div>
        <div class="mt-6 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
            @click="isAddModelModalOpen = false"
          >
            取消
          </button>
          <button
            type="button"
            class="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            @click="handleManualAddModel()"
          >
            添加
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="isAddProviderModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/24 p-4 backdrop-blur-sm"
      @click="isAddProviderModalOpen = false"
    >
      <div
        class="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl"
        @click.stop
      >
        <div class="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Add Provider
            </div>
            <div class="mt-1 text-lg font-bold text-slate-900">添加模型服务商</div>
          </div>
          <button
            class="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            @click="isAddProviderModalOpen = false"
          >
            <svg
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div class="space-y-4 px-6 py-6">
          <div class="grid gap-2">
            <button
              v-for="type in providerTypes"
              :key="type.id"
              type="button"
              class="rounded-2xl border px-4 py-4 text-left transition-all"
              :class="
                newProviderForm.type === type.id
                  ? 'border-cyan-200 bg-cyan-50/70 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              "
              @click="newProviderForm.type = type.id"
            >
              <div class="text-[13px] font-semibold text-slate-900">{{ type.name }}</div>
              <div class="mt-1 text-xs text-slate-500">{{ type.description }}</div>
            </button>
          </div>
          <input
            v-model="newProviderForm.name"
            type="text"
            placeholder="例如：OpenAI Primary"
            class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-500"
          />
        </div>
        <div class="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
            @click="isAddProviderModalOpen = false"
          >
            取消
          </button>
          <button
            type="button"
            class="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            @click="handleAddProvider()"
          >
            添加
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useModelConfigStore } from '@renderer/stores/model-config/store'
import type { Model, ProviderApiMode } from '@renderer/stores/model-config/types'

defineEmits<{ (e: 'back'): void }>()

const store = useModelConfigStore()
const {
  providers,
  selectedProviderId,
  selectedProvider,
  isAddProviderModalOpen,
  isAddModelModalOpen,
  isManageModelsModalOpen,
  isLoadingModels,
  remoteModelGroups,
  newProviderForm,
  newModelForm
} = storeToRefs(store)

const providerTypes = [
  { id: 'openai', name: 'OpenAI Compatible', description: '支持标准 OpenAI 协议与兼容服务。' },
  { id: 'custom', name: 'Custom Provider', description: '保留自定义 Provider 协议位。' }
] as const

const apiModes: Array<{ id: ProviderApiMode; label: string; description: string }> = [
  {
    id: 'auto',
    label: 'Auto',
    description: 'OpenAI Provider 默认走 Responses，自定义 Provider 默认走 Chat Completions。'
  },
  { id: 'responses', label: 'Responses', description: '强制走 OpenAI Responses API。' },
  {
    id: 'chat-completions',
    label: 'Chat Completions',
    description: '强制走 Chat Completions API。'
  }
]

const apiKeyDraft = ref('')
const baseUrlDraft = ref('')
const modelSearchQuery = ref('')

const groupedModels = computed(() => {
  if (!selectedProvider.value?.models.length) return []
  const groups: Record<string, Model[]> = {}
  selectedProvider.value.models.forEach((model) => {
    const key = model.group || 'default'
    if (!groups[key]) groups[key] = []
    groups[key].push(model)
  })
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
})

const filteredModelGroups = computed(() => {
  const query = modelSearchQuery.value.trim().toLowerCase()
  if (!query) return Object.entries(remoteModelGroups.value)
  return Object.entries(remoteModelGroups.value)
    .map(
      ([groupName, models]) =>
        [
          groupName,
          models.filter(
            (model) =>
              groupName.toLowerCase().includes(query) || model.id.toLowerCase().includes(query)
          )
        ] as [string, typeof models]
    )
    .filter(([, models]) => models.length > 0)
})

const computedModelsEndpoint = computed(() => endpoint('models'))
const computedChatEndpoint = computed(() => endpoint('chat/completions'))
const computedCompletionEndpoint = computed(() => endpoint('completions'))
const computedResponsesEndpoint = computed(() => endpoint('responses'))

function endpoint(suffix: string): string {
  if (!baseUrlDraft.value) return ''
  return `${baseUrlDraft.value.trim().replace(/\/$/, '')}/v1/${suffix}`
}

watch(
  selectedProvider,
  (provider) => {
    apiKeyDraft.value = provider?.apiKey || ''
    baseUrlDraft.value = provider?.baseUrl || ''
  },
  { immediate: true }
)

onMounted(async () => {
  await store.fetchProviders()
})

async function selectProvider(id: string) {
  await store.selectProvider(id)
}

async function handleDeleteProvider(id: string) {
  if (confirm('确定要删除该提供商吗？')) {
    await store.handleDeleteProvider(id)
  }
}

async function handleOpenManageModels() {
  await store.openManageModels()
}

async function handleApiKeyBlur() {
  if (!selectedProviderId.value) return
  await store.updateProviderApiKey(selectedProviderId.value, apiKeyDraft.value)
}

async function handleBaseUrlBlur() {
  if (!selectedProviderId.value) return
  await store.updateProviderBaseUrl(selectedProviderId.value, baseUrlDraft.value)
}

async function handleApiModeSelect(mode: ProviderApiMode) {
  if (!selectedProviderId.value) return
  await store.updateProviderApiMode(selectedProviderId.value, mode)
}

async function removeModel(modelId: string) {
  await store.removeModel(modelId)
}

function isModelAdded(modelId: string): boolean {
  return selectedProvider.value?.models.some((model) => model.id === modelId) || false
}

function isGroupFullyAdded(_groupName: string, models: any[]): boolean {
  return models.every((model) => isModelAdded(model.id))
}

async function handleAddSingleModel(model: any) {
  await store.addSingleRemoteModel(model)
}

async function handleRemoveSingleModel(modelId: string) {
  await store.removeSingleRemoteModel(modelId)
}

async function handleAddGroupModels(groupName: string, models: any[]) {
  await store.addGroupModels(groupName, models)
}

async function handleRemoveGroupModels(groupName: string, models: any[]) {
  await store.removeGroupModels(groupName, models)
}

async function handleManualAddModel() {
  await store.handleManualAddModel()
}

async function handleAddProvider() {
  await store.handleAddProvider()
}
</script>
