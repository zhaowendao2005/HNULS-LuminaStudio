<template>
  <div class="of-grid-view h-full w-full flex flex-col bg-[#f8fafc]">
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

    <div class="flex-1 overflow-y-auto px-6 pb-6">
      <div
        v-if="activeTab === 'all'"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        <CreateWorkflowCard
          @create="handleCreateWorkflow"
          @generate="handleCreateGenerationSession"
        />
        <WorkflowCard
          v-for="workflow in workflows"
          :key="workflow.id"
          :workflow="workflow"
          @open="handleOpenWorkflow"
          @delete="handleDeleteWorkflow"
        />
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <GenerationSessionCard
          v-for="session in generationSessions"
          :key="session.id"
          :session="session"
          @open="handleOpenGenerator"
          @delete="handleDeleteSession"
        />
      </div>
    </div>

    <CreateWorkflowModal
      :show="showCreateModal"
      @close="showCreateModal = false"
      @confirm="handleCreateConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useWorkflowListStore } from '@renderer/stores/orchestraflow/workflow-list/workflow-list.store'
import { useWorkflowGenerationStore } from '@renderer/stores/orchestraflow/workflow-generation/workflow-generation.store'
import CreateWorkflowCard from './CreateWorkflowCard.vue'
import CreateWorkflowModal from './CreateWorkflowModal/index.vue'
import GenerationSessionCard from './GenerationSessionCard.vue'
import WorkflowCard from './WorkflowCard.vue'

const emit = defineEmits<{
  (e: 'open-workflow', workflowId: string): void
  (e: 'open-generator', sessionId: string): void
}>()

const workflowListStore = useWorkflowListStore()
const workflowGenerationStore = useWorkflowGenerationStore()

const tabs = [
  { value: 'all', label: '全部' },
  { value: 'generation', label: '生成会话' }
]

const activeTab = ref('all')
const searchKeyword = ref('')
const showCreateModal = ref(false)

const workflows = computed(() => workflowListStore.workflows)
const generationSessions = computed(() => workflowGenerationStore.sessions)

const handleSearch = useDebounceFn(() => {
  workflowListStore.setSearchKeyword(searchKeyword.value)
  workflowListStore.fetchWorkflows()
}, 500)

function handleCreateWorkflow() {
  showCreateModal.value = true
}

async function handleCreateGenerationSession() {
  const timestamp = new Date().toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
  const session = await workflowGenerationStore.createSession({
    workflow_name: `未命名生成会话 ${timestamp}`,
    prompt: ''
  })
  emit('open-generator', session.id)
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

function handleOpenGenerator(sessionId: string) {
  emit('open-generator', sessionId)
}

async function handleDeleteWorkflow(workflowId: string) {
  await workflowListStore.deleteWorkflow(workflowId)
  await workflowListStore.fetchWorkflows()
}

async function handleDeleteSession(sessionId: string) {
  await workflowGenerationStore.deleteSession(sessionId)
}

watch(activeTab, async (value) => {
  if (value === 'generation') {
    await workflowGenerationStore.fetchSessions()
  } else {
    await workflowListStore.fetchWorkflows()
  }
})

onMounted(async () => {
  await Promise.all([workflowListStore.fetchWorkflows(), workflowGenerationStore.fetchSessions()])
})
</script>
