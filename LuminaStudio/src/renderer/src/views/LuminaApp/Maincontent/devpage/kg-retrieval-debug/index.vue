<template>
  <div class="us-devpage-kg-retrieval flex h-full min-h-0 flex-col gap-4 overflow-hidden p-4">
    <!-- 顶部标题栏 -->
    <section
      class="us-devpage-card flex items-center justify-between gap-4 rounded-2xl border px-5 py-4 shadow-sm"
    >
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-slate-900">知识图谱检索调试</h2>
        <p class="text-sm text-slate-500">
          选择知识库和图谱表，执行 KG 检索（local / global / hybrid / naive），查看实体、关系和
          chunks 结果。
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span
          class="rounded-full border px-2.5 py-1 text-[10px] font-medium"
          :class="
            connectionOk
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          "
        >
          {{ connectionOk ? '已连接' : '未连接' }}
        </span>
      </div>
    </section>

    <!-- 主体：左参数 右结果 -->
    <div class="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <!-- 左栏：参数配置 -->
      <section
        class="us-devpage-card flex min-h-0 flex-col overflow-hidden rounded-2xl border shadow-sm"
      >
        <div class="border-b border-slate-200 px-5 py-4">
          <h3 class="text-base font-semibold text-slate-900">参数配置</h3>
        </div>

        <div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <!-- 知识库选择 -->
          <label class="space-y-2">
            <span class="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              知识库
            </span>
            <select
              v-model.number="selectedKnowledgeBaseId"
              class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              @change="handleKnowledgeBaseChange"
            >
              <option :value="0" disabled>选择知识库...</option>
              <option v-for="kb in knowledgeBases" :key="kb.id" :value="kb.id">
                {{ kb.name }} (KB #{{ kb.id }})
              </option>
            </select>
          </label>

          <!-- 图谱表选择 -->
          <label class="space-y-2">
            <span class="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              图谱表
            </span>
            <select
              v-model="selectedGraphTableBase"
              class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              :disabled="graphTables.length === 0"
            >
              <option value="" disabled>选择图谱表...</option>
              <option v-for="gt in graphTables" :key="gt.graphTableBase" :value="gt.graphTableBase">
                {{ gt.graphTableBase }} ({{ gt.entityCount }} entities, {{ gt.relationCount }}
                relations)
              </option>
            </select>
          </label>

          <!-- 检索模式 -->
          <div class="space-y-2">
            <span class="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              检索模式
            </span>
            <div class="flex gap-1 rounded-2xl bg-slate-100/70 p-1">
              <button
                v-for="m in modeOptions"
                :key="m.value"
                type="button"
                class="flex-1 rounded-xl px-3 py-2 text-xs font-medium transition"
                :class="
                  mode === m.value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                "
                @click="mode = m.value"
              >
                {{ m.label }}
              </button>
            </div>
          </div>

          <!-- 查询输入 -->
          <label class="space-y-2">
            <span class="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              查询文本
            </span>
            <textarea
              v-model="query"
              rows="3"
              class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              placeholder="输入 KG 检索查询..."
            ></textarea>
          </label>

          <!-- Embedding Provider / Model -->
          <div class="grid grid-cols-2 gap-3">
            <label class="space-y-2">
              <span class="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Embedding Provider
              </span>
              <select
                v-model="embeddingProviderId"
                class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">选择 Provider...</option>
                <option v-for="p in providers" :key="p.id" :value="p.id">
                  {{ p.name }}
                </option>
              </select>
            </label>
            <label class="space-y-2">
              <span class="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Embedding Model
              </span>
              <input
                v-model="embeddingModelId"
                type="text"
                class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                placeholder="text-embedding-3-large"
              />
            </label>
          </div>

          <label class="space-y-2">
            <span class="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Embedding 维度
            </span>
            <input
              v-model.number="embeddingDimensions"
              type="number"
              min="1"
              class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              placeholder="3072"
            />
          </label>

          <!-- 高级参数折叠 -->
          <details class="rounded-2xl border border-slate-200 bg-white p-4">
            <summary
              class="cursor-pointer text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              高级参数
            </summary>
            <div class="mt-3 space-y-3">
              <!-- 向量搜索参数 -->
              <div class="grid grid-cols-2 gap-3">
                <label class="space-y-1">
                  <span class="text-[10px] text-slate-500">entityTopK</span>
                  <input
                    v-model.number="vectorSearch.entityTopK"
                    type="number"
                    class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                  />
                </label>
                <label class="space-y-1">
                  <span class="text-[10px] text-slate-500">relationTopK</span>
                  <input
                    v-model.number="vectorSearch.relationTopK"
                    type="number"
                    class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                  />
                </label>
                <label class="space-y-1">
                  <span class="text-[10px] text-slate-500">chunkTopK</span>
                  <input
                    v-model.number="vectorSearch.chunkTopK"
                    type="number"
                    class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                  />
                </label>
                <label class="space-y-1">
                  <span class="text-[10px] text-slate-500">ef</span>
                  <input
                    v-model.number="vectorSearch.ef"
                    type="number"
                    class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                  />
                </label>
              </div>
              <!-- 图遍历参数 -->
              <div class="grid grid-cols-2 gap-3">
                <label class="space-y-1">
                  <span class="text-[10px] text-slate-500">maxDepth</span>
                  <input
                    v-model.number="graphTraversal.maxDepth"
                    type="number"
                    class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                  />
                </label>
                <label class="space-y-1">
                  <span class="text-[10px] text-slate-500">maxNeighbors</span>
                  <input
                    v-model.number="graphTraversal.maxNeighbors"
                    type="number"
                    class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                  />
                </label>
              </div>
              <!-- Token 预算 -->
              <div class="grid grid-cols-2 gap-3">
                <label class="space-y-1">
                  <span class="text-[10px] text-slate-500">maxEntityDescTokens</span>
                  <input
                    v-model.number="tokenBudget.maxEntityDescTokens"
                    type="number"
                    class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                  />
                </label>
                <label class="space-y-1">
                  <span class="text-[10px] text-slate-500">maxRelationDescTokens</span>
                  <input
                    v-model.number="tokenBudget.maxRelationDescTokens"
                    type="number"
                    class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                  />
                </label>
                <label class="space-y-1">
                  <span class="text-[10px] text-slate-500">maxChunkTokens</span>
                  <input
                    v-model.number="tokenBudget.maxChunkTokens"
                    type="number"
                    class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                  />
                </label>
                <label class="space-y-1">
                  <span class="text-[10px] text-slate-500">maxTotalTokens</span>
                  <input
                    v-model.number="tokenBudget.maxTotalTokens"
                    type="number"
                    class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                  />
                </label>
              </div>
            </div>
          </details>

          <!-- 执行按钮 -->
          <button
            type="button"
            class="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="searching || !canSearch"
            @click="handleSearch"
          >
            {{ searching ? '检索中...' : '执行 KG 检索' }}
          </button>

          <p v-if="searchError" class="text-sm text-rose-600">{{ searchError }}</p>
        </div>
      </section>

      <!-- 右栏：结果展示 -->
      <section
        class="us-devpage-card flex min-h-0 flex-col overflow-hidden rounded-2xl border shadow-sm"
      >
        <!-- 结果 Tab Bar -->
        <div class="flex items-center gap-1 border-b border-slate-200 px-5 py-3">
          <button
            v-for="tab in resultTabs"
            :key="tab.id"
            type="button"
            class="rounded-xl px-3 py-1.5 text-xs font-medium transition"
            :class="
              activeResultTab === tab.id
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            "
            @click="activeResultTab = tab.id"
          >
            {{ tab.label }}
            <span v-if="tab.count !== undefined" class="ml-1 opacity-70">({{ tab.count }})</span>
          </button>
        </div>

        <!-- 结果内容 -->
        <div class="min-h-0 flex-1 overflow-y-auto p-5">
          <!-- 无结果提示 -->
          <div
            v-if="!searchResult"
            class="flex h-full items-center justify-center text-sm text-slate-400"
          >
            执行检索后在此查看结果
          </div>

          <!-- 实体 Tab -->
          <div v-else-if="activeResultTab === 'entities'" class="space-y-2">
            <div
              v-if="searchResult.entities.length === 0"
              class="py-8 text-center text-sm text-slate-400"
            >
              无实体结果
            </div>
            <article
              v-for="entity in searchResult.entities"
              :key="entity.id"
              class="rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <h5 class="text-sm font-semibold text-slate-900">{{ entity.name }}</h5>
                    <span
                      class="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700"
                    >
                      {{ entity.entity_type }}
                    </span>
                  </div>
                  <p class="mt-1 line-clamp-3 text-xs leading-5 text-slate-600">
                    {{ entity.description }}
                  </p>
                </div>
                <span class="shrink-0 text-xs font-medium text-emerald-600">
                  {{ entity.score.toFixed(4) }}
                </span>
              </div>
            </article>
          </div>

          <!-- 关系 Tab -->
          <div v-else-if="activeResultTab === 'relations'" class="space-y-2">
            <div
              v-if="searchResult.relations.length === 0"
              class="py-8 text-center text-sm text-slate-400"
            >
              无关系结果
            </div>
            <article
              v-for="relation in searchResult.relations"
              :key="relation.id"
              class="rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <span>{{ relation.source_name }}</span>
                    <span class="text-slate-400">→</span>
                    <span>{{ relation.target_name }}</span>
                  </div>
                  <p class="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                    {{ relation.description }}
                  </p>
                  <div class="mt-1 flex flex-wrap gap-1">
                    <span
                      v-for="kw in relation.keywords.split(',')"
                      :key="kw"
                      class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500"
                    >
                      {{ kw.trim() }}
                    </span>
                  </div>
                </div>
                <span class="shrink-0 text-xs font-medium text-emerald-600">
                  {{ relation.score.toFixed(4) }}
                </span>
              </div>
            </article>
          </div>

          <!-- Chunks Tab -->
          <div v-else-if="activeResultTab === 'chunks'" class="space-y-2">
            <div
              v-if="searchResult.chunks.length === 0"
              class="py-8 text-center text-sm text-slate-400"
            >
              无 Chunk 结果
            </div>
            <article
              v-for="chunk in searchResult.chunks"
              :key="chunk.id"
              class="rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="truncate text-sm font-medium text-slate-900">
                      {{ chunk.file_name || chunk.file_key }}
                    </span>
                    <span
                      class="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                      :class="chunkSourceClass(chunk.source)"
                    >
                      {{ chunk.source }}
                    </span>
                  </div>
                  <p class="mt-1 line-clamp-4 text-xs leading-5 text-slate-600">
                    {{ chunk.content }}
                  </p>
                </div>
                <div class="flex shrink-0 flex-col items-end gap-1 text-[10px] text-slate-500">
                  <span class="font-medium text-emerald-600">{{ chunk.score.toFixed(4) }}</span>
                  <span>chunk #{{ chunk.chunk_index ?? '-' }}</span>
                </div>
              </div>
            </article>
          </div>

          <!-- 元信息 Tab -->
          <div v-else-if="activeResultTab === 'meta'" class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div class="rounded-2xl bg-slate-50 px-3 py-3">
                <div class="text-xs text-slate-400">检索模式</div>
                <div class="mt-1 text-lg font-semibold text-slate-900">
                  {{ searchResult.meta.mode }}
                </div>
              </div>
              <div class="rounded-2xl bg-slate-50 px-3 py-3">
                <div class="text-xs text-slate-400">耗时</div>
                <div class="mt-1 text-lg font-semibold text-slate-900">
                  {{ searchResult.meta.durationMs }}ms
                </div>
              </div>
              <div class="rounded-2xl bg-slate-50 px-3 py-3">
                <div class="text-xs text-slate-400">实体数</div>
                <div class="mt-1 text-lg font-semibold text-slate-900">
                  {{ searchResult.meta.entityCount }}
                </div>
              </div>
              <div class="rounded-2xl bg-slate-50 px-3 py-3">
                <div class="text-xs text-slate-400">关系数</div>
                <div class="mt-1 text-lg font-semibold text-slate-900">
                  {{ searchResult.meta.relationCount }}
                </div>
              </div>
              <div class="rounded-2xl bg-slate-50 px-3 py-3">
                <div class="text-xs text-slate-400">Chunks 数</div>
                <div class="mt-1 text-lg font-semibold text-slate-900">
                  {{ searchResult.meta.chunkCount }}
                </div>
              </div>
              <div class="rounded-2xl bg-slate-50 px-3 py-3">
                <div class="text-xs text-slate-400">重排</div>
                <div class="mt-1 text-lg font-semibold text-slate-900">
                  {{ searchResult.meta.rerankApplied ? '已应用' : '未应用' }}
                </div>
              </div>
            </div>
            <!-- 关键词提取结果 -->
            <div class="rounded-2xl border border-slate-200 bg-white p-4">
              <h4 class="text-sm font-semibold text-slate-900">提取的关键词</h4>
              <div class="mt-2 space-y-2">
                <div>
                  <span class="text-xs text-slate-500">高层级：</span>
                  <span class="text-xs text-slate-700">
                    {{ searchResult.meta.extractedKeywords.highLevel.join(', ') || '无' }}
                  </span>
                </div>
                <div>
                  <span class="text-xs text-slate-500">低层级：</span>
                  <span class="text-xs text-slate-700">
                    {{ searchResult.meta.extractedKeywords.lowLevel.join(', ') || '无' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 原始 JSON Tab -->
          <div v-else-if="activeResultTab === 'raw'">
            <div class="flex items-center justify-between">
              <span class="text-xs text-slate-500">原始响应 JSON</span>
              <button
                type="button"
                class="rounded-lg border border-slate-200 px-2 py-1 text-[10px] text-slate-500 transition hover:bg-slate-50"
                @click="handleCopyJson"
              >
                {{ copied ? '已复制' : '复制' }}
              </button>
            </div>
            <pre
              class="mt-2 max-h-[60vh] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-5 text-slate-100"
              >{{ rawJson }}</pre
            >
          </div>
        </div>

        <!-- 底部状态栏 -->
        <div
          v-if="searchResult"
          class="flex items-center gap-4 border-t border-slate-200 px-5 py-2.5 text-[10px] text-slate-500"
        >
          <span>{{ searchResult.meta.mode }} 模式</span>
          <span>{{ searchResult.meta.durationMs }}ms</span>
          <span>{{ searchResult.meta.entityCount }} 实体</span>
          <span>{{ searchResult.meta.relationCount }} 关系</span>
          <span>{{ searchResult.meta.chunkCount }} chunks</span>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { KGRetrievalMode, KGRetrievalSearchResult, KGGraphTableInfo } from '@preload/types'

// ============================================================================
// 状态
// ============================================================================

const connectionOk = ref(false)
const knowledgeBases = ref<Array<{ id: number; name: string; description: string }>>([])
const selectedKnowledgeBaseId = ref(0)
const graphTables = ref<KGGraphTableInfo[]>([])
const selectedGraphTableBase = ref('')

const mode = ref<KGRetrievalMode>('hybrid')
const query = ref('')

// Embedding 配置
const embeddingProviderId = ref('')
const embeddingModelId = ref('')
const embeddingDimensions = ref(3072)

// Provider 列表（从 modelConfig 获取）
const providers = ref<Array<{ id: string; name: string }>>([])

// 高级参数
const vectorSearch = reactive({
  entityTopK: 20,
  relationTopK: 20,
  chunkTopK: 60,
  ef: 100
})

const graphTraversal = reactive({
  maxDepth: 2,
  maxNeighbors: 10
})

const tokenBudget = reactive({
  maxEntityDescTokens: 2000,
  maxRelationDescTokens: 2000,
  maxChunkTokens: 4000,
  maxTotalTokens: 8000
})

// 搜索状态
const searching = ref(false)
const searchError = ref('')
const searchResult = ref<KGRetrievalSearchResult | null>(null)
const activeResultTab = ref<'entities' | 'relations' | 'chunks' | 'meta' | 'raw'>('entities')
const copied = ref(false)

// ============================================================================
// 计算属性
// ============================================================================

const canSearch = computed(() => {
  return (
    selectedKnowledgeBaseId.value > 0 &&
    selectedGraphTableBase.value !== '' &&
    query.value.trim() !== '' &&
    embeddingProviderId.value !== '' &&
    embeddingModelId.value !== ''
  )
})

const modeOptions = [
  { value: 'local' as KGRetrievalMode, label: 'Local（实体中心）' },
  { value: 'global' as KGRetrievalMode, label: 'Global（关系中心）' },
  { value: 'hybrid' as KGRetrievalMode, label: 'Hybrid（推荐）' },
  { value: 'naive' as KGRetrievalMode, label: 'Naive（纯向量）' }
]

const resultTabs = computed(() => [
  { id: 'entities' as const, label: '实体', count: searchResult.value?.entities.length },
  { id: 'relations' as const, label: '关系', count: searchResult.value?.relations.length },
  { id: 'chunks' as const, label: 'Chunks', count: searchResult.value?.chunks.length },
  { id: 'meta' as const, label: '元信息', count: undefined },
  { id: 'raw' as const, label: '原始JSON', count: undefined }
])

const rawJson = computed(() => {
  if (!searchResult.value) return '暂无结果'
  return JSON.stringify(searchResult.value, null, 2)
})

// ============================================================================
// 方法
// ============================================================================

function chunkSourceClass(source: string): string {
  if (source === 'entity_expansion') return 'border-blue-200 bg-blue-50 text-blue-700'
  if (source === 'relation_expansion') return 'border-purple-200 bg-purple-50 text-purple-700'
  return 'border-slate-200 bg-slate-50 text-slate-500'
}

async function loadKnowledgeBases(): Promise<void> {
  try {
    const response = await window.api.knowledgeDatabase.listKnowledgeBases()
    if (response.success) {
      knowledgeBases.value = response.data.knowledgeBases
    }
  } catch {
    // 忽略
  }
}

async function checkConnection(): Promise<void> {
  try {
    const response = await window.api.knowledgeDatabase.checkConnection()
    connectionOk.value = response.success && response.data.connected
  } catch {
    connectionOk.value = false
  }
}

async function loadProviders(): Promise<void> {
  try {
    const response = await window.api.modelConfig.getConfig()
    if (response.success) {
      providers.value = response.data.providers.map((p) => ({
        id: p.id,
        name: p.name
      }))
    }
  } catch {
    // 忽略
  }
}

async function handleKnowledgeBaseChange(): Promise<void> {
  selectedGraphTableBase.value = ''
  graphTables.value = []
  if (selectedKnowledgeBaseId.value <= 0) return

  try {
    const response = await window.api.knowledgeDatabase.getKGGraphTables(
      selectedKnowledgeBaseId.value
    )
    if (response.success) {
      graphTables.value = response.data.graphs || []
      // 自动选择第一个图谱表
      if (graphTables.value.length > 0) {
        selectedGraphTableBase.value = graphTables.value[0].graphTableBase
      }
    }
  } catch {
    // 忽略
  }
}

async function handleSearch(): Promise<void> {
  if (!canSearch.value) return

  searching.value = true
  searchError.value = ''
  searchResult.value = null

  try {
    const response = await window.api.knowledgeDatabase.kgRetrievalSearch({
      query: query.value.trim(),
      mode: mode.value,
      knowledgeBaseId: selectedKnowledgeBaseId.value,
      graphTableBase: selectedGraphTableBase.value,
      embeddingProviderId: embeddingProviderId.value,
      embeddingModelId: embeddingModelId.value,
      embeddingDimensions: embeddingDimensions.value,
      vectorSearch: { ...vectorSearch },
      graphTraversal: { ...graphTraversal },
      tokenBudget: { ...tokenBudget }
    })

    if (response.success) {
      searchResult.value = response.data
      activeResultTab.value = 'entities'
    } else {
      searchError.value = response.error || 'KG 检索失败'
    }
  } catch (error) {
    searchError.value = error instanceof Error ? error.message : '检索请求异常'
  } finally {
    searching.value = false
  }
}

function handleCopyJson(): void {
  navigator.clipboard.writeText(rawJson.value)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

// ============================================================================
// 初始化
// ============================================================================

onMounted(async () => {
  await Promise.all([checkConnection(), loadKnowledgeBases(), loadProviders()])
})
</script>
