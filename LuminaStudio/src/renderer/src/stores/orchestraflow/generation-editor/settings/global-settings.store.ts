import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { GenerationGlobalSettings } from '@preload/types'
import { OrchestflowGenerationEditorDataSource } from '../generation-editor.datasource'

const DEFAULT_SETTINGS: GenerationGlobalSettings = {
  persistRawLlmData: false
}

export const useGenerationGlobalSettingsStore = defineStore(
  'of-generation-global-settings',
  () => {
    const settings = ref<GenerationGlobalSettings>({ ...DEFAULT_SETTINGS })
    const isLoading = ref(false)
    const isSaving = ref(false)
    const isLoaded = ref(false)

    const persistRawLlmData = computed(() => settings.value.persistRawLlmData)

    async function initialize(): Promise<void> {
      if (isLoading.value) return
      isLoading.value = true
      try {
        const loaded = await OrchestflowGenerationEditorDataSource.getGlobalSettings()
        settings.value = loaded
        isLoaded.value = true
      } finally {
        isLoading.value = false
      }
    }

    async function updateSettings(
      patch: Partial<GenerationGlobalSettings>
    ): Promise<GenerationGlobalSettings> {
      if (isSaving.value) {
        return settings.value
      }

      isSaving.value = true
      try {
        const updated = await OrchestflowGenerationEditorDataSource.updateGlobalSettings(patch)
        settings.value = updated
        isLoaded.value = true
        return updated
      } finally {
        isSaving.value = false
      }
    }

    return {
      settings,
      isLoading,
      isSaving,
      isLoaded,
      persistRawLlmData,
      initialize,
      updateSettings
    }
  }
)
