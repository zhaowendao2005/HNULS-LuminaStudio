<template>
  <div class="max-h-[320px] overflow-hidden rounded-xl border border-gray-200 bg-white">
    <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
      <div>
        <p class="text-[14px] font-medium text-gray-900">知识图谱检索</p>
        <p class="text-[12px] text-gray-500">
          先选 KG 知识库，再决定使用全局检索还是只勾选图谱表。
        </p>
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
              store.kgMode === item.value
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            "
            type="button"
            @click="store.setKgMode(item.value)"
          >
            {{ item.label }}
          </button>
        </div>

        <div class="space-y-2">
          <button
            v-for="base in store.kgKnowledgeBases"
            :key="base.id"
            class="w-full rounded-xl border px-3 py-2 text-left transition-colors"
            :class="
              base.id === store.kgSelectedKnowledgeBaseId
                ? 'border-gray-900 bg-white'
                : 'border-gray-200 bg-white hover:border-gray-300'
            "
            type="button"
            @click="store.selectKgKnowledgeBase(base.id)"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <p class="truncate text-[13px] font-medium text-gray-900">{{ base.name }}</p>
                <p class="mt-0.5 text-[12px] text-gray-500">{{ base.description }}</p>
              </div>
              <span class="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                {{ base.databaseName }}
              </span>
            </div>
          </button>
        </div>

        <p v-if="store.kgKnowledgeBasesLoading" class="mt-3 text-[12px] text-gray-500">
          正在加载 KG 知识库…
        </p>
        <p v-else-if="store.kgKnowledgeBasesError" class="mt-3 text-[12px] text-rose-600">
          {{ store.kgKnowledgeBasesError }}
        </p>
      </aside>

      <section class="min-w-0 overflow-auto p-3">
        <div
          v-if="!currentKnowledgeBase"
          class="flex h-full items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-[13px] text-gray-500"
        >
          先选择一个 KG 知识库
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
                {{ currentKnowledgeBase.databaseName }}
              </p>
            </div>
            <div class="flex items-center gap-2 text-[12px] text-gray-500">
              <span class="rounded bg-white px-2 py-1">{{ store.kgMode }}</span>
            </div>
          </div>

          <p
            v-if="currentKnowledgeBase.loadingGraphTables"
            class="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-[12px] text-gray-500"
          >
            正在加载图谱表…
          </p>

          <div v-else class="space-y-2">
            <div
              v-for="table in currentKnowledgeBase.graphTables"
              :key="table.graphTableBase"
              class="rounded-xl border border-gray-200 bg-white px-3 py-2"
            >
              <label class="flex items-center gap-2">
                <input
                  :checked="table.selected"
                  :disabled="store.kgMode !== 'tables'"
                  class="h-4 w-4 rounded border-gray-300 text-gray-900"
                  type="checkbox"
                  @change="
                    store.toggleKgGraphTableSelection(currentKnowledgeBase.id, table.graphTableBase)
                  "
                />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-[13px] font-medium text-gray-900">
                    {{ table.displayName || table.graphTableBase }}
                  </p>
                  <p class="truncate text-[12px] text-gray-500">{{ table.graphTableBase }}</p>
                </div>
                <span class="rounded bg-gray-100 px-2 py-1 text-[11px] text-gray-500">
                  {{ table.entityCount }} / {{ table.relationCount }}
                </span>
              </label>
            </div>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { X } from 'lucide-vue-next'
import { useNormalChatRetrievalConfigStore } from '@renderer/stores/normal-chat/retrieval-config/retrieval-config.store'

const store = useNormalChatRetrievalConfigStore()

const modeOptions = [
  { label: '全局', value: 'global' as const },
  { label: '图表', value: 'tables' as const },
  { label: '禁用', value: 'disabled' as const }
]

const currentKnowledgeBase = computed(() => store.currentKgKnowledgeBase)

onMounted(() => {
  void store.loadKgKnowledgeBases()
})
</script>
