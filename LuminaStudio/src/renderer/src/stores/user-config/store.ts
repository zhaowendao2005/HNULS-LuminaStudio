import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { UserConfigDataSource } from './datasource'
import type { ApiKeysConfig } from '@preload/types'
import type { UserConfigState } from './types'

/**
 * User Config Store (SSOT)
 *
 * 用户配置（API keys）的单一事实来源
 */
export const useUserConfigStore = defineStore('user-config', () => {
  // === State ===
  const apiKeys = ref<UserConfigState['apiKeys']>({})
  const isLoaded = ref<UserConfigState['isLoaded']>(false)
  const isLoading = ref(false)
  const isSaving = ref(false)

  // === Computed ===
  const pubmedApiKey = computed(() => apiKeys.value.pubmed || '')

  // === Actions ===
  async function fetchApiKeys(): Promise<void> {
    if (isLoading.value) return
    isLoading.value = true
    try {
      const keys = await UserConfigDataSource.getApiKeys()
      apiKeys.value = keys || {}
      isLoaded.value = true
    } finally {
      isLoading.value = false
    }
  }

  async function updateApiKeys(patch: Partial<ApiKeysConfig>): Promise<void> {
    if (isSaving.value) return
    isSaving.value = true
    try {
      const keys = await UserConfigDataSource.updateApiKeys(patch)
      apiKeys.value = keys || {}
      isLoaded.value = true
    } finally {
      isSaving.value = false
    }
  }

  return {
    apiKeys,
    isLoaded,
    isLoading,
    isSaving,
    pubmedApiKey,
    fetchApiKeys,
    updateApiKeys
  }
})
