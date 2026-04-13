<template>
  <div class="flex h-[320px] flex-col overflow-hidden bg-gray-100 text-gray-700">
    <div class="flex items-center justify-between border-b border-gray-200 bg-gray-100 px-3 py-2">
      <div>
        <p class="text-[13px] font-semibold text-gray-900">知识图谱检索</p>
        <p class="text-[12px] text-gray-500">先选 KG 知识库，再展开图谱表。</p>
      </div>
      <div class="relative flex items-center gap-1">
        <button
          v-for="item in modeOptions"
          :key="item.value"
          class="flex h-7 w-7 items-center justify-center text-gray-400 transition-colors"
          :class="store.kgMode === item.value ? 'text-violet-600' : 'hover:text-violet-600'"
          type="button"
          @mouseenter="activeModeTooltip = item.value"
          @mouseleave="activeModeTooltip = null"
          @focus="activeModeTooltip = item.value"
          @blur="activeModeTooltip = null"
          @click="store.setKgMode(item.value)"
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
          <div
            v-for="base in store.kgKnowledgeBases"
            :key="base.id"
            class="flex items-center gap-1"
          >
            <button
              class="flex min-w-0 flex-1 items-center justify-between border-l-2 px-2 py-1.5 text-left text-[13px] transition-colors"
              :class="
                base.id === store.kgSelectedKnowledgeBaseId
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-transparent text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
              "
              type="button"
              @click="store.selectKgKnowledgeBase(base.id)"
            >
              <span class="min-w-0 flex-1 truncate">{{ base.name }}</span>
              <span class="ml-2 shrink-0 text-[11px] text-gray-400">{{ base.databaseName }}</span>
            </button>
            <button
              class="flex h-5 w-5 shrink-0 items-center justify-center text-gray-400 transition-colors hover:text-violet-600"
              :class="base.id === store.kgSelectedKnowledgeBaseId ? 'text-violet-600' : ''"
              type="button"
              :title="base.expanded ? '收起图谱表' : '展开图谱表'"
              @click.stop="store.toggleKgKnowledgeBaseExpanded(base.id)"
            >
              <ChevronDown v-if="base.expanded" class="h-3.5 w-3.5" />
              <ChevronRight v-else class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <p v-if="store.kgKnowledgeBasesLoading" class="mt-3 text-[12px] text-gray-500">
          正在加载 KG 知识库…
        </p>
        <p v-else-if="store.kgKnowledgeBasesError" class="mt-3 text-[12px] text-rose-600">
          {{ store.kgKnowledgeBasesError }}
        </p>
      </aside>

      <section class="min-h-0 min-w-0 overflow-auto bg-gray-100 px-3 py-2">
        <div v-if="!currentKnowledgeBase" class="py-6 text-center text-[13px] text-gray-500">
          先选择一个 KG 知识库
        </div>

        <template v-else>
          <div class="flex items-center justify-between border-b border-gray-200 pb-2">
            <div class="min-w-0">
              <p class="truncate text-[13px] font-semibold text-gray-900">
                {{ currentKnowledgeBase.name }}
              </p>
              <p class="truncate text-[12px] text-gray-500">
                {{ currentKnowledgeBase.databaseName }}
              </p>
            </div>
            <div class="text-right text-[12px] text-gray-500">
              <span class="block">{{ store.kgMode }}</span>
              <span
                v-if="
                  !currentKnowledgeBase.graphTablesLoaded &&
                  !currentKnowledgeBase.loadingGraphTables
                "
                class="block"
              >
                点击左侧箭头展开图谱表
              </span>
            </div>
          </div>

          <p v-if="currentKnowledgeBase.loadingGraphTables" class="py-4 text-[12px] text-gray-500">
            正在加载图谱表…
          </p>

          <p
            v-else-if="!currentKnowledgeBase.graphTablesLoaded"
            class="py-4 text-[12px] text-gray-500"
          >
            先展开左侧知识图谱条目，再查看文件级图谱表。
          </p>

          <div v-else class="mt-1 space-y-1">
            <div
              v-for="table in currentKnowledgeBase.graphTables"
              :key="table.graphTableBase"
              class="border-l border-gray-200 pl-2"
            >
              <label
                class="flex items-center gap-2 px-2 py-1.5 transition-colors hover:bg-violet-50"
              >
                <input
                  :checked="table.selected"
                  :disabled="store.kgMode !== 'tables'"
                  class="h-4 w-4 accent-violet-500"
                  type="checkbox"
                  @change="
                    store.toggleKgGraphTableSelection(currentKnowledgeBase.id, table.graphTableBase)
                  "
                />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-[13px] font-medium text-gray-800">
                    {{ table.displayName || table.graphTableBase }}
                  </p>
                  <p class="truncate text-[12px] text-gray-500">{{ table.graphTableBase }}</p>
                </div>
                <span class="shrink-0 text-[11px] text-gray-500">
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
import { computed, onMounted, ref } from 'vue'
import { Ban, Boxes, ChevronDown, ChevronRight, ScanSearch, X } from 'lucide-vue-next'
import { useNormalChatRetrievalConfigStore } from '@renderer/stores/normal-chat/retrieval-config/retrieval-config.store'

const store = useNormalChatRetrievalConfigStore()
const activeModeTooltip = ref<string | null>(null)

const modeOptions = [
  {
    label: '全局检索',
    value: 'global' as const,
    icon: ScanSearch,
    description: '只锁定 KG 知识库，图谱表交给模型自行选择。'
  },
  {
    label: '指定图表',
    value: 'tables' as const,
    icon: Boxes,
    description: '展开图谱表列表，精确勾选要参与检索的表。'
  },
  {
    label: '禁用检索',
    value: 'disabled' as const,
    icon: Ban,
    description: '关闭 kg-retrieval functioncall。'
  }
]

const currentKnowledgeBase = computed(() => store.currentKgKnowledgeBase)
const activeModeMeta = computed(() => {
  return modeOptions.find((item) => item.value === activeModeTooltip.value) ?? null
})

onMounted(() => {
  void store.loadKgKnowledgeBases()
})
</script>
