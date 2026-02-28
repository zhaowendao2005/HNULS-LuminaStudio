/**
 * OrchestraFlow 工作流列表 Store
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { WorkflowListState } from './workflow-list.types'
import { WorkflowListDatasource } from './workflow-list.datasource'
import type { OFWorkflowMeta } from '@preload/types'

const datasource = new WorkflowListDatasource()

export const useWorkflowListStore = defineStore('orchestraflow-workflow-list', () => {
  // ===== State =====
  const workflows = ref<OFWorkflowMeta[]>([])
  const loading = ref(false)
  const searchKeyword = ref('')
  const currentPage = ref(1)
  const pageSize = ref(10)
  const total = ref(0)

  // ===== Getters =====
  const hasMore = computed(() => {
    return currentPage.value * pageSize.value < total.value
  })

  // ===== Actions =====
  async function fetchWorkflows() {
    loading.value = true
    try {
      const result = await datasource.getWorkflows({
        keyword: searchKeyword.value || undefined,
        page: currentPage.value,
        pageSize: pageSize.value
      })
      workflows.value = result.workflows
      total.value = result.total
    } finally {
      loading.value = false
    }
  }

  async function createWorkflow(data: {
    name: string
    description?: string
    icon?: string
    iconBackground?: string
  }) {
    const newWorkflow = await datasource.createWorkflow(data)
    workflows.value.unshift(newWorkflow)
    total.value++
    return newWorkflow
  }

  async function deleteWorkflow(id: string) {
    await datasource.deleteWorkflow(id)
    workflows.value = workflows.value.filter(w => w.id !== id)
    total.value--
  }

  function setSearchKeyword(keyword: string) {
    searchKeyword.value = keyword
    currentPage.value = 1
  }

  function setPage(page: number) {
    currentPage.value = page
  }

  return {
    // state
    workflows,
    loading,
    searchKeyword,
    currentPage,
    pageSize,
    total,
    
    // getters
    hasMore,
    
    // actions
    fetchWorkflows,
    createWorkflow,
    deleteWorkflow,
    setSearchKeyword,
    setPage
  }
})
