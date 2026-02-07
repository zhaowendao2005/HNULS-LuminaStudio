<template>
  <div
    class="border rounded-xl overflow-hidden transition-all bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200"
  >
    <!-- Header -->
    <div class="bg-purple-100 border-b border-purple-200 px-4 py-2.5">
      <div class="flex items-center gap-2">
        <svg
          class="w-4 h-4 text-purple-600 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
          <path d="M11 8v6" />
          <path d="M8 11h6" />
        </svg>
        <span class="text-xs font-semibold text-purple-700">知识库检索</span>
        <span v-if="rerankModelId" class="text-[10px] text-purple-400 font-normal">
          (rerank: {{ rerankModelId }})
        </span>
      </div>
    </div>

    <!-- Query -->
    <div class="px-4 py-3 bg-white/60 border-b border-purple-100">
      <div class="text-[10px] text-purple-400 font-medium mb-1">检索查询</div>
      <div class="text-xs text-purple-900 font-medium break-words line-clamp-2">
        {{ truncateText(parsedResult.query, 20) }}
      </div>
    </div>

    <!-- Results by Scope -->
    <div class="space-y-0">
      <div
        v-for="(scope, scopeIdx) in parsedResult.scopes"
        :key="scopeIdx"
        class="border-b border-purple-100 last:border-b-0"
      >
        <!-- Scope Header -->
        <div class="px-4 py-2 bg-indigo-50/70">
          <div class="flex items-center justify-between">
            <div class="text-[10px] text-indigo-600 font-medium">
              嵌入表{{ scopeIdx + 1 }}: {{ scope.tableName }}
              <span v-if="scope.fileKeysCount > 0" class="text-indigo-400">
                ({{ scope.fileKeysCount }} 文档)
              </span>
            </div>
            <div v-if="scope.hits" class="text-[10px] text-indigo-400">
              {{ scope.hits.length }} 条结果
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="scope.error" class="px-4 py-3 bg-red-50">
          <div class="text-xs text-red-600">⚠️ {{ scope.error }}</div>
        </div>

        <!-- Hits -->
        <div v-else-if="scope.hits && scope.hits.length > 0" class="divide-y divide-purple-50">
          <div
            v-for="(hit, hitIdx) in scope.hits"
            :key="hit.id"
            class="px-4 py-3 bg-white/40 hover:bg-white/70 transition-colors"
          >
            <div class="flex items-start justify-between gap-2 mb-1.5">
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <span class="text-[10px] text-purple-400 font-bold flex-shrink-0">
                  #{{ hitIdx + 1 }}
                </span>
                <span
                  v-if="hit.file_name"
                  class="text-[10px] text-slate-500 truncate font-medium"
                  :title="hit.file_name"
                >
                  {{ hit.file_name }}
                </span>
                <span v-if="hit.chunk_index !== undefined" class="text-[9px] text-slate-400">
                  chunk {{ hit.chunk_index }}
                </span>
              </div>
              <button
                @click="$emit('show-detail', { scope, hit, scopeIdx, hitIdx })"
                class="flex-shrink-0 text-[10px] text-purple-500 hover:text-purple-700 font-medium transition-colors flex items-center gap-0.5"
              >
                <span>详情</span>
                <svg
                  class="w-3 h-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>

            <!-- Content Preview -->
            <div class="text-xs text-slate-700 leading-relaxed break-words line-clamp-2 pl-6">
              {{ truncateText(hit.content, 20) }}
            </div>

            <!-- Metadata -->
            <div
              v-if="hit.distance !== undefined || hit.rerank_score !== undefined"
              class="flex items-center gap-3 mt-1.5 pl-6"
            >
              <span v-if="hit.distance !== undefined" class="text-[9px] text-slate-400">
                距离: {{ hit.distance.toFixed(4) }}
              </span>
              <span v-if="hit.rerank_score !== undefined" class="text-[9px] text-slate-400">
                重排分: {{ hit.rerank_score.toFixed(4) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="px-4 py-3 bg-white/40">
          <div class="text-xs text-slate-400 text-center">暂无结果</div>
        </div>
      </div>
    </div>

    <!-- Footer Summary -->
    <div class="px-4 py-2 bg-purple-50 border-t border-purple-100">
      <div class="text-[10px] text-purple-500 text-center">
        共检索 {{ parsedResult.totalScopes }} 个嵌入表，返回 {{ totalHits }} 条结果
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface RetrievalHit {
  id: string
  content: string
  chunk_index?: number
  file_key?: string
  file_name?: string
  distance?: number
  rerank_score?: number
}

interface KnowledgeSearchResultScope {
  knowledgeBaseId: number
  tableName: string
  fileKeysCount: number
  hits?: RetrievalHit[]
  error?: string
}

interface KnowledgeSearchResult {
  query: string
  totalScopes: number
  scopes: KnowledgeSearchResultScope[]
}

import type { NodeBlock } from '@renderer/stores/ai-chat/chat-message/types'

const props = defineProps<{
  result?: string | object | undefined // 可以是 JSON 字符串、已解析的对象或 undefined
  nodeBlock?: NodeBlock // 可选：如果传入 nodeBlock，可以访问 rerankModelId
}>()

defineEmits<{
  (
    e: 'show-detail',
    payload: {
      scope: KnowledgeSearchResultScope
      hit: RetrievalHit
      scopeIdx: number
      hitIdx: number
    }
  ): void
}>()

// 解析结果
const parsedResult = computed<KnowledgeSearchResult>(() => {
  try {
    if (!props.result) {
      return {
        query: '',
        totalScopes: 0,
        scopes: [
          {
            knowledgeBaseId: 0,
            tableName: '等待中',
            fileKeysCount: 0,
            error: '检索结果尚未返回'
          }
        ]
      }
    }
    if (typeof props.result === 'string') {
      return JSON.parse(props.result)
    }
    return props.result as KnowledgeSearchResult
  } catch (err) {
    console.error('Failed to parse knowledge search result:', err, props.result)
    return {
      query: '',
      totalScopes: 0,
      scopes: [
        {
          knowledgeBaseId: 0,
          tableName: '解析错误',
          fileKeysCount: 0,
          error: '无法解析检索结果'
        }
      ]
    }
  }
})

// 计算总命中数
const totalHits = computed(() => {
  if (!parsedResult.value?.scopes) return 0
  return parsedResult.value.scopes.reduce((total, scope) => {
    return total + (scope.hits?.length ?? 0)
  }, 0)
})

// 文本截断函数（按字数截断，支持自动换行）
function truncateText(text: string, maxChars: number): string {
  if (!text) return ''
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars) + '...'
}

// 重排模型 ID
const rerankModelId = computed(() => {
  return (
    props.nodeBlock?.start?.rerankModelId ||
    props.nodeBlock?.result?.rerankModelId ||
    null
  )
})
</script>
