import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { ModelConfigDataSource } from './datasource'
import type {
  ModelProvider,
  RemoteModelGroups,
  NewProviderForm,
  NewModelForm,
  ProviderIcon
} from './types'

/**
 * Model Config Store (SSOT)
 * 
 * 模型配置的单一事实来源
 * - 管理提供商列表和模型配置
 * - 自动保存到后端
 * - 支持从远程 API 同步模型列表
 */
export const useModelConfigStore = defineStore('model-config', () => {
  // === State ===
  const providers = ref<ModelProvider[]>([])
  const selectedProviderId = ref<string | null>(null)

  // 弹窗状态
  const isAddProviderModalOpen = ref(false)
  const isAddModelModalOpen = ref(false)
  const isManageModelsModalOpen = ref(false)

  // 管理模型弹窗的状态
  const isLoadingModels = ref(false)
  const remoteModelGroups = ref<RemoteModelGroups>({})

  // 表单状态
  const newProviderForm = ref<NewProviderForm>({ type: 'openai', name: '' })
  const newModelForm = ref<NewModelForm>({ id: '', name: '', group: '' })

  // === Computed ===
  const selectedProvider = computed(() => {
    return providers.value.find((p) => p.id === selectedProviderId.value) || providers.value[0]
  })

  // === 自动保存辅助函数 ===
  /**
   * 自动保存配置到后端
   */
  async function autoSave(): Promise<void> {
    try {
      await ModelConfigDataSource.saveProviders(providers.value, selectedProviderId.value)
    } catch (error) {
      console.error('Auto save failed:', error)
      // 静默失败，不打断用户操作
    }
  }

  // === Actions ===

  /**
   * 1. 打开管理模态框并从 API 获取模型列表
   */
  async function openManageModels(): Promise<void> {
    if (!selectedProviderId.value) return

    isManageModelsModalOpen.value = true
    isLoadingModels.value = true
    remoteModelGroups.value = {}

    try {
      // 从真实 API 获取模型列表
      remoteModelGroups.value = await ModelConfigDataSource.syncRemoteModels(
        selectedProviderId.value
      )
    } catch (error) {
      console.error('Failed to fetch models:', error)
      // 如果请求失败，显示空列表
      remoteModelGroups.value = {}
    } finally {
      isLoadingModels.value = false
    }
  }

  /**
   * 2. 添加单个远程模型
   */
  async function addSingleRemoteModel(remoteModel: any): Promise<void> {
    if (!selectedProvider.value || !selectedProviderId.value) return

    // 检查是否已存在
    const existing = selectedProvider.value.models.find((m) => m.id === remoteModel.id)
    if (existing) {
      return
    }

    // 推断分组
    const group = inferGroupFromModelId(remoteModel.id)

    // 添加新模型
    const newModel = {
      id: remoteModel.id,
      name: remoteModel.id, // 默认用 ID 作名称
      group
    }

    providers.value = providers.value.map((p) => {
      if (p.id === selectedProviderId.value) {
        return { ...p, models: [...p.models, newModel] }
      }
      return p
    })

    await autoSave()
  }

  /**
   * 3. 批量添加整组模型
   */
  async function addGroupModels(groupName: string, models: any[]): Promise<void> {
    if (!selectedProvider.value || !selectedProviderId.value) return

    const currentModelIds = new Set(selectedProvider.value.models.map((m) => m.id))
    const modelsToAdd: ModelProvider['models'] = []

    models.forEach((remoteModel) => {
      // 如果已存在，跳过
      if (currentModelIds.has(remoteModel.id)) {
        return
      }

      // 推断分组
      const group = groupName !== 'default' ? groupName : inferGroupFromModelId(remoteModel.id)

      modelsToAdd.push({
        id: remoteModel.id,
        name: remoteModel.id, // 默认用 ID 作名称
        group
      })
    })

    if (modelsToAdd.length === 0) {
      return
    }

    // 更新 Provider
    providers.value = providers.value.map((p) => {
      if (p.id === selectedProviderId.value) {
        return { ...p, models: [...p.models, ...modelsToAdd] }
      }
      return p
    })

    await autoSave()
  }

  /**
   * 从模型 ID 推断分组名称（与后端逻辑一致）
   */
  function inferGroupFromModelId(modelId: string): string {
    const DEFAULT = 'default'

    if (!modelId) return DEFAULT

    // 1) 有 "/"："/" 前面就是组名
    const slashIndex = modelId.indexOf('/')
    if (slashIndex > 0) {
      return modelId.slice(0, slashIndex)
    }

    // 2) 无 "/"：去掉类似 "[aws]" 前缀后再做 "-" 规则
    const normalized = modelId.replace(/^\[[^\]]+\]/, '') // 删除最前面的 [xxx]

    // 3) 正则/分段：取 "第二个 '-' 前的部分"，也就是前两段拼起来
    const parts = normalized.split('-')
    if (parts.length >= 3 && parts[0] && parts[1]) {
      return `${parts[0]}-${parts[1]}`
    }

    // 4) 其他都进默认组
    return DEFAULT
  }

  /**
   * 4. 手动添加单个模型
   */
  async function handleManualAddModel(): Promise<void> {
    if (!newModelForm.value.id || !selectedProviderId.value) return

    const newModel = {
      ...newModelForm.value,
      group: newModelForm.value.group || undefined
    }
    providers.value = providers.value.map((p) => {
      if (p.id === selectedProviderId.value) {
        return { ...p, models: [...p.models, newModel] }
      }
      return p
    })
    isAddModelModalOpen.value = false
    newModelForm.value = { id: '', name: '', group: '' }
    await autoSave()
  }

  /**
   * 5. 添加提供商
   */
  async function handleAddProvider(): Promise<void> {
    const icon: ProviderIcon = newProviderForm.value.type === 'openai' ? 'openai' : 'server'
    const newProvider: ModelProvider = {
      id: `provider-${Date.now()}`,
      type: newProviderForm.value.type,
      name: newProviderForm.value.name || 'New Provider',
      apiKey: '',
      baseUrl: '',
      icon,
      enabled: true,
      models: []
    }
    providers.value = [...providers.value, newProvider]
    selectedProviderId.value = newProvider.id
    isAddProviderModalOpen.value = false
    newProviderForm.value = { type: 'openai', name: '' }
    await autoSave()
  }

  /**
   * 6. 删除提供商
   */
  async function handleDeleteProvider(id: string): Promise<void> {
    const newList = providers.value.filter((p) => p.id !== id)
    providers.value = newList
    if (selectedProviderId.value === id && newList.length > 0) {
      selectedProviderId.value = newList[0].id
    } else if (newList.length === 0) {
      selectedProviderId.value = null
    }
    await autoSave()
  }

  /**
   * 7. 删除单个模型
   */
  async function removeModel(modelId: string): Promise<void> {
    if (!selectedProviderId.value) return
    providers.value = providers.value.map((p) => {
      if (p.id === selectedProviderId.value) {
        return {
          ...p,
          models: p.models.filter((m) => m.id !== modelId)
        }
      }
      return p
    })
    await autoSave()
  }

  /**
   * 8. 取消订阅单个模型
   */
  async function removeSingleRemoteModel(modelId: string): Promise<void> {
    await removeModel(modelId)
  }

  /**
   * 9. 取消订阅整组模型
   */
  async function removeGroupModels(_groupName: string, models: any[]): Promise<void> {
    if (!selectedProviderId.value) return
    const modelIdsToRemove = new Set(models.map((m) => m.id))
    providers.value = providers.value.map((p) => {
      if (p.id === selectedProviderId.value) {
        return {
          ...p,
          models: p.models.filter((m) => !modelIdsToRemove.has(m.id))
        }
      }
      return p
    })
    await autoSave()
  }

  /**
   * 初始化：获取提供商列表
   */
  async function fetchProviders(): Promise<void> {
    const result = await ModelConfigDataSource.getProviders()
    providers.value = result.providers
    // 优先使用后端保存的 activeProviderId，否则使用第一个
    if (result.activeProviderId && providers.value.some((p) => p.id === result.activeProviderId)) {
      selectedProviderId.value = result.activeProviderId
    } else if (providers.value.length > 0 && !selectedProviderId.value) {
      selectedProviderId.value = providers.value[0].id
    }
  }

  /**
   * 选择提供商
   */
  async function selectProvider(id: string): Promise<void> {
    selectedProviderId.value = id
    await autoSave()
  }

  /**
   * 更新提供商的 API Key
   */
  async function updateProviderApiKey(providerId: string, apiKey: string): Promise<void> {
    providers.value = providers.value.map((p) => {
      if (p.id === providerId) {
        return { ...p, apiKey }
      }
      return p
    })
    await autoSave()
  }

  /**
   * 更新提供商的 Base URL
   */
  async function updateProviderBaseUrl(providerId: string, baseUrl: string): Promise<void> {
    providers.value = providers.value.map((p) => {
      if (p.id === providerId) {
        return { ...p, baseUrl }
      }
      return p
    })
    await autoSave()
  }

  return {
    // 状态
    providers,
    selectedProviderId,
    isAddProviderModalOpen,
    isAddModelModalOpen,
    isManageModelsModalOpen,
    isLoadingModels,
    remoteModelGroups,
    newProviderForm,
    newModelForm,

    // Computed
    selectedProvider,

    // Actions
    openManageModels,
    addSingleRemoteModel,
    addGroupModels,
    handleManualAddModel,
    handleAddProvider,
    handleDeleteProvider,
    removeModel,
    removeSingleRemoteModel,
    removeGroupModels,
    fetchProviders,
    selectProvider,
    updateProviderApiKey,
    updateProviderBaseUrl
  }
})
