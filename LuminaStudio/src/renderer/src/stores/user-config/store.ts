import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { UserConfigDataSource } from './datasource'
import type { ApiKeyEntry, ApiKeysConfig } from '@preload/types'
import type { UserConfigState } from './types'

/**
 * User Config Store (SSOT)
 *
 * 用户 API Key registry 的单一事实来源。
 */
export const useUserConfigStore = defineStore('user-config', () => {
  // === State ===
  const apiKeys = ref<UserConfigState['apiKeys']>({ entries: [] })
  const isLoaded = ref<UserConfigState['isLoaded']>(false)
  const isLoading = ref(false)
  const isSaving = ref(false)

  // === Computed ===
  const apiKeyEntries = computed(() => apiKeys.value.entries || [])

  /**
   * 兼容旧调用方。
   *
   * 当前仓库仍有其他区域按“PubMed 单条字符串”读取，
   * 这里先回退到“取第一条启用的 pubmed entry”，
   * 以免本轮设置改造影响未纳入范围的模块。
   */
  const pubmedApiKey = computed(() => {
    const matchedEntry = apiKeyEntries.value.find(
      (entry) => entry.provider_id === 'pubmed' && entry.enabled && entry.api_key.trim()
    )
    return matchedEntry?.api_key || ''
  })

  /**
   * 按 provider 分组，供设置页集中管理与筛选。
   */
  const entriesByProvider = computed(() => {
    const grouped = new Map<string, ApiKeyEntry[]>()

    apiKeyEntries.value.forEach((entry) => {
      const providerEntries = grouped.get(entry.provider_id) || []
      providerEntries.push(entry)
      grouped.set(entry.provider_id, providerEntries)
    })

    return Array.from(grouped.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([providerId, entries]) => ({ providerId, entries }))
  })

  // === Actions ===
  async function fetchApiKeys(): Promise<void> {
    if (isLoading.value) return
    isLoading.value = true
    try {
      const keys = await UserConfigDataSource.getApiKeys()
      apiKeys.value = keys || { entries: [] }
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
      apiKeys.value = keys || { entries: [] }
      isLoaded.value = true
    } finally {
      isSaving.value = false
    }
  }

  function getEntriesByProvider(providerId: string): ApiKeyEntry[] {
    return apiKeyEntries.value.filter((entry) => entry.provider_id === providerId)
  }

  return {
    apiKeys,
    isLoaded,
    isLoading,
    isSaving,
    apiKeyEntries,
    pubmedApiKey,
    entriesByProvider,
    fetchApiKeys,
    updateApiKeys,
    getEntriesByProvider
  }
})
