import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { ModelConfigDataSource } from './datasource'
import type {
  ModelProvider,
  ModelTestState,
  NewModelForm,
  ProviderForm,
  ProviderIcon,
  ProviderType,
  RemoteModelGroups
} from './types'

const OPENAI_OFFICIAL_BASE_URL = 'https://api.openai.com/v1'

type ProviderModelTestResults = Record<string, Record<string, ModelTestState>>

function inferProviderIcon(type: ProviderType): ProviderIcon {
  if (type === 'claude') return 'anthropic'
  if (type === 'gemini') return 'google'
  if (type === 'openai' || type === 'openai-response' || type === 'openai-completion') {
    return 'openai'
  }
  return 'server'
}

function getDefaultBaseUrlByProviderType(type: ProviderType): string {
  if (type === 'openai') return OPENAI_OFFICIAL_BASE_URL
  return ''
}

export const useModelConfigStore = defineStore('model-config', () => {
  const providers = ref<ModelProvider[]>([])
  const selectedProviderId = ref<string | null>(null)

  const isProviderModalOpen = ref(false)
  const isAddModelModalOpen = ref(false)
  const isManageModelsModalOpen = ref(false)
  const isEditingProvider = ref(false)

  const isLoadingModels = ref(false)
  const remoteModelGroups = ref<RemoteModelGroups>({})
  const testResults = ref<ProviderModelTestResults>({})

  const providerForm = ref<ProviderForm>({
    id: null,
    type: 'openai',
    name: ''
  })
  const newModelForm = ref<NewModelForm>({ id: '', name: '', group: '' })

  const selectedProvider = computed(() => {
    return (
      providers.value.find((provider) => provider.id === selectedProviderId.value) ||
      providers.value[0]
    )
  })

  async function autoSave(): Promise<void> {
    await ModelConfigDataSource.saveProviders(providers.value, selectedProviderId.value)
  }

  async function fetchProviders(): Promise<void> {
    const result = await ModelConfigDataSource.getProviders()
    providers.value = result.providers
    if (
      result.activeProviderId &&
      providers.value.some((provider) => provider.id === result.activeProviderId)
    ) {
      selectedProviderId.value = result.activeProviderId
    } else if (providers.value.length > 0) {
      selectedProviderId.value = providers.value[0].id
    } else {
      selectedProviderId.value = null
    }
  }

  async function selectProvider(id: string): Promise<void> {
    selectedProviderId.value = id
    await autoSave()
  }

  function openCreateProviderModal(): void {
    isEditingProvider.value = false
    providerForm.value = {
      id: null,
      type: 'openai',
      name: ''
    }
    isProviderModalOpen.value = true
  }

  function openEditProviderModal(providerId: string): void {
    const provider = providers.value.find((item) => item.id === providerId)
    if (!provider) return
    isEditingProvider.value = true
    providerForm.value = {
      id: provider.id,
      type: provider.type,
      name: provider.name
    }
    isProviderModalOpen.value = true
  }

  function closeProviderModal(): void {
    isProviderModalOpen.value = false
  }

  async function submitProviderForm(): Promise<void> {
    const name = providerForm.value.name.trim()
    if (!name) return

    if (isEditingProvider.value && providerForm.value.id) {
      providers.value = providers.value.map((provider) => {
        if (provider.id !== providerForm.value.id) return provider
        const nextType = providerForm.value.type
        const nextBaseUrl =
          nextType === 'openai' ? OPENAI_OFFICIAL_BASE_URL : provider.baseUrl || ''
        return {
          ...provider,
          name,
          type: nextType,
          baseUrl: nextBaseUrl,
          icon: inferProviderIcon(nextType)
        }
      })
    } else {
      const providerId = `provider-${Date.now()}`
      providers.value = [
        ...providers.value,
        {
          id: providerId,
          type: providerForm.value.type,
          name,
          apiKey: '',
          baseUrl: getDefaultBaseUrlByProviderType(providerForm.value.type),
          officialWebsite: '',
          icon: inferProviderIcon(providerForm.value.type),
          enabled: true,
          models: []
        }
      ]
      selectedProviderId.value = providerId
    }

    await autoSave()
    closeProviderModal()
  }

  async function handleDeleteProvider(id: string): Promise<void> {
    const nextProviders = providers.value.filter((provider) => provider.id !== id)
    providers.value = nextProviders
    if (selectedProviderId.value === id) {
      selectedProviderId.value = nextProviders[0]?.id || null
    }
    delete testResults.value[id]
    await autoSave()
  }

  async function updateProviderApiKey(providerId: string, apiKey: string): Promise<void> {
    await updateProviderServiceSettings(providerId, { apiKey })
  }

  async function updateProviderBaseUrl(providerId: string, baseUrl: string): Promise<void> {
    await updateProviderServiceSettings(providerId, { baseUrl })
  }

  async function updateProviderOfficialWebsite(
    providerId: string,
    officialWebsite: string
  ): Promise<void> {
    await updateProviderServiceSettings(providerId, { officialWebsite })
  }

  async function updateProviderServiceSettings(
    providerId: string,
    patch: {
      apiKey?: string
      baseUrl?: string
      officialWebsite?: string
    }
  ): Promise<void> {
    providers.value = providers.value.map((provider) => {
      if (provider.id !== providerId) return provider
      return {
        ...provider,
        apiKey: patch.apiKey ?? provider.apiKey,
        baseUrl: patch.baseUrl ?? provider.baseUrl,
        officialWebsite: patch.officialWebsite ?? provider.officialWebsite
      }
    })
    await autoSave()
  }

  async function openManageModels(): Promise<void> {
    if (!selectedProviderId.value) return
    isManageModelsModalOpen.value = true
    isLoadingModels.value = true
    remoteModelGroups.value = {}
    try {
      remoteModelGroups.value = await ModelConfigDataSource.syncRemoteModels(
        selectedProviderId.value
      )
    } finally {
      isLoadingModels.value = false
    }
  }

  function inferGroupFromModelId(modelId: string): string {
    const DEFAULT_GROUP = 'default'
    if (!modelId) return DEFAULT_GROUP

    const slashIndex = modelId.indexOf('/')
    if (slashIndex > 0) {
      return modelId.slice(0, slashIndex)
    }

    const normalized = modelId.replace(/^\[[^\]]+\]/, '')
    const parts = normalized.split('-')
    if (parts.length >= 3 && parts[0] && parts[1]) {
      return `${parts[0]}-${parts[1]}`
    }
    return DEFAULT_GROUP
  }

  function setModelTestStatus(
    providerId: string,
    modelId: string,
    patch: Partial<ModelTestState>
  ): void {
    const providerResults = testResults.value[providerId] || {}
    const currentState = providerResults[modelId] || { status: 'idle' as const }

    testResults.value = {
      ...testResults.value,
      [providerId]: {
        ...providerResults,
        [modelId]: {
          ...currentState,
          ...patch,
          updatedAt: Date.now()
        }
      }
    }
  }

  function clearProviderTestResults(providerId: string): void {
    if (!testResults.value[providerId]) return
    const nextResults = { ...testResults.value }
    delete nextResults[providerId]
    testResults.value = nextResults
  }

  function getModelTestStatus(providerId: string, modelId: string): ModelTestState {
    return testResults.value[providerId]?.[modelId] || { status: 'idle' }
  }

  async function testProviderModels(
    providerId: string,
    modelIds: string[],
    prompt?: string
  ): Promise<void> {
    if (modelIds.length === 0) return

    modelIds.forEach((modelId) => {
      setModelTestStatus(providerId, modelId, {
        status: 'testing',
        latency: undefined,
        message: undefined,
        errorCode: undefined,
        errorType: undefined
      })
    })

    for (const modelId of modelIds) {
      try {
        const result = await ModelConfigDataSource.testProviderModel(providerId, modelId, prompt)
        setModelTestStatus(providerId, modelId, {
          status: result.status,
          latency: result.latency,
          message: result.message,
          errorCode: result.errorCode,
          errorType: result.errorType
        })
      } catch (error) {
        setModelTestStatus(providerId, modelId, {
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
          errorType: 'Unknown Error',
          latency: undefined,
          errorCode: undefined
        })
      }
    }
  }

  async function addSingleRemoteModel(remoteModel: { id: string }): Promise<void> {
    if (!selectedProviderId.value || !selectedProvider.value) return
    if (selectedProvider.value.models.some((model) => model.id === remoteModel.id)) return

    providers.value = providers.value.map((provider) => {
      if (provider.id !== selectedProviderId.value) return provider
      return {
        ...provider,
        models: [
          ...provider.models,
          {
            id: remoteModel.id,
            name: remoteModel.id,
            group: inferGroupFromModelId(remoteModel.id)
          }
        ]
      }
    })
    await autoSave()
  }

  async function addGroupModels(groupName: string, models: Array<{ id: string }>): Promise<void> {
    if (!selectedProviderId.value || !selectedProvider.value) return
    const currentIds = new Set(selectedProvider.value.models.map((model) => model.id))
    const modelsToAdd = models
      .filter((model) => !currentIds.has(model.id))
      .map((model) => ({
        id: model.id,
        name: model.id,
        group: groupName !== 'default' ? groupName : inferGroupFromModelId(model.id)
      }))

    if (modelsToAdd.length === 0) return

    providers.value = providers.value.map((provider) => {
      if (provider.id !== selectedProviderId.value) return provider
      return {
        ...provider,
        models: [...provider.models, ...modelsToAdd]
      }
    })
    await autoSave()
  }

  async function handleManualAddModel(): Promise<void> {
    if (!selectedProviderId.value || !newModelForm.value.id.trim()) return
    const nextModel = {
      id: newModelForm.value.id.trim(),
      name: newModelForm.value.name.trim() || newModelForm.value.id.trim(),
      group: newModelForm.value.group?.trim() || undefined
    }
    providers.value = providers.value.map((provider) => {
      if (provider.id !== selectedProviderId.value) return provider
      return {
        ...provider,
        models: [...provider.models, nextModel]
      }
    })
    newModelForm.value = { id: '', name: '', group: '' }
    isAddModelModalOpen.value = false
    await autoSave()
  }

  async function removeModel(modelId: string): Promise<void> {
    if (!selectedProviderId.value) return
    providers.value = providers.value.map((provider) => {
      if (provider.id !== selectedProviderId.value) return provider
      return {
        ...provider,
        models: provider.models.filter((model) => model.id !== modelId)
      }
    })

    const providerId = selectedProviderId.value
    const providerResults = testResults.value[providerId]
    if (providerResults?.[modelId]) {
      const nextProviderResults = { ...providerResults }
      delete nextProviderResults[modelId]
      testResults.value = {
        ...testResults.value,
        [providerId]: nextProviderResults
      }
    }

    await autoSave()
  }

  async function removeSingleRemoteModel(modelId: string): Promise<void> {
    await removeModel(modelId)
  }

  async function removeGroupModels(
    _groupName: string,
    models: Array<{ id: string }>
  ): Promise<void> {
    if (!selectedProviderId.value) return
    const idsToRemove = new Set(models.map((model) => model.id))
    providers.value = providers.value.map((provider) => {
      if (provider.id !== selectedProviderId.value) return provider
      return {
        ...provider,
        models: provider.models.filter((model) => !idsToRemove.has(model.id))
      }
    })

    const providerId = selectedProviderId.value
    const providerResults = testResults.value[providerId]
    if (providerResults) {
      const nextProviderResults = { ...providerResults }
      models.forEach((model) => delete nextProviderResults[model.id])
      testResults.value = {
        ...testResults.value,
        [providerId]: nextProviderResults
      }
    }

    await autoSave()
  }

  return {
    providers,
    selectedProviderId,
    selectedProvider,
    isProviderModalOpen,
    isEditingProvider,
    isAddModelModalOpen,
    isManageModelsModalOpen,
    isLoadingModels,
    remoteModelGroups,
    testResults,
    providerForm,
    newModelForm,
    fetchProviders,
    selectProvider,
    openCreateProviderModal,
    openEditProviderModal,
    closeProviderModal,
    submitProviderForm,
    handleDeleteProvider,
    updateProviderApiKey,
    updateProviderBaseUrl,
    updateProviderOfficialWebsite,
    updateProviderServiceSettings,
    openManageModels,
    setModelTestStatus,
    getModelTestStatus,
    clearProviderTestResults,
    testProviderModels,
    addSingleRemoteModel,
    addGroupModels,
    handleManualAddModel,
    removeModel,
    removeSingleRemoteModel,
    removeGroupModels
  }
})
