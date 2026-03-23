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
            <WhiteSelect
              :model-value="selectedKnowledgeBaseId"
              :options="knowledgeBaseOptions"
              placeholder="选择知识库..."
              @update:model-value="handleKnowledgeBaseSelect"
            />
          </label>

          <!-- 图谱表选择 -->
          <label class="space-y-2">
            <span class="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              图谱表
            </span>
            <WhiteSelect
              :model-value="selectedGraphTableBase"
              :options="graphTableOptions"
              placeholder="选择图谱表..."
              :disabled="graphTableOptions.length === 0"
              @update:model-value="handleGraphTableSelect"
            />
            <div
              class="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-3 py-2 text-[10px] text-slate-500"
            >
              <div>??????{{ selectedGraphTableBase || '???' }}</div>
              <div>??????{{ graphTables.length }}</div>
            </div>
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

          <div class="grid gap-3 sm:grid-cols-2">
            <label class="space-y-2">
              <span class="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                高层级关键词
              </span>
              <textarea
                v-model="highLevelKeywordsInput"
                rows="2"
                class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                placeholder="如：研究方向，核心议题（逗号或换行分隔）"
              ></textarea>
              <p class="text-[11px] leading-4 text-slate-400">
                高层级关键词用于 global / hybrid 的关系检索，留空时回退到 Query。
              </p>
            </label>

            <label class="space-y-2">
              <span class="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                低层级关键词
              </span>
              <textarea
                v-model="lowLevelKeywordsInput"
                rows="2"
                class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                placeholder="如：模型名称，具体术语（逗号或换行分隔）"
              ></textarea>
              <p class="text-[11px] leading-4 text-slate-400">
                低层级关键词用于 local / hybrid 的实体检索，留空时回退到 Query。
              </p>
            </label>
          </div>
          <p class="text-[11px] leading-4 text-slate-400">
            两栏都留空时不会传关键词字段，后端会按 Query 自动 fallback。
          </p>

          <!-- 重排配置：只在启用时出现，模型由知识库系统侧提供并调用 -->
          <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  重排配置
                </div>
                <div class="mt-1 text-sm text-slate-600">
                  只有启用重排时才会额外选择模型，知识库系统会自己去调用这个模型。
                </div>
              </div>
              <button
                type="button"
                class="rounded-full border px-3 py-1 text-[10px] font-medium transition"
                :class="
                  rerankEnabled
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-600'
                "
                @click="toggleRerank"
              >
                {{ rerankEnabled ? '已开启' : '已关闭' }}
              </button>
            </div>

            <div class="grid grid-cols-2 gap-3 rounded-xl border border-white bg-white px-3 py-2">
              <div>
                <div class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  知识库系统模型
                </div>
                <div class="mt-1 text-sm font-medium text-slate-900">
                  {{ `${kgModels.length} 个可用模型` }}
                </div>
              </div>
              <div>
                <div class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  图谱表维度
                </div>
                <div class="mt-1 text-sm font-medium text-slate-900">
                  {{ selectedGraphTableBase || '???' }}
                </div>
              </div>
            </div>

            <div v-if="rerankEnabled" class="space-y-3 border-t border-slate-200 pt-3">
              <label class="space-y-2">
                <span class="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  重排模型
                </span>
                <WhiteSelect
                  :model-value="rerankModelKey"
                  :options="rerankModelOptions"
                  placeholder="选择重排模型..."
                  :disabled="rerankModelOptions.length === 0"
                  @update:model-value="handleRerankModelSelect"
                />
              </label>

              <label class="space-y-2">
                <span class="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  rerank topN
                </span>
                <input
                  v-model.number="rerankTopN"
                  type="number"
                  min="1"
                  class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <p v-if="rerankModelOptions.length === 0" class="text-xs leading-5 text-slate-500">
                当前没有可用的重排模型，请先在知识库系统里配置可用 provider / model。
              </p>
            </div>

            <p v-else class="text-xs leading-5 text-slate-500">
              未启用重排时，这里不会把任何模型信息带到请求里。
            </p>
          </div>

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
import WhiteSelect, { type WhiteSelectOption } from '@renderer/components/WhiteSelect/index.vue'
import type {
  KGGraphTableInfo,
  KGModelInfo,
  KGRetrievalMode,
  KGRetrievalSearchResult
} from '@preload/types'

type KnowledgeBaseItem = { id: number; name: string; description: string }

// ============================================================================
// 状态
// ============================================================================

const connectionOk = ref(false)
const knowledgeBases = ref<KnowledgeBaseItem[]>([])
const selectedKnowledgeBaseId = ref(0)
const graphTables = ref<KGGraphTableInfo[]>([])
const selectedGraphTableBase = ref('')

const mode = ref<KGRetrievalMode>('hybrid')
const query = ref('')
const highLevelKeywordsInput = ref('')
const lowLevelKeywordsInput = ref('')

// 重排配置
const kgModels = ref<KGModelInfo[]>([])
const rerankEnabled = ref(false)
const rerankModelKey = ref('')
const rerankTopN = ref(10)

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

const knowledgeBaseOptions = computed<Array<WhiteSelectOption<number>>>(() =>
  knowledgeBases.value.map((kb) => ({
    label: `${kb.name} (KB #${kb.id})`,
    value: kb.id
  }))
)

const graphTableOptions = computed<Array<WhiteSelectOption<string>>>(() =>
  graphTables.value.map((gt) => ({
    label: `${gt.displayName || gt.graphTableBase} (${gt.entityCount} entities, ${gt.relationCount} relations)`,
    value: gt.graphTableBase
  }))
)

const rerankModelOptions = computed<Array<WhiteSelectOption<string>>>(() =>
  kgModels.value.map((model) => ({
    label: `${model.providerName} / ${model.displayName}`,
    value: model.id
  }))
)

const selectedRerankModel = computed(
  () => kgModels.value.find((model) => model.id === rerankModelKey.value) ?? null
)

const canSearch = computed(() => {
  if (selectedGraphTableBase.value === '' || query.value.trim() === '') {
    return false
  }

  if (rerankEnabled.value && !selectedRerankModel.value) {
    return false
  }

  return true
})

const modeOptions = [
  { value: 'local' as KGRetrievalMode, label: 'Local（实体中心）' },
  { value: 'global' as KGRetrievalMode, label: 'Global（关系中心）' },
  { value: 'hybrid' as KGRetrievalMode, label: 'Hybrid（推荐）' },
  { value: 'naive' as KGRetrievalMode, label: 'Naive（纯向量）' }
]

const resultTabs = computed(() => [
  {
    id: 'entities' as const,
    label: '实体',
    count: searchResult.value?.entities?.length ?? 0
  },
  {
    id: 'relations' as const,
    label: '关系',
    count: searchResult.value?.relations?.length ?? 0
  },
  {
    id: 'chunks' as const,
    label: 'Chunks',
    count: searchResult.value?.chunks?.length ?? 0
  },
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
      knowledgeBases.value = response.data?.knowledgeBases ?? []
    }
  } catch {
    // 忽略
  }
}

async function checkConnection(): Promise<void> {
  try {
    const response = await window.api.knowledgeDatabase.checkConnection()
    connectionOk.value = Boolean(response.success && response.data?.connected)
  } catch {
    connectionOk.value = false
  }
}

async function loadKGModels(): Promise<void> {
  try {
    const response = await window.api.knowledgeDatabase.listKGModels()
    if (!response.success) {
      kgModels.value = []
      return
    }

    kgModels.value = Array.isArray(response.data) ? response.data : []

    if (rerankEnabled.value && !selectedRerankModel.value) {
      rerankModelKey.value = kgModels.value[0]?.id ?? ''
    }
  } catch {
    kgModels.value = []
  }
}

function ensureRerankModelSelected(): void {
  if (selectedRerankModel.value || rerankModelOptions.value.length === 0) {
    return
  }

  rerankModelKey.value = rerankModelOptions.value[0]?.value ?? ''
}

function toggleRerank(): void {
  rerankEnabled.value = !rerankEnabled.value
  if (rerankEnabled.value) {
    ensureRerankModelSelected()
  }
}

function handleRerankModelSelect(value: string | number | null): void {
  rerankModelKey.value = typeof value === 'string' ? value : String(value || '')
}

async function handleKnowledgeBaseSelect(value: string | number | null): Promise<void> {
  const nextKnowledgeBaseId = typeof value === 'number' ? value : Number(value || 0)
  selectedKnowledgeBaseId.value = nextKnowledgeBaseId
  selectedGraphTableBase.value = ''
  graphTables.value = []

  if (nextKnowledgeBaseId <= 0) {
    return
  }

  try {
    const response = await window.api.knowledgeDatabase.getKGGraphTables(nextKnowledgeBaseId)
    if (response.success) {
      graphTables.value = Array.isArray(response.data) ? response.data : []
      if (graphTables.value.length > 0) {
        selectedGraphTableBase.value = graphTables.value[0].graphTableBase
      }
    }
  } catch {
    // ???
  }
}

function handleGraphTableSelect(value: string | number | null): void {
  selectedGraphTableBase.value = typeof value === 'string' ? value : String(value || '')
}

function parseKeywordInput(rawValue: string): string[] {
  // 中文注释：支持中文逗号、英文逗号和换行混输；每个词会 trim 后再去掉空项。
  return rawValue
    .split(/[,\n，]+/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

async function handleSearch(): Promise<void> {
  if (!canSearch.value) return

  searching.value = true
  searchError.value = ''
  searchResult.value = null

  try {
    const highLevelKeywords = parseKeywordInput(highLevelKeywordsInput.value)
    const lowLevelKeywords = parseKeywordInput(lowLevelKeywordsInput.value)
    const rerankConfig =
      rerankEnabled.value && selectedRerankModel.value
        ? {
            enabled: true,
            modelId: selectedRerankModel.value.id,
            topN: Number.isFinite(rerankTopN.value) ? Math.max(1, rerankTopN.value) : 1
          }
        : undefined

    const response = await window.api.knowledgeDatabase.kgRetrievalSearch({
      query: query.value.trim(),
      mode: mode.value,
      graphTableBase: selectedGraphTableBase.value,
      // 中文注释：关键词为空时不下发字段，确保服务端仍能识别“只传 query”的 fallback 语义。
      ...(highLevelKeywords.length > 0 ? { highLevelKeywords } : {}),
      ...(lowLevelKeywords.length > 0 ? { lowLevelKeywords } : {}),
      rerank: rerankConfig
    })

    if (response.success) {
      searchResult.value = {
        entities: Array.isArray(response.data?.entities) ? response.data.entities : [],
        relations: Array.isArray(response.data?.relations) ? response.data.relations : [],
        chunks: Array.isArray(response.data?.chunks) ? response.data.chunks : [],
        meta: response.data?.meta ?? {
          mode: mode.value,
          extractedKeywords: {
            highLevel: [],
            lowLevel: []
          },
          entityCount: 0,
          relationCount: 0,
          chunkCount: 0,
          durationMs: 0,
          rerankApplied: false
        }
      }
      activeResultTab.value = 'entities'
    } else {
      searchError.value = response.error || 'KG ???????'
    }
  } catch (error) {
    searchError.value = error instanceof Error ? error.message : '??????????'
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
  await Promise.all([checkConnection(), loadKnowledgeBases(), loadKGModels()])
  if (knowledgeBases.value.length > 0 && selectedKnowledgeBaseId.value === 0) {
    await handleKnowledgeBaseSelect(knowledgeBases.value[0].id)
  }
  if (rerankEnabled.value) {
    ensureRerankModelSelected()
  }
})
</script>
