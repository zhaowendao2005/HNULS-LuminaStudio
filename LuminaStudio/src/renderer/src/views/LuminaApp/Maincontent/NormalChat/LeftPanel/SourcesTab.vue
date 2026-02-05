<template>
  <div class="space-y-3">
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
        @click="selectAll"
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
        @click="deselectAll"
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

    <!-- 知识库树形列表 -->
    <div class="space-y-2">
      <div
        v-for="kb in filteredKnowledgeBases"
        :key="kb.id"
        class="rounded-lg border border-slate-100 bg-white hover:border-slate-200 transition-colors"
      >
        <!-- 知识库节点 -->
        <div
          class="flex items-center gap-2 px-3 py-2.5 cursor-pointer"
          @click="toggleKnowledgeBase(kb.id)"
        >
          <!-- 展开/折叠图标 -->
          <svg
            :class="[
              'w-3.5 h-3.5 text-slate-400 transition-transform flex-shrink-0',
              expandedKbs.has(kb.id) ? 'rotate-90' : ''
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
            <div class="text-xs text-slate-400">{{ kb.documents.length }} 个文档</div>
          </div>

          <!-- 知识库选择框 -->
          <input
            type="checkbox"
            :checked="isKnowledgeBaseSelected(kb.id)"
            @click.stop
            @change="toggleKnowledgeBaseSelection(kb.id)"
            class="w-4 h-4 accent-emerald-500 cursor-pointer"
          />
        </div>

        <!-- 文档列表 -->
        <div
          v-if="expandedKbs.has(kb.id)"
          class="border-t border-slate-100 bg-slate-50/50 px-2 py-2 space-y-1"
        >
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
              <span
                v-if="doc.status.parsed"
                class="inline-flex items-center justify-center w-1.5 h-1.5 rounded-full bg-emerald-500"
                title="已解析"
              ></span>
              <span
                v-if="doc.status.chunked"
                class="inline-flex items-center justify-center w-1.5 h-1.5 rounded-full bg-blue-500"
                title="已分块"
              ></span>
              <span
                v-if="doc.status.embedded"
                class="inline-flex items-center justify-center w-1.5 h-1.5 rounded-full bg-purple-500"
                title="已嵌入"
              ></span>
            </div>

            <!-- 文档选择框 -->
            <input
              type="checkbox"
              :checked="doc.selected"
              @click.stop
              @change="toggleDocumentSelection(kb.id, doc.id)"
              class="w-3.5 h-3.5 accent-emerald-500 cursor-pointer"
            />
          </div>

          <!-- 空状态 -->
          <div v-if="kb.documents.length === 0" class="text-center py-4 text-xs text-slate-400">
            暂无文档
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div
        v-if="filteredKnowledgeBases.length === 0"
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
      <div class="text-xs text-slate-400 mb-2">状态说明：</div>
      <div class="flex flex-wrap gap-2 text-xs">
        <div class="flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span class="text-slate-500">已解析</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          <span class="text-slate-500">已分块</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
          <span class="text-slate-500">已嵌入</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface DocumentStatus {
  parsed: boolean
  chunked: boolean
  embedded: boolean
}

interface Document {
  id: string
  name: string
  type: 'pdf' | 'md' | 'txt'
  status: DocumentStatus
  selected: boolean
}

interface KnowledgeBase {
  id: string
  name: string
  documents: Document[]
}

// 示例数据
const knowledgeBases = ref<KnowledgeBase[]>([
  {
    id: 'kb-1',
    name: '分子生物学知识库',
    documents: [
      {
        id: 'doc-1',
        name: '核酸理论.pdf',
        type: 'pdf',
        status: { parsed: true, chunked: true, embedded: true },
        selected: true
      },
      {
        id: 'doc-2',
        name: '核酸的结构.pdf',
        type: 'pdf',
        status: { parsed: true, chunked: true, embedded: true },
        selected: true
      },
      {
        id: 'doc-3',
        name: '核酸研究方法.md',
        type: 'md',
        status: { parsed: true, chunked: true, embedded: false },
        selected: false
      }
    ]
  },
  {
    id: 'kb-2',
    name: '细胞生物学知识库',
    documents: [
      {
        id: 'doc-4',
        name: '细胞工程原理.pdf',
        type: 'pdf',
        status: { parsed: true, chunked: false, embedded: false },
        selected: false
      },
      {
        id: 'doc-5',
        name: '细胞结构笔记.txt',
        type: 'txt',
        status: { parsed: false, chunked: false, embedded: false },
        selected: false
      }
    ]
  },
  {
    id: 'kb-3',
    name: '基因工程知识库',
    documents: [
      {
        id: 'doc-6',
        name: '基因工程及蛋白质工程.pdf',
        type: 'pdf',
        status: { parsed: true, chunked: true, embedded: true },
        selected: false
      }
    ]
  }
])

const searchQuery = ref('')
const expandedKbs = ref<Set<string>>(new Set(['kb-1'])) // 默认展开第一个

// 过滤知识库
const filteredKnowledgeBases = computed(() => {
  if (!searchQuery.value.trim()) return knowledgeBases.value

  const query = searchQuery.value.toLowerCase()
  return knowledgeBases.value
    .map((kb) => ({
      ...kb,
      documents: kb.documents.filter((doc) => doc.name.toLowerCase().includes(query))
    }))
    .filter((kb) => kb.name.toLowerCase().includes(query) || kb.documents.length > 0)
})

// 切换知识库展开/折叠
const toggleKnowledgeBase = (kbId: string) => {
  if (expandedKbs.value.has(kbId)) {
    expandedKbs.value.delete(kbId)
  } else {
    expandedKbs.value.add(kbId)
  }
}

// 判断知识库是否全选
const isKnowledgeBaseSelected = (kbId: string) => {
  const kb = knowledgeBases.value.find((k) => k.id === kbId)
  if (!kb || kb.documents.length === 0) return false
  return kb.documents.every((doc) => doc.selected)
}

// 切换知识库选择（全选/取消全选该知识库下的所有文档）
const toggleKnowledgeBaseSelection = (kbId: string) => {
  const kb = knowledgeBases.value.find((k) => k.id === kbId)
  if (!kb) return

  const allSelected = isKnowledgeBaseSelected(kbId)
  kb.documents.forEach((doc) => {
    doc.selected = !allSelected
  })
}

// 切换单个文档选择
const toggleDocumentSelection = (kbId: string, docId: string) => {
  const kb = knowledgeBases.value.find((k) => k.id === kbId)
  if (!kb) return

  const doc = kb.documents.find((d) => d.id === docId)
  if (doc) {
    doc.selected = !doc.selected
  }
}

// 全选所有文档
const selectAll = () => {
  knowledgeBases.value.forEach((kb) => {
    kb.documents.forEach((doc) => {
      doc.selected = true
    })
  })
}

// 清空所有选择
const deselectAll = () => {
  knowledgeBases.value.forEach((kb) => {
    kb.documents.forEach((doc) => {
      doc.selected = false
    })
  })
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
</script>
