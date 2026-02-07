import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { RerankModelDataSource } from './datasource'
import type { RerankModel, RerankModelGroups } from './types'

/**
 * Rerank Model Store
 *
 * 管理从 KnowledgeDatabase 服务获取的重排模型列表
 */
export const useRerankModelStore = defineStore('rerank-model', () => {
  // === State ===
  const models = ref<RerankModel[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastFetchTime = ref<number>(0)

  // === Computed ===
  const modelGroups = computed<RerankModelGroups>(() => {
    const groups: RerankModelGroups = {}

    for (const model of models.value) {
      const groupName = model.group || model.providerName || 'default'
      if (!groups[groupName]) {
        groups[groupName] = []
      }
      groups[groupName].push(model)
    }

    // 按组名排序
    const sortedGroups: RerankModelGroups = {}
    Object.keys(groups)
      .sort()
      .forEach((key) => {
        sortedGroups[key] = groups[key]
      })

    return sortedGroups
  })

  const hasModels = computed(() => models.value.length > 0)

  // === Actions ===

  /**
   * 获取重排模型列表
   * @param forceRefresh 是否强制刷新（默认 false，5分钟内使用缓存）
   */
  async function fetchModels(forceRefresh = false): Promise<void> {
    // 5分钟内使用缓存
    const CACHE_DURATION = 5 * 60 * 1000
    if (!forceRefresh && Date.now() - lastFetchTime.value < CACHE_DURATION && hasModels.value) {
      return
    }

    isLoading.value = true
    error.value = null

    try {
      models.value = await RerankModelDataSource.listRerankModels()
      lastFetchTime.value = Date.now()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch rerank models'
      console.error('Failed to fetch rerank models:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 根据 ID 查找模型
   */
  function getModelById(id: string): RerankModel | undefined {
    return models.value.find((m) => m.id === id)
  }

  /**
   * 获取模型显示名称
   */
  function getModelDisplayName(id: string): string {
    const model = getModelById(id)
    if (!model) return id
    return model.providerName ? `${model.providerName} / ${model.displayName}` : model.displayName
  }

  return {
    // State
    models,
    isLoading,
    error,

    // Computed
    modelGroups,
    hasModels,

    // Actions
    fetchModels,
    getModelById,
    getModelDisplayName
  }
})
