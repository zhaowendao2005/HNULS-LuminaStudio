<template>
  <div class="us-devpage-knowledge flex h-full min-h-0 flex-col gap-4 overflow-hidden p-4">
    <section
      class="us-devpage-card flex items-center justify-between gap-4 rounded-2xl border px-5 py-4 shadow-sm"
    >
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-slate-900">知识库检索调试</h2>
        <p class="text-sm text-slate-500">
          选择知识库范围、加载文档状态并执行真实
          RAG。上半区负责资源选择，下半区负责检索执行和结果检查。
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
          @click="handleRefreshResources"
        >
          刷新资源
        </button>
        <button
          type="button"
          class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
          @click="knowledgeDebugStore.resetAllSelections"
        >
          重置选择
        </button>
      </div>
    </section>

    <div class="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <section
        class="us-devpage-card flex min-h-0 flex-col overflow-hidden rounded-2xl border shadow-sm"
      >
        <div class="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 class="text-base font-semibold text-slate-900">资源范围</h3>
            <p class="mt-1 text-xs text-slate-500">
              展开知识库后可按需加载文档，文档状态沿用检索面板语义。
            </p>
          </div>

          <WhiteSelect
            v-model="documentStatusFilterModel"
            :options="knowledgeDebugDocumentStatusOptions"
            placeholder="文档状态筛选"
            trigger-class="min-w-40 rounded-xl border-slate-200 px-3 py-2 text-sm"
            panel-class="rounded-xl"
            teleport-to="body"
          />
        </div>

        <div
          v-if="knowledgeDebugStore.knowledgeBasesError"
          class="border-b border-rose-200 bg-rose-50 px-5 py-3 text-xs text-rose-700"
        >
          {{ knowledgeDebugStore.knowledgeBasesError }}
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto p-4">
          <div v-if="knowledgeDebugStore.knowledgeBasesLoading" class="py-16 text-center">
            <p class="text-sm text-slate-500">正在加载知识库...</p>
          </div>

          <div v-else class="space-y-3">
            <article
              v-for="knowledgeBase in knowledgeDebugStore.knowledgeBases"
              :key="knowledgeBase.id"
              class="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <button
                type="button"
                class="flex w-full items-start gap-3 p-4 text-left transition hover:bg-slate-50"
                @click="knowledgeDebugStore.toggleKnowledgeBaseExpanded(knowledgeBase.id)"
              >
                <span
                  class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold"
                  :class="
                    knowledgeBase.selected
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                      : 'border-slate-200 bg-slate-100 text-slate-500'
                  "
                  @click.stop="knowledgeDebugStore.toggleKnowledgeBaseSelection(knowledgeBase.id)"
                >
                  {{ knowledgeBase.selected ? '✓' : '' }}
                </span>

                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <h4 class="truncate text-sm font-semibold text-slate-900">
                      {{ knowledgeBase.name }}
                    </h4>
                    <span
                      class="rounded-full border px-2 py-0.5 text-[10px] font-medium text-slate-500"
                    >
                      KB #{{ knowledgeBase.id }}
                    </span>
                    <span
                      v-if="knowledgeBase.documentsLoaded"
                      class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500"
                    >
                      {{ knowledgeBase.documents.length }} docs
                    </span>
                  </div>
                  <p class="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                    {{ knowledgeBase.description || '暂无描述' }}
                  </p>
                </div>

                <div class="flex shrink-0 items-center gap-2">
                  <span
                    class="rounded-full border px-2.5 py-1 text-[10px] font-medium"
                    :class="
                      knowledgeBase.selected
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-slate-100 text-slate-500'
                    "
                  >
                    {{ knowledgeBase.selected ? '已选中' : '未选中' }}
                  </span>
                  <svg
                    class="h-4 w-4 text-slate-400 transition-transform"
                    :class="knowledgeBase.expanded ? 'rotate-180' : 'rotate-0'"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </button>

              <div
                v-if="knowledgeBase.expanded"
                class="border-t border-slate-200 bg-slate-50/60 p-4"
              >
                <div v-if="knowledgeBase.loadingDocuments" class="py-8 text-center">
                  <p class="text-sm text-slate-500">正在加载文档...</p>
                </div>

                <div
                  v-else-if="visibleDocuments(knowledgeBase).length === 0"
                  class="py-8 text-center"
                >
                  <p class="text-sm text-slate-500">当前筛选条件下没有可显示的文档</p>
                </div>

                <div v-else class="space-y-2">
                  <button
                    v-for="document in visibleDocuments(knowledgeBase)"
                    :key="document.fileKey"
                    type="button"
                    class="flex w-full items-start gap-3 rounded-xl border bg-white px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
                    :class="document.selected ? 'border-emerald-200 shadow-sm' : 'border-slate-200'"
                    @click="
                      knowledgeDebugStore.toggleDocumentSelection(
                        knowledgeBase.id,
                        document.fileKey
                      )
                    "
                  >
                    <span
                      class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold"
                      :class="
                        document.selected
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                          : 'border-slate-200 bg-slate-100 text-slate-500'
                      "
                    >
                      {{ document.selected ? '✓' : '' }}
                    </span>

                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <p class="truncate text-sm font-medium text-slate-900">
                          {{ document.fileName }}
                        </p>
                        <span
                          class="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                          :class="knowledgeDebugDocumentStateClassMap[document.embeddingState]"
                        >
                          {{ knowledgeDebugDocumentStateLabelMap[document.embeddingState] }}
                        </span>
                      </div>
                      <p class="mt-1 truncate text-xs text-slate-500">
                        {{ document.fileKey }}
                      </p>
                    </div>

                    <div class="flex shrink-0 flex-col items-end gap-1 text-[10px] text-slate-500">
                      <span>embeddings: {{ document.embeddingCount }}</span>
                      <span>completed: {{ document.completedEmbeddingCount }}</span>
                    </div>
                  </button>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section
        class="us-devpage-card flex min-h-0 flex-col overflow-hidden rounded-2xl border shadow-sm"
      >
        <div class="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 class="text-base font-semibold text-slate-900">RAG 调试</h3>
            <p class="mt-1 text-xs text-slate-500">
              这里直接调用 `knowledgeDatabase` 域下新增的调试方法。
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
              :disabled="knowledgeDebugStore.searchLoading"
              @click="knowledgeDebugStore.clearSearchResult"
            >
              清空
            </button>
            <button
              type="button"
              class="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="knowledgeDebugStore.searchLoading"
              @click="handleRunSearch"
            >
              {{ knowledgeDebugStore.searchLoading ? '执行中...' : '执行检索' }}
            </button>
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto p-5">
          <div class="grid gap-4 lg:grid-cols-2">
            <label class="space-y-2">
              <span class="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Query
              </span>
              <textarea
                v-model="knowledgeDebugStore.query"
                rows="4"
                class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                placeholder="输入调试 query"
              ></textarea>
            </label>

            <div class="space-y-3">
              <div class="grid grid-cols-2 gap-3">
                <label class="space-y-2">
                  <span class="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    k
                  </span>
                  <input
                    v-model.number="knowledgeDebugStore.k"
                    type="number"
                    min="1"
                    class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>

                <label class="space-y-2">
                  <span class="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    ef
                  </span>
                  <input
                    v-model.number="knowledgeDebugStore.ef"
                    type="number"
                    min="1"
                    class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <label class="space-y-2">
                  <span class="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    rerank
                  </span>
                  <button
                    type="button"
                    class="flex h-[52px] w-full items-center justify-between rounded-2xl border px-4 text-sm transition"
                    :class="
                      knowledgeDebugStore.rerankEnabled
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-700'
                    "
                    @click="
                      knowledgeDebugStore.setRerankEnabled(!knowledgeDebugStore.rerankEnabled)
                    "
                  >
                    <span>{{ knowledgeDebugStore.rerankEnabled ? '已开启' : '已关闭' }}</span>
                    <span
                      class="inline-flex h-5 w-9 items-center rounded-full p-0.5 transition"
                      :class="knowledgeDebugStore.rerankEnabled ? 'bg-emerald-500' : 'bg-slate-300'"
                    >
                      <span
                        class="h-4 w-4 rounded-full bg-white transition-transform"
                        :class="
                          knowledgeDebugStore.rerankEnabled ? 'translate-x-4' : 'translate-x-0'
                        "
                      ></span>
                    </span>
                  </button>
                </label>

                <label class="space-y-2">
                  <span class="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    rerank TopN
                  </span>
                  <input
                    v-model.number="knowledgeDebugStore.rerankTopN"
                    type="number"
                    min="1"
                    class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
              </div>

              <div class="space-y-2">
                <span class="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  rerank 模型
                </span>
                <button
                  type="button"
                  class="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
                  @click="rerankSelectorVisible = true"
                >
                  <span class="truncate">
                    {{ rerankModelLabel }}
                  </span>
                  <span class="text-xs text-slate-400">选择模型</span>
                </button>
              </div>
            </div>
          </div>

          <div class="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-semibold text-slate-900">结果摘要</h4>
                <span class="text-xs text-slate-400">调试视角</span>
              </div>
              <div class="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div class="rounded-2xl bg-slate-50 px-3 py-3">
                  <div class="text-xs text-slate-400">知识库数</div>
                  <div class="mt-1 text-lg font-semibold text-slate-900">
                    {{ knowledgeDebugStore.selectedKnowledgeBaseCount }}
                  </div>
                </div>
                <div class="rounded-2xl bg-slate-50 px-3 py-3">
                  <div class="text-xs text-slate-400">文档数</div>
                  <div class="mt-1 text-lg font-semibold text-slate-900">
                    {{ knowledgeDebugStore.selectedDocumentCount }}
                  </div>
                </div>
                <div class="rounded-2xl bg-slate-50 px-3 py-3">
                  <div class="text-xs text-slate-400">resolved scopes</div>
                  <div class="mt-1 text-lg font-semibold text-slate-900">
                    {{ knowledgeDebugStore.resolvedScopes.length }}
                  </div>
                </div>
                <div class="rounded-2xl bg-slate-50 px-3 py-3">
                  <div class="text-xs text-slate-400">hits</div>
                  <div class="mt-1 text-lg font-semibold text-slate-900">
                    {{ sortedHits.length }}
                  </div>
                </div>
              </div>
              <p class="mt-3 text-xs text-slate-500">
                partial failure: {{ knowledgeDebugStore.partialFailureCount }} | partial kb:
                {{ knowledgeDebugStore.partialKnowledgeBaseCount }}
              </p>
            </article>

            <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-semibold text-slate-900">警告与错误</h4>
                <span class="text-xs text-slate-400">响应概览</span>
              </div>

              <div class="mt-3 space-y-3">
                <div
                  v-if="knowledgeDebugStore.warnings.length === 0"
                  class="text-sm text-slate-400"
                >
                  暂无 warning
                </div>
                <div v-else class="space-y-2">
                  <div
                    v-for="warning in knowledgeDebugStore.warnings"
                    :key="`${warning.code}:${warning.message}`"
                    class="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700"
                  >
                    <div class="font-semibold">{{ warning.code }}</div>
                    <div class="mt-1 leading-5">{{ warning.message }}</div>
                  </div>
                </div>

                <div v-if="knowledgeDebugStore.errors.length === 0" class="text-sm text-slate-400">
                  暂无 error
                </div>
                <div v-else class="space-y-2">
                  <div
                    v-for="error in knowledgeDebugStore.errors"
                    :key="`${error.code}:${error.message}`"
                    class="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
                  >
                    <div class="font-semibold">{{ error.code }}</div>
                    <div class="mt-1 leading-5">{{ error.message }}</div>
                  </div>
                </div>
              </div>
            </article>
          </div>

          <section class="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 class="text-sm font-semibold text-slate-900">命中列表</h4>
                <p class="mt-1 text-xs text-slate-500">
                  可按 distance / rerankScore / chunkIndex 查看不同排序结果。
                </p>
              </div>

              <WhiteSelect
                v-model="resultSortModeModel"
                :options="knowledgeDebugResultSortOptions"
                placeholder="结果排序"
                trigger-class="min-w-40 rounded-xl border-slate-200 px-3 py-2 text-sm"
                panel-class="rounded-xl"
                teleport-to="body"
              />
            </div>

            <div v-if="sortedHits.length === 0" class="py-8 text-center text-sm text-slate-400">
              暂无命中结果
            </div>

            <div v-else class="mt-4 space-y-3">
              <article
                v-for="hit in sortedHits"
                :key="hit.id"
                class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <h5 class="truncate text-sm font-semibold text-slate-900">
                        {{ hit.fileName }}
                      </h5>
                      <span
                        class="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500"
                      >
                        {{ hit.fileKey }}
                      </span>
                    </div>
                    <p class="mt-2 line-clamp-3 text-xs leading-5 text-slate-600">
                      {{ hit.content }}
                    </p>
                  </div>

                  <div class="flex shrink-0 flex-col items-end gap-1 text-[10px] text-slate-500">
                    <span>distance: {{ formatNumber(hit.distance) }}</span>
                    <span>rerank: {{ formatNumber(hit.rerankScore) }}</span>
                    <span>chunk: {{ hit.chunkIndex ?? '-' }}</span>
                  </div>
                </div>

                <div class="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    class="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700"
                  >
                    KB #{{ hit.scope.knowledgeBaseId }}
                  </span>
                  <span
                    class="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500"
                  >
                    {{ hit.scope.embeddingConfigId }}
                  </span>
                  <span
                    class="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500"
                  >
                    {{ hit.scope.tableName }}
                  </span>
                </div>
              </article>
            </div>
          </section>

          <details class="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" open>
            <summary class="cursor-pointer text-sm font-semibold text-slate-900">原始 JSON</summary>
            <pre
              class="mt-3 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-5 text-slate-100"
              >{{ rawResponseJson }}</pre
            >
          </details>

          <p v-if="knowledgeDebugStore.searchError" class="mt-4 text-sm text-rose-600">
            {{ knowledgeDebugStore.searchError }}
          </p>
        </div>
      </section>
    </div>

    <ModelSelector
      v-model:visible="rerankSelectorVisible"
      :current-provider-id="knowledgeDebugStore.rerankModelProviderId"
      :current-model-id="knowledgeDebugStore.rerankModelId"
      :providers="rerankModelProviders"
      :show-manage-button="false"
      title="选择 rerank 模型"
      search-placeholder="搜索 rerank 模型..."
      empty-text="暂无可用 rerank 模型"
      hint-text="这里复用通用 ModelSelector，只喂外部 providers"
      @select="handleRerankModelSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ModelSelector from '@renderer/components/ModelSelector/index.vue'
import WhiteSelect from '@renderer/components/WhiteSelect/index.vue'
import type { ModelProvider } from '@renderer/stores/model-config/types'
import { useKnowledgeDebugStore } from '@renderer/stores/knowledge-debug/store'
import { useRerankModelStore } from '@renderer/stores/rerank-model/store'
import type {
  KnowledgeDebugDocumentStatusFilter,
  KnowledgeDebugKnowledgeBaseNode,
  KnowledgeDebugResultSortMode
} from '@renderer/stores/knowledge-debug/types'
import {
  knowledgeDebugDocumentStateClassMap,
  knowledgeDebugDocumentStateLabelMap,
  knowledgeDebugDocumentStatusOptions,
  knowledgeDebugResultSortOptions
} from './index.ts'

const knowledgeDebugStore = useKnowledgeDebugStore()
const rerankModelStore = useRerankModelStore()

const rerankSelectorVisible = ref(false)

const documentStatusFilterModel = computed<KnowledgeDebugDocumentStatusFilter>({
  get: () => knowledgeDebugStore.documentStatusFilter,
  set: (value) => knowledgeDebugStore.setDocumentStatusFilter(value)
})

const resultSortModeModel = computed<KnowledgeDebugResultSortMode>({
  get: () => knowledgeDebugStore.resultSortMode,
  set: (value) => knowledgeDebugStore.setResultSortMode(value)
})

const rerankModelProviders = computed<ModelProvider[]>(() => {
  return Object.entries(rerankModelStore.modelGroups).map(([groupName, models]) => ({
    id: groupName,
    type: 'openai-completion',
    name: groupName === 'default' ? 'default' : groupName,
    apiKey: '',
    baseUrl: '',
    icon: 'server',
    enabled: true,
    models: models.map((model) => ({
      id: model.id,
      name: model.displayName,
      group: model.group || model.providerName || groupName
    }))
  }))
})

const rerankModelLabel = computed(() => {
  if (!knowledgeDebugStore.rerankModelId) {
    return '选择 rerank 模型'
  }

  return rerankModelStore.getModelDisplayName(knowledgeDebugStore.rerankModelId)
})

const sortedHits = computed(() => {
  const hits = [...knowledgeDebugStore.hits]
  const sortMode = knowledgeDebugStore.resultSortMode

  return hits.sort((left, right) => {
    if (sortMode === 'rerankScore') {
      const leftScore = left.rerankScore ?? Number.NEGATIVE_INFINITY
      const rightScore = right.rerankScore ?? Number.NEGATIVE_INFINITY
      return rightScore - leftScore
    }

    if (sortMode === 'chunkIndex') {
      return (
        (left.chunkIndex ?? Number.POSITIVE_INFINITY) -
        (right.chunkIndex ?? Number.POSITIVE_INFINITY)
      )
    }

    const leftDistance = left.distance ?? Number.POSITIVE_INFINITY
    const rightDistance = right.distance ?? Number.POSITIVE_INFINITY
    return leftDistance - rightDistance
  })
})

const rawResponseJson = computed(() => {
  if (!knowledgeDebugStore.searchResponse) {
    return '暂无响应'
  }

  return JSON.stringify(knowledgeDebugStore.searchResponse, null, 2)
})

function visibleDocuments(knowledgeBase: KnowledgeDebugKnowledgeBaseNode) {
  if (documentStatusFilterModel.value === 'all') {
    return knowledgeBase.documents
  }

  return knowledgeBase.documents.filter((document) => {
    return document.embeddingState === documentStatusFilterModel.value
  })
}

async function handleRefreshResources(): Promise<void> {
  await knowledgeDebugStore.refreshKnowledgeBases()
}

async function handleRunSearch(): Promise<void> {
  await knowledgeDebugStore.runSearch()
}

function handleRerankModelSelect(payload: {
  provider: ModelProvider
  model: { id: string }
}): void {
  knowledgeDebugStore.setRerankModelSelection(payload.provider.id, payload.model.id)
}

function formatNumber(value?: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '-'
  }

  return value.toFixed(4)
}

watch(
  rerankModelProviders,
  (providers) => {
    if (providers.length === 0) {
      return
    }

    const currentProvider = providers.find(
      (provider) => provider.id === knowledgeDebugStore.rerankModelProviderId
    )
    const currentModelExists = currentProvider?.models.some(
      (model) => model.id === knowledgeDebugStore.rerankModelId
    )
    if (currentModelExists) {
      return
    }

    const firstProvider = providers[0]
    const firstModel = firstProvider.models[0]
    if (firstModel) {
      knowledgeDebugStore.setRerankModelSelection(firstProvider.id, firstModel.id)
    }
  },
  { immediate: true, deep: true }
)

onMounted(async () => {
  await Promise.all([knowledgeDebugStore.loadKnowledgeBases(), rerankModelStore.fetchModels()])
})
</script>
