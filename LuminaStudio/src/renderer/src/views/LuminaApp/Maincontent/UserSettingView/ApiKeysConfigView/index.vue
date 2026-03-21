<template>
  <div class="us-apikeys-view flex flex-col h-full overflow-hidden bg-slate-50">
    <div class="apikeys-header border-b border-slate-200 bg-white p-6 shadow-sm">
      <div class="max-w-5xl mx-auto">
        <button
          type="button"
          class="apikeys-back-button inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors mb-4"
          @click="$emit('back')"
        >
          <svg
            class="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          返回
        </button>
        <h1 class="apikeys-title text-2xl font-bold text-slate-900">秘钥管理</h1>
        <p class="apikeys-subtitle text-sm text-slate-500 mt-2">
          统一管理 API Key registry。这里可以为同一个 provider
          保存多条可引用密钥，供后续节点通过引用 ID 使用。
        </p>
      </div>
    </div>

    <div class="apikeys-content flex-1 overflow-auto p-6">
      <div class="max-w-5xl mx-auto space-y-6">
        <div v-if="isLoading" class="flex items-center justify-center py-12 text-slate-500">
          加载中...
        </div>

        <template v-else>
          <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
            <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 class="text-lg font-semibold text-slate-900">API Key 条目列表</h2>
                  <p class="mt-1 text-sm text-slate-500">
                    每条 entry 都有独立 id，可按 provider_id 归类，并单独启用或停用。
                  </p>
                </div>
                <button
                  type="button"
                  class="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                  @click="handleAddEntry"
                >
                  新增条目
                </button>
              </div>

              <div
                v-if="filteredEntries.length === 0"
                class="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center"
              >
                <p class="text-sm font-medium text-slate-700">当前没有匹配的 API Key 条目</p>
                <p class="mt-2 text-xs text-slate-500">
                  可以先新增一条 entry，或切换右侧 provider 筛选查看其他条目。
                </p>
              </div>

              <div v-else class="mt-6 space-y-4">
                <article
                  v-for="entry in filteredEntries"
                  :key="entry.id"
                  class="rounded-2xl border border-slate-200 bg-slate-50/70 p-5"
                >
                  <div class="grid gap-4 lg:grid-cols-2">
                    <div>
                      <label
                        class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        条目标签
                      </label>
                      <input
                        v-model="entry.label"
                        type="text"
                        placeholder="例如：PubMed 主账号 / 备用 key"
                        class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        @input="markAsModified"
                      />
                    </div>

                    <div>
                      <label
                        class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        Provider ID
                      </label>
                      <WhiteSelect
                        v-model="entry.provider_id"
                        :options="providerOptions"
                        placeholder="请选择 Provider"
                        trigger-class="rounded-lg border-slate-300 px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500"
                        panel-class="rounded-lg"
                        teleport-to="body"
                        @change="handleProviderChange(entry)"
                      />
                    </div>

                    <div class="lg:col-span-2">
                      <div class="mb-1.5 flex items-center justify-between gap-3">
                        <label
                          class="block text-xs font-semibold uppercase tracking-wide text-slate-500"
                        >
                          API Key
                        </label>
                        <button
                          type="button"
                          class="text-xs text-slate-500 transition hover:text-slate-700"
                          @click="toggleEntryVisibility(entry.id)"
                        >
                          {{ visibleEntryIds.has(entry.id) ? '隐藏明文' : '显示明文' }}
                        </button>
                      </div>
                      <input
                        v-model="entry.api_key"
                        :type="visibleEntryIds.has(entry.id) ? 'text' : 'password'"
                        placeholder="请输入 API Key"
                        class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        @input="markAsModified"
                      />
                      <p class="mt-2 text-xs text-slate-500">
                        明文 key 只在当前设置页维护。节点面板后续应只保存
                        api_key_ref_id，不直接编辑明文。
                      </p>
                    </div>
                  </div>

                  <div
                    class="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span class="rounded-full bg-slate-200 px-2.5 py-1 font-mono text-slate-700">
                        {{ entry.id }}
                      </span>
                      <span>创建：{{ formatTimestamp(entry.created_at) }}</span>
                      <span>更新：{{ formatTimestamp(entry.updated_at) }}</span>
                    </div>

                    <div class="flex items-center gap-3">
                      <label class="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input
                          v-model="entry.enabled"
                          type="checkbox"
                          class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          @change="markAsModified"
                        />
                        启用此条目
                      </label>
                      <button
                        type="button"
                        class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-100"
                        @click="handleRemoveEntry(entry.id)"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </article>
              </div>
            </section>

            <aside class="space-y-4">
              <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 class="text-base font-semibold text-slate-900">Provider 筛选</h3>
                <p class="mt-1 text-xs leading-5 text-slate-500">
                  现有接口直接返回完整 registry，当前页面在前端按 provider_id
                  做筛选与分组，足够支持引用选择场景。
                </p>
                <div class="mt-4">
                  <WhiteSelect
                    v-model="selectedProviderFilter"
                    :options="filterSelectOptions"
                    placeholder="请选择 Provider"
                    trigger-class="rounded-xl border-slate-300 px-3 py-2.5 text-sm text-slate-800"
                    panel-class="rounded-xl"
                    teleport-to="body"
                  />
                </div>
              </section>

              <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 class="text-base font-semibold text-slate-900">使用说明</h3>
                <ul class="mt-3 space-y-2 text-xs leading-5 text-slate-500">
                  <li>1. provider_id 用来标识密钥归属，例如 pubmed。</li>
                  <li>2. label 用来区分同一 provider 下的多条 key。</li>
                  <li>3. 保存时会统一写入 entries 数组，并由主进程补齐更新时间。</li>
                </ul>
              </section>
            </aside>
          </div>

          <div class="flex items-center gap-3 justify-end">
            <button
              type="button"
              class="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              :disabled="!isModified || isSaving"
              @click="handleReset"
            >
              重置
            </button>
            <button
              type="button"
              class="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!isModified || isSaving"
              @click="handleSave"
            >
              {{ isSaving ? '保存中...' : '保存' }}
            </button>
          </div>

          <div
            v-if="showSuccessMessage"
            class="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700"
          >
            <svg
              class="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            保存成功
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import WhiteSelect from '@renderer/components/WhiteSelect/index.vue'
import { useUserConfigStore } from '@renderer/stores/user-config/store'
import type { ApiKeyEntry } from '@preload/types'

defineEmits<{
  (e: 'back'): void
}>()

interface ApiKeyEntryForm extends ApiKeyEntry {}

const providerOptions = [
  { value: 'pubmed', label: 'PubMed' },
  { value: 'arxiv', label: 'Arxiv' },
  { value: 'crossref', label: 'Crossref' },
  { value: 'custom', label: '自定义 / 其他' }
]

const userConfigStore = useUserConfigStore()

// 状态管理
const isLoading = computed(() => userConfigStore.isLoading)
const isSaving = computed(() => userConfigStore.isSaving)
const isModified = ref(false)
const showSuccessMessage = ref(false)
const selectedProviderFilter = ref<'all' | string>('all')
const visibleEntryIds = ref<Set<string>>(new Set())

// 表单数据
const formEntries = ref<ApiKeyEntryForm[]>([])
const originalEntries = ref<ApiKeyEntryForm[]>([])

function cloneEntries(entries: ApiKeyEntry[]): ApiKeyEntryForm[] {
  return entries.map((entry) => ({ ...entry }))
}

function createEntryId(): string {
  return `apikey_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function createDraftEntry(providerId = 'pubmed'): ApiKeyEntryForm {
  const now = new Date().toISOString()
  const matchedProvider = providerOptions.find((item) => item.value === providerId)

  return {
    id: createEntryId(),
    provider_id: providerId,
    label: matchedProvider ? `${matchedProvider.label} 新条目` : '新条目',
    api_key: '',
    enabled: true,
    created_at: now,
    updated_at: now
  }
}

const filterSelectOptions = computed(() => {
  const providerCounts = new Map<string, number>()

  userConfigStore.apiKeyEntries.forEach((entry) => {
    providerCounts.set(entry.provider_id, (providerCounts.get(entry.provider_id) || 0) + 1)
  })

  return [
    {
      value: 'all',
      label: `全部 provider (${userConfigStore.apiKeyEntries.length})`
    },
    ...Array.from(providerCounts.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([providerId, count]) => ({
        value: providerId,
        // WhiteSelect 只认 label/value，所以这里把数量直接拼进展示文案里。
        label: `${providerId} (${count})`
      }))
  ]
})

const filteredEntries = computed(() => {
  if (selectedProviderFilter.value === 'all') {
    return formEntries.value
  }

  return formEntries.value.filter((entry) => entry.provider_id === selectedProviderFilter.value)
})

async function loadApiKeys(): Promise<void> {
  await userConfigStore.fetchApiKeys()
  formEntries.value = cloneEntries(userConfigStore.apiKeyEntries)
  originalEntries.value = cloneEntries(userConfigStore.apiKeyEntries)
}

function markAsModified(): void {
  isModified.value = true
  showSuccessMessage.value = false
}

function handleAddEntry(): void {
  formEntries.value.unshift(createDraftEntry())
  markAsModified()
}

function handleRemoveEntry(entryId: string): void {
  formEntries.value = formEntries.value.filter((entry) => entry.id !== entryId)
  visibleEntryIds.value.delete(entryId)
  markAsModified()
}

function handleProviderChange(entry: ApiKeyEntryForm): void {
  // 当用户只改了 provider，自动补一个更容易识别的默认标签，
  // 但如果他已经自定义过标签，就保留原值不覆盖。
  const matchedProvider = providerOptions.find((item) => item.value === entry.provider_id)
  if (!entry.label.trim() || entry.label.endsWith('新条目')) {
    entry.label = matchedProvider ? `${matchedProvider.label} 新条目` : '新条目'
  }
  markAsModified()
}

function toggleEntryVisibility(entryId: string): void {
  const nextVisibleIds = new Set(visibleEntryIds.value)
  if (nextVisibleIds.has(entryId)) {
    nextVisibleIds.delete(entryId)
  } else {
    nextVisibleIds.add(entryId)
  }
  visibleEntryIds.value = nextVisibleIds
}

function buildPayloadEntries(): ApiKeyEntry[] {
  const now = new Date().toISOString()

  return formEntries.value
    .map((entry) => ({
      ...entry,
      provider_id: entry.provider_id.trim(),
      label: entry.label.trim(),
      api_key: entry.api_key.trim(),
      updated_at: now
    }))
    .filter((entry) => entry.provider_id && entry.api_key)
}

async function handleSave(): Promise<void> {
  await userConfigStore.updateApiKeys({
    entries: buildPayloadEntries()
  })

  formEntries.value = cloneEntries(userConfigStore.apiKeyEntries)
  originalEntries.value = cloneEntries(userConfigStore.apiKeyEntries)
  isModified.value = false
  showSuccessMessage.value = true

  window.setTimeout(() => {
    showSuccessMessage.value = false
  }, 3000)
}

function handleReset(): void {
  formEntries.value = cloneEntries(originalEntries.value)
  isModified.value = false
  showSuccessMessage.value = false
}

function formatTimestamp(value: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

onMounted(() => {
  loadApiKeys()
})

watch(
  () => userConfigStore.apiKeyEntries,
  (nextEntries) => {
    if (!isModified.value) {
      formEntries.value = cloneEntries(nextEntries)
      originalEntries.value = cloneEntries(nextEntries)
    }
  },
  { deep: true }
)
</script>

<style scoped>
/* 当前页面样式主要由 Tailwind 承担，这里暂不补充额外样式。 */
</style>
