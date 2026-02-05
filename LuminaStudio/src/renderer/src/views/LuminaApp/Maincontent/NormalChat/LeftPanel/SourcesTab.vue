<template>
  <div class="space-y-3">
    <!-- 连接状态/错误提示 -->
    <div
      v-if="sourcesStore.error || !sourcesStore.connectionState.connected"
      class="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700"
    >
      <div v-if="sourcesStore.connectionState.checking" class="flex items-center gap-2">
        <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span>检查连接中...</span>
      </div>
      <div v-else>
        {{ sourcesStore.error || '知识库服务未连接' }}
        <button @click="handleRetry" class="ml-2 underline hover:text-amber-900">重试</button>
      </div>
    </div>

    <!-- 搜索框 -->
    <div class="relative">
      <svg
        class="absolute left-3 top-2.5 w-4 h-4 text-slate-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索知识库或文档..."
        class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all"
      />
    </div>

    <!-- 操作按钮组 -->
    <div class="flex gap-2">
      <button
        @click="sourcesStore.selectAll()"
        class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:border-emerald-200 hover:text-emerald-600 transition-colors"
      >
        <svg
          class="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        全选
      </button>
      <button
        @click="sourcesStore.deselectAll()"
        class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:border-slate-300 transition-colors"
      >
        <svg
          class="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
        清空
      </button>
    </div>

    <!-- 加载中状态 -->
    <div v-if="sourcesStore.isLoading" class="flex items-center justify-center py-8">
      <svg class="w-6 h-6 animate-spin text-emerald-500" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    </div>

    <!-- 知识库树形列表 -->
    <div v-else class="space-y-2">
      <div
        v-for="kb in filteredKnowledgeBases"
        :key="kb.id"
        class="rounded-lg border border-slate-100 bg-white hover:border-slate-200 transition-colors"
      >
        <!-- 知识库节点 -->
        <div
          class="flex items-center gap-2 px-3 py-2.5 cursor-pointer"
          @click="sourcesStore.toggleKnowledgeBase(kb.id)"
        >
          <!-- 展开/折叠图标 -->
          <svg
            :class="[
              'w-3.5 h-3.5 text-slate-400 transition-transform flex-shrink-0',
              sourcesStore.isKnowledgeBaseExpanded(kb.id) ? 'rotate-90' : ''
            ]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>

          <!-- 知识库图标 -->
          <div
            class="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0"
          >
            <svg
              class="w-4 h-4 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>

          <!-- 知识库名称 -->
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-slate-700 truncate">{{ kb.name }}</div>
            <div class="text-xs text-slate-400">
              <span v-if="kb.documentsLoading">加载中...</span>
              <span v-else>{{ kb.documents.length }} 个文档</span>
            </div>
          </div>

          <!-- 知识库选择框 -->
          <input
            type="checkbox"
            :checked="sourcesStore.isKnowledgeBaseSelected(kb.id)"
            @click.stop
            @change="sourcesStore.toggleKnowledgeBaseSelection(kb.id)"
            class="w-4 h-4 accent-emerald-500 cursor-pointer"
          />
        </div>

        <!-- 文档列表 -->
        <div
          v-if="sourcesStore.isKnowledgeBaseExpanded(kb.id)"
          class="border-t border-slate-100 bg-slate-50/50 px-2 py-2 space-y-1"
        >
          <!-- 文档加载中 -->
          <div v-if="kb.documentsLoading" class="text-center py-4 text-xs text-slate-400">
            <svg
              class="w-4 h-4 animate-spin mx-auto mb-1 text-emerald-500"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            加载文档中...
          </div>

          <!-- 文档列表 -->
          <template v-else>
            <div
              v-for="doc in kb.documents"
              :key="doc.id"
              class="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white transition-colors group"
            >
              <!-- 文档图标 -->
              <div
                :class="[
                  'w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                  getDocIconStyle(doc.type)
                ]"
              >
                {{ getDocIconText(doc.type) }}
              </div>

              <!-- 文档名称 -->
              <div class="flex-1 min-w-0">
                <div class="text-xs text-slate-700 truncate font-medium">{{ doc.name }}</div>
              </div>

              <!-- 状态标签 -->
              <div class="flex items-center gap-1 flex-shrink-0">
                <!-- 无嵌入配置 -->
                <span
                  v-if="!doc.statusSummary.hasEmbeddings"
                  class="inline-flex items-center justify-center w-1.5 h-1.5 rounded-full bg-slate-300"
                  title="无嵌入"
                ></span>
                <!-- 有嵌入配置：显示状态 -->
                <template v-else>
                  <!-- 运行中 -->
                  <span
                    v-if="doc.statusSummary.hasRunning"
                    class="inline-flex items-center justify-center w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"
                    title="嵌入中..."
                  ></span>
                  <!-- 有失败 -->
                  <span
                    v-else-if="doc.statusSummary.hasFailed"
                    class="inline-flex items-center justify-center w-1.5 h-1.5 rounded-full bg-rose-500"
                    title="部分嵌入失败"
                  ></span>
                  <!-- 全部完成 -->
                  <span
                    v-else-if="doc.statusSummary.allCompleted"
                    class="inline-flex items-center justify-center w-1.5 h-1.5 rounded-full bg-emerald-500"
                    title="嵌入完成"
                  ></span>
                  <!-- pending -->
                  <span
                    v-else
                    class="inline-flex items-center justify-center w-1.5 h-1.5 rounded-full bg-amber-400"
                    title="等待嵌入"
                  ></span>
                </template>
                <!-- 嵌入配置计数 -->
                <span
                  v-if="doc.statusSummary.totalConfigs > 0"
                  class="text-[10px] text-slate-400"
                  :title="`${doc.statusSummary.completedConfigs}/${doc.statusSummary.totalConfigs} 配置已完成`"
                >
                  {{ doc.statusSummary.completedConfigs }}/{{ doc.statusSummary.totalConfigs }}
                </span>
              </div>

              <!-- 文档选择框 -->
              <input
                type="checkbox"
                :checked="doc.selected"
                @click.stop
                @change="sourcesStore.toggleDocumentSelection(kb.id, doc.id)"
                class="w-3.5 h-3.5 accent-emerald-500 cursor-pointer"
              />
            </div>

            <!-- 空状态 -->
            <div
              v-if="kb.documentsLoaded && kb.documents.length === 0"
              class="text-center py-4 text-xs text-slate-400"
            >
              暂无文档
            </div>
          </template>
        </div>
      </div>

      <!-- 空状态 -->
      <div
        v-if="filteredKnowledgeBases.length === 0 && !sourcesStore.isLoading"
        class="text-center py-8 text-sm text-slate-400"
      >
        <svg
          class="w-12 h-12 mx-auto mb-2 text-slate-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
        <p>{{ searchQuery ? '未找到匹配的知识库' : '暂无知识库' }}</p>
      </div>
    </div>

    <!-- 状态说明 -->
    <div class="pt-2 border-t border-slate-100">
      <div class="text-xs text-slate-400 mb-2">嵌入状态：</div>
      <div class="flex flex-wrap gap-2 text-xs">
        <div class="flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
          <span class="text-slate-500">无嵌入</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          <span class="text-slate-500">等待中</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          <span class="text-slate-500">嵌入中</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span class="text-slate-500">已完成</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          <span class="text-slate-500">失败</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSourcesStore } from '@renderer/stores/ai-chat/sources.store'

const sourcesStore = useSourcesStore()
const searchQuery = ref('')

// 过滤知识库
const filteredKnowledgeBases = computed(() => {
  if (!searchQuery.value.trim()) return sourcesStore.knowledgeBases

  const query = searchQuery.value.toLowerCase()
  return sourcesStore.knowledgeBases
    .map((kb) => ({
      ...kb,
      documents: kb.documents.filter((doc) => doc.name.toLowerCase().includes(query))
    }))
    .filter((kb) => kb.name.toLowerCase().includes(query) || kb.documents.length > 0)
})

// 重试加载
const handleRetry = async () => {
  await sourcesStore.checkConnection()
  if (sourcesStore.connectionState.connected) {
    await sourcesStore.loadKnowledgeBases()
  }
}

// 获取文档图标样式
const getDocIconStyle = (type: string) => {
  switch (type) {
    case 'pdf':
      return 'bg-rose-50 text-rose-600'
    case 'md':
      return 'bg-blue-50 text-blue-600'
    case 'txt':
      return 'bg-slate-100 text-slate-600'
    default:
      return 'bg-gray-50 text-gray-600'
  }
}

// 获取文档图标文本
const getDocIconText = (type: string) => {
  return type.toUpperCase()
}

// 组件挂载时初始化数据
onMounted(async () => {
  // 先检查连接状态
  await sourcesStore.checkConnection()

  // 如果已连接，加载知识库列表
  if (sourcesStore.connectionState.connected) {
    await sourcesStore.loadKnowledgeBases()

    // 加载第一个展开的知识库的文档
    for (const kbId of sourcesStore.expandedKbIds) {
      await sourcesStore.loadDocuments(kbId)
    }
  }
})
</script>
