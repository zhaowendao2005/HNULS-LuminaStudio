<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
        @click.self="$emit('update:modelValue', false)"
      >
        <div
          class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col animate-in"
        >
          <!-- Header -->
          <div
            class="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-indigo-50"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center"
              >
                <svg
                  class="w-5 h-5 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M9 12h6" />
                  <path d="M9 16h6" />
                  <path d="M9 8h6" />
                  <path
                    d="M4 18V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"
                  />
                </svg>
              </div>
              <div>
                <h3 class="text-base font-semibold text-slate-800">检索结果详情</h3>
                <p class="text-xs text-slate-500">
                  {{ detail?.scope.tableName }} - 条目 #{{ (detail?.hitIdx ?? 0) + 1 }}
                </p>
              </div>
            </div>
            <button
              @click="$emit('update:modelValue', false)"
              class="w-8 h-8 rounded-lg hover:bg-white/60 transition-colors flex items-center justify-center text-slate-400 hover:text-slate-600"
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

          <!-- Content -->
          <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <!-- Metadata -->
            <div class="bg-slate-50 rounded-xl p-4 space-y-2.5">
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-slate-500 w-20">文件名:</span>
                <span class="text-xs text-slate-700 font-medium flex-1">
                  {{ detail?.hit.file_name || '未知文件' }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-slate-500 w-20">文档块:</span>
                <span class="text-xs text-slate-700">
                  {{ detail?.hit.chunk_index !== undefined ? `第 ${detail.hit.chunk_index} 块` : '未知' }}
                </span>
              </div>
              <div v-if="detail?.hit.distance !== undefined" class="flex items-center gap-2">
                <span class="text-xs font-semibold text-slate-500 w-20">向量距离:</span>
                <span class="text-xs text-slate-700 font-mono">
                  {{ detail.hit.distance.toFixed(6) }}
                </span>
              </div>
              <div v-if="detail?.hit.rerank_score !== undefined" class="flex items-center gap-2">
                <span class="text-xs font-semibold text-slate-500 w-20">重排分数:</span>
                <span class="text-xs text-slate-700 font-mono">
                  {{ detail.hit.rerank_score.toFixed(6) }}
                </span>
              </div>
            </div>

            <!-- Full Content -->
            <div class="space-y-2">
              <div class="text-xs font-semibold text-slate-500">完整内容</div>
              <div
                class="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words"
              >
                {{ detail?.hit.content || '无内容' }}
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-slate-200 bg-slate-50">
            <div class="flex items-center justify-between">
              <div class="text-xs text-slate-400">
                知识库ID: {{ detail?.scope.knowledgeBaseId }}
              </div>
              <button
                @click="$emit('update:modelValue', false)"
                class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
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

interface DetailPayload {
  scope: KnowledgeSearchResultScope
  hit: RetrievalHit
  scopeIdx: number
  hitIdx: number
}

defineProps<{
  modelValue: boolean
  detail: DetailPayload | null
}>()

defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()
</script>

<style scoped>
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-active .animate-in {
  animation: scale-in 0.2s ease;
}

@keyframes scale-in {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
