<template>
  <div class="of-grid-view h-full w-full flex flex-col bg-[#f8fafc]">
    <!-- 顶部：Tab + 搜索框 -->
    <div class="flex-shrink-0 px-6 pt-6 pb-4">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            :class="[
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab.value
                ? 'bg-emerald-100 text-emerald-700'
                : 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50'
            ]"
            @click="activeTab = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- 搜索框 -->
        <div class="flex-1 max-w-md ml-4">
          <div class="relative">
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="搜索工作流..."
              class="w-full px-4 py-2 pl-10 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              @input="handleSearch"
            />
            <svg
              class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Grid 内容区 -->
    <div class="flex-1 overflow-y-auto px-6 pb-6">
      <div
        v-if="loading"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        <div
          v-for="i in 8"
          :key="i"
          class="h-40 bg-white rounded-xl border border-slate-200 animate-pulse"
        />
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <!-- 创建工作流卡片（首位） -->
        <CreateWorkflowCard @create="handleCreateWorkflow" />

        <!-- 工作流卡片列表 -->
        <WorkflowCard
          v-for="workflow in workflows"
          :key="workflow.id"
          :workflow="workflow"
          @open="handleOpenWorkflow"
          @delete="handleDeleteWorkflow"
        />
      </div>

      <!-- 空状态 -->
      <div
        v-if="!loading && workflows.length === 0"
        class="flex flex-col items-center justify-center h-64 text-slate-400"
      >
        <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p class="text-lg font-medium mb-1">暂无工作流</p>
        <p class="text-sm">点击左上角卡片创建工作流</p>
      </div>
    </div>

    <!-- 创建弹窗 -->
    <CreateWorkflowModal
      :show="showCreateModal"
      @close="showCreateModal = false"
      @confirm="handleCreateConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useWorkflowListStore } from '@renderer/stores/orchestraflow/workflow-list/workflow-list.store'
import CreateWorkflowCard from './CreateWorkflowCard.vue'
import WorkflowCard from './WorkflowCard.vue'
import CreateWorkflowModal from './CreateWorkflowModal/index.vue'

const emit = defineEmits<{
  (e: 'open-workflow', workflowId: string): void
}>()

const workflowListStore = useWorkflowListStore()

const tabs = [
  { value: 'all', label: '全部' },
  { value: 'orchestraflow', label: 'OrchestraFlow' }
]

const activeTab = ref('all')
const searchKeyword = ref('')
const showCreateModal = ref(false)

const workflows = computed(() => workflowListStore.workflows)
const loading = computed(() => workflowListStore.loading)

// 搜索防抖（500ms，同 Dify）
const handleSearch = useDebounceFn(() => {
  workflowListStore.setSearchKeyword(searchKeyword.value)
  workflowListStore.fetchWorkflows()
}, 500)

function handleCreateWorkflow() {
  showCreateModal.value = true
}

async function handleCreateConfirm(data: {
  name: string
  description?: string
  icon?: string
  iconBackground?: string
}) {
  await workflowListStore.createWorkflow(data)
  await workflowListStore.fetchWorkflows()
  showCreateModal.value = false
}

function handleOpenWorkflow(workflowId: string) {
  emit('open-workflow', workflowId)
}

async function handleDeleteWorkflow(workflowId: string) {
  await workflowListStore.deleteWorkflow(workflowId)
  await workflowListStore.fetchWorkflows()
}

// 监听 Tab 变化
watch(activeTab, () => {
  workflowListStore.fetchWorkflows()
})

onMounted(() => {
  workflowListStore.fetchWorkflows()
})
</script>
