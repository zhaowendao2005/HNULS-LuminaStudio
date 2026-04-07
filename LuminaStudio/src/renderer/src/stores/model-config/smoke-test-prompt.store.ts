import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { SmokeTestPromptConfig, SmokeTestPromptSettings } from '@preload/types'
import { ModelConfigDataSource } from './datasource'

const DEFAULT_SMOKE_TEST_PROMPT = 'say "pong"'
const DEFAULT_SMOKE_TEST_PROMPT_NAME = '默认测试提示词'

function createDefaultConfig(): SmokeTestPromptConfig {
  const now = new Date().toISOString()
  return {
    id: 'default-smoke-test-prompt',
    name: DEFAULT_SMOKE_TEST_PROMPT_NAME,
    prompt: DEFAULT_SMOKE_TEST_PROMPT,
    createdAt: now,
    updatedAt: now
  }
}

function createDefaultSettings(): SmokeTestPromptSettings {
  const defaultConfig = createDefaultConfig()
  return {
    version: 1,
    activeConfigId: defaultConfig.id,
    configs: [defaultConfig]
  }
}

export const useSmokeTestPromptStore = defineStore('model-config-smoke-test-prompt', () => {
  const settings = ref<SmokeTestPromptSettings>(createDefaultSettings())
  const selectedConfigId = ref<string | null>(settings.value.activeConfigId)
  const isLoaded = ref(false)
  const isSaving = ref(false)

  const configs = computed(() => settings.value.configs)
  const activeConfigId = computed(() => settings.value.activeConfigId)
  const selectedConfig = computed(() => {
    return (
      configs.value.find((item) => item.id === selectedConfigId.value) || configs.value[0] || null
    )
  })
  const promptCharCount = computed(() => selectedConfig.value?.prompt.length || 0)

  async function ensureLoaded(): Promise<void> {
    if (isLoaded.value) return
    const nextSettings = await ModelConfigDataSource.getSmokeTestPromptSettings()
    settings.value = nextSettings
    selectedConfigId.value = nextSettings.activeConfigId
    isLoaded.value = true
  }

  async function persist(
    nextSettings: SmokeTestPromptSettings,
    nextSelectedConfigId?: string | null
  ): Promise<void> {
    isSaving.value = true
    try {
      const saved = await ModelConfigDataSource.saveSmokeTestPromptSettings(nextSettings)
      settings.value = saved
      selectedConfigId.value = nextSelectedConfigId ?? saved.activeConfigId
      isLoaded.value = true
    } finally {
      isSaving.value = false
    }
  }

  function selectConfig(id: string): void {
    selectedConfigId.value = id
  }

  async function createConfig(): Promise<void> {
    const now = new Date().toISOString()
    const config: SmokeTestPromptConfig = {
      id: `smoke-test-prompt-${Date.now()}`,
      name: `未命名配置 ${configs.value.length + 1}`,
      prompt: DEFAULT_SMOKE_TEST_PROMPT,
      createdAt: now,
      updatedAt: now
    }
    await persist(
      {
        ...settings.value,
        configs: [...configs.value, config]
      },
      config.id
    )
  }

  async function renameConfig(id: string, name: string): Promise<void> {
    const trimmed = name.trim() || DEFAULT_SMOKE_TEST_PROMPT_NAME
    await persist(
      {
        ...settings.value,
        configs: configs.value.map((item) => {
          if (item.id !== id) return item
          return {
            ...item,
            name: trimmed,
            updatedAt: new Date().toISOString()
          }
        })
      },
      selectedConfigId.value
    )
  }

  async function updateSelectedPrompt(prompt: string): Promise<void> {
    if (!selectedConfig.value) return
    await persist(
      {
        ...settings.value,
        configs: configs.value.map((item) => {
          if (item.id !== selectedConfig.value?.id) return item
          return {
            ...item,
            prompt,
            updatedAt: new Date().toISOString()
          }
        })
      },
      selectedConfig.value.id
    )
  }

  async function resetSelectedPrompt(): Promise<void> {
    if (!selectedConfig.value) return
    await persist(
      {
        ...settings.value,
        configs: configs.value.map((item) => {
          if (item.id !== selectedConfig.value?.id) return item
          return {
            ...item,
            prompt: DEFAULT_SMOKE_TEST_PROMPT,
            updatedAt: new Date().toISOString()
          }
        })
      },
      selectedConfig.value.id
    )
  }

  async function setActiveConfig(id: string): Promise<void> {
    await persist(
      {
        ...settings.value,
        activeConfigId: id
      },
      id
    )
  }

  async function removeConfig(id: string): Promise<void> {
    if (configs.value.length <= 1) return
    const nextConfigs = configs.value.filter((item) => item.id !== id)
    const fallbackId = nextConfigs[0]?.id || null
    const nextActiveConfigId =
      settings.value.activeConfigId === id ? fallbackId : settings.value.activeConfigId
    const nextSelectedConfigId = selectedConfigId.value === id ? fallbackId : selectedConfigId.value
    await persist(
      {
        ...settings.value,
        activeConfigId: nextActiveConfigId,
        configs: nextConfigs
      },
      nextSelectedConfigId
    )
  }

  function getPromptByConfigId(id: string): string {
    return configs.value.find((item) => item.id === id)?.prompt || DEFAULT_SMOKE_TEST_PROMPT
  }

  return {
    settings,
    configs,
    activeConfigId,
    selectedConfigId,
    selectedConfig,
    promptCharCount,
    isLoaded,
    isSaving,
    ensureLoaded,
    selectConfig,
    createConfig,
    renameConfig,
    updateSelectedPrompt,
    resetSelectedPrompt,
    setActiveConfig,
    removeConfig,
    getPromptByConfigId
  }
})
