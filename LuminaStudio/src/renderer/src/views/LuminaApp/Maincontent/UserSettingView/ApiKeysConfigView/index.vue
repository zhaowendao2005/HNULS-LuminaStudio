<template>
  <div class="us-apikeys-view flex flex-col h-full overflow-hidden bg-slate-50">
    <!-- Header -->
    <div class="apikeys-header border-b border-slate-200 bg-white p-6 shadow-sm">
      <div class="max-w-4xl mx-auto">
        <button
          type="button"
          class="apikeys-back-button inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors mb-4"
          @click="$emit('back')"
        >
          <svg
            class="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          返回
        </button>
        <h1 class="apikeys-title text-2xl font-bold text-slate-900">秘钥管理</h1>
        <p class="apikeys-subtitle text-sm text-slate-500 mt-2">
          配置与管理外部服务 API 密钥，如 PubMed、Arxiv 等文献检索服务
        </p>
      </div>
    </div>

    <!-- Content -->
    <div class="apikeys-content flex-1 overflow-auto p-6">
      <div class="max-w-4xl mx-auto">
        <!-- Loading State -->
        <div v-if="isLoading" class="flex items-center justify-center py-12">
          <div class="text-slate-500">加载中...</div>
        </div>

        <!-- API Keys Form -->
        <div v-else class="space-y-6">
          <!-- PubMed API Key -->
          <div class="apikeys-section bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div class="flex items-start justify-between mb-4">
              <div>
                <h3 class="text-base font-semibold text-slate-800">PubMed API Key</h3>
                <p class="text-xs text-slate-500 mt-1">
                  用于访问 NCBI PubMed E-utilities API
                  <a
                    href="https://www.ncbi.nlm.nih.gov/account/"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-blue-600 hover:underline ml-1"
                  >
                    获取 API Key
                  </a>
                </p>
              </div>
            </div>

            <div class="space-y-3">
              <div class="relative">
                <input
                  v-model="formData.pubmed"
                  :type="showPubmedKey ? 'text' : 'password'"
                  placeholder="请输入 PubMed API Key"
                  class="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  @input="markAsModified"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  @click="showPubmedKey = !showPubmedKey"
                >
                  <svg
                    v-if="showPubmedKey"
                    class="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                    />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                  <svg
                    v-else
                    class="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>

              <p class="text-xs text-slate-500">
                注意：API Key 将以明文形式存储在本地。请妥善保管，不要泄露给他人。
              </p>
            </div>
          </div>

          <!-- More API Keys can be added here in the future -->

          <!-- Action Buttons -->
          <div class="flex items-center gap-3 justify-end">
            <button
              type="button"
              class="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              @click="handleReset"
              :disabled="!isModified || isSaving"
            >
              重置
            </button>
            <button
              type="button"
              class="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              @click="handleSave"
              :disabled="!isModified || isSaving"
            >
              {{ isSaving ? '保存中...' : '保存' }}
            </button>
          </div>

          <!-- Success Message -->
          <div
            v-if="showSuccessMessage"
            class="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700"
          >
            <svg
              class="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            保存成功
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useUserConfigStore } from '@renderer/stores/user-config/store'

defineEmits<{
  (e: 'back'): void
}>()

const userConfigStore = useUserConfigStore()

// 状态管理
const isLoading = computed(() => userConfigStore.isLoading)
const isSaving = computed(() => userConfigStore.isSaving)
const isModified = ref(false)
const showSuccessMessage = ref(false)
const showPubmedKey = ref(false)

// 表单数据
const formData = ref({
  pubmed: ''
})

// 原始数据（用于重置）
const originalData = ref({
  pubmed: ''
})

// 加载 API Keys
async function loadApiKeys(): Promise<void> {
  try {
    await userConfigStore.fetchApiKeys()
    formData.value.pubmed = userConfigStore.apiKeys.pubmed || ''
    originalData.value.pubmed = userConfigStore.apiKeys.pubmed || ''
  } catch (error) {
    console.error('Failed to load API keys:', error)
    // TODO: 显示错误提示
  }
}

// 标记为已修改
function markAsModified(): void {
  isModified.value = true
  showSuccessMessage.value = false
}

// 保存
async function handleSave(): Promise<void> {
  try {
    await userConfigStore.updateApiKeys({
      pubmed: formData.value.pubmed || undefined
    })

    // 更新原始数据
    originalData.value.pubmed = formData.value.pubmed

    isModified.value = false
    showSuccessMessage.value = true

    // 3秒后隐藏成功消息
    setTimeout(() => {
      showSuccessMessage.value = false
    }, 3000)
  } catch (error) {
    console.error('Failed to save API keys:', error)
    // TODO: 显示错误提示
  }
}

// 重置
function handleReset(): void {
  formData.value.pubmed = originalData.value.pubmed
  isModified.value = false
  showSuccessMessage.value = false
}

// 组件挂载时加载数据
onMounted(() => {
  loadApiKeys()
})

watch(
  () => userConfigStore.apiKeys.pubmed,
  (next) => {
    if (!isModified.value) {
      formData.value.pubmed = next || ''
      originalData.value.pubmed = next || ''
    }
  }
)
</script>

<style scoped>
/* Component-specific styles (if needed) will go here */
</style>
