<template>
  <div class="flex h-[320px] flex-col overflow-hidden bg-gray-100 text-gray-700">
    <div class="flex items-center justify-between border-b border-gray-200 bg-gray-100 px-3 py-2">
      <div>
        <p class="text-[13px] font-semibold text-gray-900">知识库向量检索</p>
        <p class="text-[12px] text-gray-500">先选知识库，再展开文档和嵌入表。</p>
      </div>
      <div class="relative flex items-center gap-1">
        <button
          v-for="item in modeOptions"
          :key="item.value"
          class="flex h-7 w-7 items-center justify-center text-gray-400 transition-colors"
          :class="store.vectorMode === item.value ? 'text-sky-600' : 'hover:text-sky-600'"
          type="button"
          @mouseenter="activeModeTooltip = item.value"
          @mouseleave="activeModeTooltip = null"
          @focus="activeModeTooltip = item.value"
          @blur="activeModeTooltip = null"
          @click="store.setVectorMode(item.value)"
        >
          <component :is="item.icon" class="h-4 w-4" />
        </button>
        <button
          class="ml-1 flex h-7 w-7 items-center justify-center text-gray-500 transition-colors hover:text-gray-800"
          type="button"
          @click="store.closePanel"
        >
          <X class="h-4 w-4" />
        </button>

        <div
          v-if="activeModeMeta"
          class="absolute right-9 top-full z-10 mt-2 w-48 border border-gray-200 bg-gray-50 px-3 py-2 shadow-lg"
        >
          <p class="text-[12px] font-semibold text-gray-900">{{ activeModeMeta.label }}</p>
          <p class="mt-1 text-[11px] leading-4 text-gray-500">{{ activeModeMeta.description }}</p>
        </div>
      </div>
    </div>

    <div class="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)] border-b border-gray-200">
      <aside class="border-r border-gray-200 bg-gray-50 px-2 py-2">
        <div class="space-y-1 border-l border-gray-200 pl-2">
          <button
            v-for="base in store.vectorKnowledgeBases"
            :key="base.id"
            class="flex w-full items-center justify-between border-l-2 px-2 py-1.5 text-left text-[13px] transition-colors"
            :class="
              base.id === store.vectorSelectedKnowledgeBaseId
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-transparent text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
            "
            type="button"
            @click="store.selectVectorKnowledgeBase(base.id)"
          >
            <span class="truncate">{{ base.name }}</span>
            <span class="ml-2 shrink-0 text-[11px] text-gray-400">{{ base.docCount }}</span>
          </button>
        </div>

        <p v-if="store.vectorKnowledgeBasesLoading" class="mt-3 text-[12px] text-gray-500">
          正在加载知识库…
        </p>
        <p v-else-if="store.vectorKnowledgeBasesError" class="mt-3 text-[12px] text-rose-600">
          {{ store.vectorKnowledgeBasesError }}
        </p>
      </aside>

      <section class="min-h-0 min-w-0 overflow-auto bg-gray-100 px-3 py-2">
        <div v-if="!currentKnowledgeBase" class="py-6 text-center text-[13px] text-gray-500">
          先选择一个知识库
        </div>

        <template v-else>
          <div class="flex items-center justify-between border-b border-gray-200 pb-2">
            <div class="min-w-0">
              <p class="truncate text-[13px] font-semibold text-gray-900">
                {{ currentKnowledgeBase.name }}
              </p>
              <p class="truncate text-[12px] text-gray-500">
                {{ currentKnowledgeBase.description }}
              </p>
            </div>
            <div class="flex items-center gap-2 text-[12px] text-gray-500">
              <span>{{ store.vectorMode }}</span>
              <span v-if="store.vectorMode !== 'disabled'">
                functioncall {{ store.isVectorFunctioncallEnabled ? 'on' : 'off' }}
              </span>
            </div>
          </div>

          <p v-if="currentKnowledgeBase.loadingDocuments" class="py-4 text-[12px] text-gray-500">
            正在加载文档…
          </p>

          <div v-else class="mt-1 space-y-1">
            <div
              v-for="document in currentKnowledgeBase.documents"
              :key="document.fileKey"
              class="border-l border-gray-200 pl-2"
            >
              <div class="flex items-center gap-2 px-2 py-1.5 transition-colors hover:bg-sky-50">
                <button
                  class="flex h-5 w-5 items-center justify-center text-gray-500 transition-colors hover:text-sky-700"
                  type="button"
                  @click="
                    store.toggleVectorDocumentExpanded(currentKnowledgeBase.id, document.fileKey)
                  "
                >
                  <ChevronDown v-if="document.expanded" class="h-3.5 w-3.5" />
                  <ChevronRight v-else class="h-3.5 w-3.5" />
                </button>
                <input
                  :checked="document.selected"
                  :disabled="store.vectorMode !== 'documents'"
                  class="h-4 w-4 accent-sky-500"
                  type="checkbox"
                  @change="
                    store.toggleVectorDocumentSelection(currentKnowledgeBase.id, document.fileKey)
                  "
                />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-[13px] font-medium text-gray-800">
                    {{ document.fileName }}
                  </p>
                  <p class="truncate text-[12px] text-gray-500">{{ document.fileKey }}</p>
                </div>
                <span class="shrink-0 text-[11px] text-gray-500">
                  {{ document.embeddingCount }} tables
                </span>
              </div>

              <div v-if="document.expanded" class="ml-5 border-l border-gray-200 pl-2">
                <p v-if="document.loadingEmbeddings" class="py-2 text-[12px] text-gray-500">
                  加载嵌入表…
                </p>
                <div v-else class="space-y-1">
                  <label
                    v-for="embedding in document.embeddings"
                    :key="embedding.embeddingConfigId"
                    class="flex items-center gap-2 px-2 py-1.5 transition-colors hover:bg-sky-50"
                  >
                    <input
                      :checked="embedding.selected"
                      :disabled="store.vectorMode !== 'documents'"
                      class="h-4 w-4 accent-sky-500"
                      type="checkbox"
                      @change="
                        store.toggleVectorEmbeddingSelection(
                          currentKnowledgeBase.id,
                          document.fileKey,
                          embedding.embeddingConfigId
                        )
                      "
                    />
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-[12px] font-medium text-gray-800">
                        {{ embedding.embeddingConfigName || embedding.embeddingConfigId }}
                      </p>
                      <p class="truncate text-[12px] text-gray-500">
                        {{ embedding.embeddingConfigId }} · {{ embedding.dimensions }} dims ·
                        {{ embedding.status }}
                      </p>
                    </div>
                    <span class="shrink-0 text-[11px] text-gray-500">
                      {{ embedding.tableName }}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-3 border-t border-gray-200 pt-2 text-[12px] text-gray-600">
            <div class="grid grid-cols-[80px_minmax(0,1fr)_92px] gap-3">
              <label class="flex items-center gap-2">
                <span class="shrink-0 text-gray-500">重排</span>
                <input
                  v-model="store.vectorRerankEnabled"
                  class="h-4 w-4 accent-sky-500"
                  type="checkbox"
                />
              </label>
              <label class="flex items-center gap-2">
                <span class="shrink-0 text-gray-500">模型</span>
                <button
                  class="min-w-0 flex-1 border-b border-gray-200 px-1 py-1 text-left text-[12px] text-gray-700 transition-colors hover:border-sky-400 disabled:cursor-not-allowed disabled:text-gray-400"
                  :disabled="rerankModelProviders.length === 0"
                  type="button"
                  @click="rerankSelectorVisible = true"
                >
                  {{ rerankModelLabel }}
                </button>
              </label>
              <label class="flex items-center gap-2">
                <span class="shrink-0 text-gray-500">TopN</span>
                <input
                  v-model.number="store.vectorRerankTopN"
                  class="w-16 border-b border-gray-200 bg-transparent px-1 py-1 text-[12px] text-gray-700 outline-none"
                  min="1"
                  type="number"
                />
              </label>
            </div>
          </div>
        </template>
      </section>
    </div>

    <ModelSelector
      v-model:visible="rerankSelectorVisible"
      :current-provider-id="currentRerankModelProviderId"
      :current-model-id="store.vectorRerankModelId"
      :providers="rerankModelProviders"
      :show-manage-button="false"
      title="选择重排模型"
      search-placeholder="搜索重排模型..."
      empty-text="暂无可用重排模型"
      hint-text="这里复用通用 ModelSelector，只喂外部 providers"
      @select="handleRerankModelSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Ban, ChevronDown, ChevronRight, FolderTree, ScanSearch, X } from 'lucide-vue-next'
import ModelSelector from '@renderer/components/ModelSelector/index.vue'
import { useRerankModelStore } from '@renderer/stores/rerank-model/store'
import type { ModelProvider } from '@renderer/stores/model-config/types'
import { useNormalChatRetrievalConfigStore } from '@renderer/stores/normal-chat/retrieval-config/retrieval-config.store'

const store = useNormalChatRetrievalConfigStore()
const rerankModelStore = useRerankModelStore()
const activeModeTooltip = ref<string | null>(null)
const rerankSelectorVisible = ref(false)

const modeOptions = [
  {
    label: '全局检索',
    value: 'global' as const,
    icon: ScanSearch,
    description: '只锁定知识库，文档和嵌入表交给模型自行选择。'
  },
  {
    label: '指定文档',
    value: 'documents' as const,
    icon: FolderTree,
    description: '展开文件树，精确勾选文档和嵌入表。'
  },
  {
    label: '禁用检索',
    value: 'disabled' as const,
    icon: Ban,
    description: '关闭 knowledge-retrieval functioncall。'
  }
]

const currentKnowledgeBase = computed(() => store.currentVectorKnowledgeBase)
const activeModeMeta = computed(() => {
  return modeOptions.find((item) => item.value === activeModeTooltip.value) ?? null
})
const rerankModelProviders = computed<ModelProvider[]>(() => {
  return Object.entries(rerankModelStore.modelGroups).map(([groupName, models]) => ({
    id: groupName,
    type: 'openai-completion',
    name: groupName === 'default' ? 'default' : groupName,
    apiKey: '',
    baseUrl: '',
    officialWebsite: '',
    icon: 'server',
    enabled: true,
    models: models.map((model) => ({
      id: model.id,
      name: model.displayName,
      group: model.group || model.providerName || groupName
    }))
  }))
})
const currentRerankModelProviderId = computed(() => {
  const provider = rerankModelProviders.value.find((item) => {
    return item.models.some((model) => model.id === store.vectorRerankModelId)
  })
  return provider?.id ?? rerankModelProviders.value[0]?.id ?? null
})
const rerankModelLabel = computed(() => {
  if (!store.vectorRerankModelId) {
    return rerankModelProviders.value.length === 0 ? '暂无模型' : '选择模型'
  }

  return rerankModelStore.getModelDisplayName(store.vectorRerankModelId)
})

function handleRerankModelSelect(payload: {
  provider: ModelProvider
  model: { id: string }
}): void {
  store.vectorRerankModelId = payload.model.id
}

watch(
  rerankModelProviders,
  (providers) => {
    if (providers.length === 0) {
      store.vectorRerankModelId = null
      return
    }

    const currentModelExists = providers.some((provider) => {
      return provider.models.some((model) => model.id === store.vectorRerankModelId)
    })
    if (currentModelExists) {
      return
    }

    store.vectorRerankModelId = providers[0]?.models[0]?.id ?? null
  },
  { immediate: true, deep: true }
)

onMounted(() => {
  void store.loadVectorKnowledgeBases()
  void rerankModelStore.fetchModels()
})
</script>
