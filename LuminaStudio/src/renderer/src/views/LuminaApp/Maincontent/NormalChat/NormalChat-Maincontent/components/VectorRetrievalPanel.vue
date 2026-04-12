<template>
  <div class="max-h-[320px] overflow-hidden rounded-xl border border-gray-200 bg-white">
    <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
      <div>
        <p class="text-[14px] font-medium text-gray-900">知识库向量检索</p>
        <p class="text-[12px] text-gray-500">先选知识库，再按模式决定是否展开文档和嵌入表。</p>
      </div>
      <button
        class="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
        type="button"
        @click="store.closePanel"
      >
        <X class="h-4 w-4" />
      </button>
    </div>

    <div class="grid max-h-[calc(100vh-13rem)] grid-cols-[220px_minmax(0,1fr)] overflow-hidden">
      <aside class="border-r border-gray-200 bg-gray-50/80 p-3">
        <div class="mb-3 flex gap-2">
          <button
            v-for="item in modeOptions"
            :key="item.value"
            class="flex-1 rounded-md px-2 py-1.5 text-[12px] transition-colors"
            :class="
              store.vectorMode === item.value
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            "
            type="button"
            @click="store.setVectorMode(item.value)"
          >
            {{ item.label }}
          </button>
        </div>

        <div class="space-y-2">
          <button
            v-for="base in store.vectorKnowledgeBases"
            :key="base.id"
            class="w-full rounded-xl border px-3 py-2 text-left transition-colors"
            :class="
              base.id === store.vectorSelectedKnowledgeBaseId
                ? 'border-gray-900 bg-white'
                : 'border-gray-200 bg-white hover:border-gray-300'
            "
            type="button"
            @click="store.selectVectorKnowledgeBase(base.id)"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <p class="truncate text-[13px] font-medium text-gray-900">{{ base.name }}</p>
                <p class="mt-0.5 text-[12px] text-gray-500">{{ base.description }}</p>
              </div>
              <span class="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                {{ base.docCount }}
              </span>
            </div>
          </button>
        </div>

        <p v-if="store.vectorKnowledgeBasesLoading" class="mt-3 text-[12px] text-gray-500">
          正在加载知识库…
        </p>
        <p v-else-if="store.vectorKnowledgeBasesError" class="mt-3 text-[12px] text-rose-600">
          {{ store.vectorKnowledgeBasesError }}
        </p>
      </aside>

      <section class="min-w-0 overflow-auto p-3">
        <div
          v-if="!currentKnowledgeBase"
          class="flex h-full items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-[13px] text-gray-500"
        >
          先选择一个知识库
        </div>

        <template v-else>
          <div
            class="mb-3 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
          >
            <div class="min-w-0 flex-1">
              <p class="truncate text-[13px] font-medium text-gray-900">
                {{ currentKnowledgeBase.name }}
              </p>
              <p class="truncate text-[12px] text-gray-500">
                {{ currentKnowledgeBase.description }}
              </p>
            </div>
            <div class="flex items-center gap-2 text-[12px] text-gray-500">
              <span class="rounded bg-white px-2 py-1">{{ store.vectorMode }}</span>
              <span v-if="store.vectorMode !== 'disabled'" class="rounded bg-white px-2 py-1">
                functioncall {{ store.isVectorFunctioncallEnabled ? 'on' : 'off' }}
              </span>
            </div>
          </div>

          <p
            v-if="currentKnowledgeBase.loadingDocuments"
            class="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-[12px] text-gray-500"
          >
            正在加载文档…
          </p>

          <div v-else class="space-y-2">
            <div
              v-for="document in currentKnowledgeBase.documents"
              :key="document.fileKey"
              class="rounded-xl border border-gray-200 bg-white"
            >
              <div class="flex items-center gap-2 px-3 py-2">
                <button
                  class="rounded p-1 text-gray-500 hover:bg-gray-100"
                  type="button"
                  @click="
                    store.toggleVectorDocumentExpanded(currentKnowledgeBase.id, document.fileKey)
                  "
                >
                  <ChevronDown v-if="document.expanded" class="h-4 w-4" />
                  <ChevronRight v-else class="h-4 w-4" />
                </button>
                <input
                  :checked="document.selected"
                  :disabled="store.vectorMode !== 'documents'"
                  class="h-4 w-4 rounded border-gray-300 text-gray-900"
                  type="checkbox"
                  @change="
                    store.toggleVectorDocumentSelection(currentKnowledgeBase.id, document.fileKey)
                  "
                />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-[13px] font-medium text-gray-900">
                    {{ document.fileName }}
                  </p>
                  <p class="truncate text-[12px] text-gray-500">{{ document.fileKey }}</p>
                </div>
                <span class="rounded bg-gray-100 px-2 py-1 text-[11px] text-gray-500">
                  {{ document.embeddingCount }} tables
                </span>
              </div>

              <div v-if="document.expanded" class="border-t border-gray-200 px-3 py-2">
                <p v-if="document.loadingEmbeddings" class="text-[12px] text-gray-500">
                  加载嵌入表…
                </p>
                <div v-else class="space-y-2">
                  <label
                    v-for="embedding in document.embeddings"
                    :key="embedding.embeddingConfigId"
                    class="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-[12px]"
                  >
                    <input
                      :checked="embedding.selected"
                      :disabled="store.vectorMode !== 'documents'"
                      class="h-4 w-4 rounded border-gray-300 text-gray-900"
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
                      <p class="truncate font-medium text-gray-900">
                        {{ embedding.embeddingConfigName || embedding.embeddingConfigId }}
                      </p>
                      <p class="truncate text-gray-500">
                        {{ embedding.embeddingConfigId }} · {{ embedding.dimensions }} dims ·
                        {{ embedding.status }}
                      </p>
                    </div>
                    <span class="rounded bg-gray-100 px-2 py-1 text-gray-500">
                      {{ embedding.tableName }}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div
            class="mt-3 grid grid-cols-3 gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[12px] text-gray-600"
          >
            <label class="flex items-center gap-2">
              <span class="shrink-0">重排</span>
              <input
                v-model="store.vectorRerankEnabled"
                class="h-4 w-4 rounded border-gray-300"
                type="checkbox"
              />
            </label>
            <label class="flex items-center gap-2">
              <span class="shrink-0">模型</span>
              <input
                v-model="store.vectorRerankModelId"
                class="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[12px] outline-none"
                placeholder="rerank model id"
                type="text"
              />
            </label>
            <label class="flex items-center gap-2">
              <span class="shrink-0">TopN</span>
              <input
                v-model.number="store.vectorRerankTopN"
                class="w-20 rounded-md border border-gray-200 bg-white px-2 py-1 text-[12px] outline-none"
                min="1"
                type="number"
              />
            </label>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { ChevronDown, ChevronRight, X } from 'lucide-vue-next'
import { useNormalChatRetrievalConfigStore } from '@renderer/stores/normal-chat/retrieval-config/retrieval-config.store'

const store = useNormalChatRetrievalConfigStore()

const modeOptions = [
  { label: '全局', value: 'global' as const },
  { label: '文档', value: 'documents' as const },
  { label: '禁用', value: 'disabled' as const }
]

const currentKnowledgeBase = computed(() => store.currentVectorKnowledgeBase)

onMounted(() => {
  void store.loadVectorKnowledgeBases()
})
</script>
