<template>
  <div
    class="ls-pubmed-search-7f3a border rounded-xl overflow-hidden transition-all bg-white border-slate-200 shadow-sm hover:shadow-md"
  >
    <!-- Header -->
    <div
      class="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center cursor-pointer select-none"
      @click="isExpanded = !isExpanded"
    >
      <div class="flex items-center gap-3">
        <!-- 状态图标 -->
        <div class="relative">
          <div
            class="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 border border-blue-200"
          >
            <svg
              class="w-[18px] h-[18px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <div
            v-if="parsedResult.status === 'success'"
            class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"
          ></div>
        </div>

        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-sm font-bold text-slate-700">{{ parsedResult.toolName }}</h2>
            <span
              v-if="parsedResult.latency"
              class="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-mono"
            >
              {{ parsedResult.latency }}
            </span>
          </div>
          <div class="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
            <svg class="w-[10px] h-[10px]" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
              />
            </svg>
            {{ parsedResult.searchParams.database }}
            <span class="mx-1 text-slate-300">|</span>
            <span>Found {{ parsedResult.searchParams.totalFound }} results</span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <svg
          v-if="isExpanded"
          class="w-4 h-4 text-slate-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="m18 15-6-6-6 6" />
        </svg>
        <svg
          v-else
          class="w-4 h-4 text-slate-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </div>

    <!-- Query Display (单独一行) -->
    <div class="px-4 py-3 bg-blue-50/50 border-b border-slate-200">
      <div class="flex items-start gap-2">
        <svg
          class="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <div class="flex-1 min-w-0">
          <div class="text-[10px] text-blue-600 font-semibold uppercase tracking-wider mb-1">
            Search Query
          </div>
          <div class="text-xs text-slate-700 font-mono break-words leading-relaxed">
            {{ parsedResult.searchParams.query }}
          </div>
        </div>
      </div>
    </div>

    <!-- Body: 结果列表 -->
    <div v-if="isExpanded" class="divide-y divide-slate-100">
      <div
        v-for="(paper, paperIdx) in parsedResult.items"
        :key="paper.uid"
        class="p-4 hover:bg-slate-50/80 transition-colors group relative"
      >
        <div class="flex gap-4">
          <!-- 左侧：序号 -->
          <div class="pt-1 flex-shrink-0">
            <div
              class="w-6 h-6 rounded bg-slate-100 text-slate-400 flex items-center justify-center text-xs font-mono"
            >
              {{ paperIdx + 1 }}
            </div>
          </div>

          <!-- 右侧：内容 -->
          <div class="flex-1 min-w-0">
            <!-- 标题 -->
            <div class="flex justify-between items-start gap-2">
              <h3
                class="text-base font-semibold text-blue-900 leading-snug cursor-pointer hover:text-blue-700 hover:underline decoration-blue-300 underline-offset-2"
                @click="openAbstractModal(paper)"
              >
                {{ paper.title }}
              </h3>
            </div>

            <!-- 元数据 -->
            <div
              class="mt-2 flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 font-medium"
            >
              <span class="font-serif italic text-slate-700 bg-slate-100 px-1.5 rounded">
                {{ paper.source }}
              </span>
              <span class="text-slate-400">|</span>
              <span>{{ paper.pub_date }}</span>
              <span class="text-slate-400">|</span>
              <span class="truncate max-w-[150px]">
                {{ paper.authors[0] }}
                <span v-if="paper.authors.length > 1">et al.</span>
              </span>
              <span class="text-slate-400">|</span>
              <span class="font-mono text-slate-400 select-all">PMID: {{ paper.uid }}</span>
            </div>

            <!-- 操作栏 -->
            <div class="mt-3 flex items-center gap-2">
              <!-- 查看详情按钮 -->
              <button
                @click="openAbstractModal(paper)"
                class="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 px-2.5 py-1.5 rounded-md hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
              >
                <svg
                  class="w-[14px] h-[14px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                View Abstract
              </button>

              <!-- TODO: 加入知识库功能（后端对接留桩） -->
              <button
                v-if="paper.fullTextAvailable"
                @click="toggleAddToKnowledge(paper.uid)"
                :class="[
                  'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md transition-all shadow-sm',
                  addedPaperIds.has(paper.uid)
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-800'
                ]"
              >
                <svg
                  v-if="addedPaperIds.has(paper.uid)"
                  class="w-[14px] h-[14px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <svg
                  v-else
                  class="w-[14px] h-[14px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                {{ addedPaperIds.has(paper.uid) ? 'Added to Context' : 'Add to KB' }}
              </button>

              <!-- Abstract Only (不可下载全文) -->
              <div
                v-else
                class="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                title="Full text not available"
              >
                <svg
                  class="w-[14px] h-[14px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                </svg>
                Abstract Only
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer: 提示信息 -->
    <div
      v-if="isExpanded"
      class="bg-slate-50 px-4 py-2 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between"
    >
      <span>Data provided by NCBI E-utilities API</span>
      <span>
        Displaying top {{ parsedResult.searchParams.retMax }} of
        {{ parsedResult.searchParams.totalFound }}
      </span>
    </div>
  </div>

  <!-- Abstract 详情模态框 -->
  <Teleport to="body">
    <div
      v-if="selectedPaper"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      @click.self="closeAbstractModal"
    >
      <div
        class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
      >
        <!-- Modal Header -->
        <div class="p-5 border-b border-gray-100 flex justify-between items-start bg-slate-50">
          <div>
            <h3 class="font-serif text-lg font-bold text-slate-800 leading-tight pr-4">
              {{ selectedPaper.title }}
            </h3>
            <div class="flex items-center gap-2 mt-2 text-xs text-slate-500 font-mono">
              <span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                PMID: {{ selectedPaper.uid }}
              </span>
              <span>{{ selectedPaper.doi }}</span>
            </div>
          </div>
          <button
            @click="closeAbstractModal"
            class="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <svg
              class="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Modal Body (Scrollable) -->
        <div class="p-6 overflow-y-auto">
          <div class="mb-4 text-sm text-slate-600 italic border-l-4 border-blue-400 pl-3">
            {{ selectedPaper.authors.join(', ') }} •
            <span class="font-semibold">{{ selectedPaper.source }}</span>
            ({{ selectedPaper.pub_date }})
          </div>

          <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Abstract</h4>
          <p class="text-slate-700 leading-relaxed text-sm text-justify whitespace-pre-line">
            {{ selectedPaper.abstract }}
          </p>

          <div class="mt-6 pt-4 border-t border-dashed border-gray-200 flex justify-end">
            <a
              :href="`https://pubmed.ncbi.nlm.nih.gov/${selectedPaper.uid}/`"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
            >
              Read Full Text on NCBI
              <svg
                class="w-[14px] h-[14px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <path d="M15 3h6v6" />
                <path d="M10 14L21 3" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface PubmedPaper {
  uid: string
  title: string
  source: string
  pub_date: string
  volume?: string
  issue?: string
  authors: string[]
  abstract: string
  doi: string
  fullTextAvailable: boolean // 是否可下载全文
}

interface PubmedSearchParams {
  database: string
  query: string
  retMax: number
  totalFound: number
}

interface PubmedSearchResult {
  toolName: string
  status: 'success' | 'pending' | 'error'
  latency?: string
  searchParams: PubmedSearchParams
  items: PubmedPaper[]
}

const props = defineProps<{
  result?: string | object | undefined // 可以是 JSON 字符串、已解析的对象或 undefined
}>()

// 状态管理
const isExpanded = ref(true)
const selectedPaper = ref<PubmedPaper | null>(null)
const addedPaperIds = ref<Set<string>>(new Set())

// 解析结果
const parsedResult = computed<PubmedSearchResult>(() => {
  try {
    if (!props.result) {
      return {
        toolName: 'PubMed Retriever',
        status: 'pending',
        searchParams: {
          database: 'pubmed',
          query: '等待中...',
          retMax: 0,
          totalFound: 0
        },
        items: []
      }
    }

    // 如果是字符串，尝试解析为 JSON
    const data = typeof props.result === 'string' ? JSON.parse(props.result) : props.result

    return {
      toolName: data.tool_name || 'PubMed Retriever',
      status: data.status || 'success',
      latency: data.latency,
      searchParams: {
        database: data.search_params?.database || 'pubmed',
        query: data.search_params?.query || '',
        retMax: data.search_params?.ret_max || 0,
        totalFound: data.search_params?.total_found || 0
      },
      items: data.items || []
    }
  } catch {
    return {
      toolName: 'PubMed Retriever',
      status: 'error',
      searchParams: {
        database: 'pubmed',
        query: '解析失败',
        retMax: 0,
        totalFound: 0
      },
      items: []
    }
  }
})

// 打开摘要详情
function openAbstractModal(paper: PubmedPaper): void {
  selectedPaper.value = paper
}

// 关闭摘要详情
function closeAbstractModal(): void {
  selectedPaper.value = null
}

// TODO: 加入知识库功能（后端对接留桩）
function toggleAddToKnowledge(uid: string): void {
  if (addedPaperIds.value.has(uid)) {
    addedPaperIds.value.delete(uid)
  } else {
    addedPaperIds.value.add(uid)
  }
  // TODO: 调用后端 API 将文献添加到知识库
  // 示例：await window.api.knowledgeBase.addPubmedPaper({ uid, ... })
}
</script>
