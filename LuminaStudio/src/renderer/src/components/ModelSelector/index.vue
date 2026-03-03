<template>
  <!-- nc_ModelSelector_Root_a8d3: 通用模型选择对话框根容器 -->
  <div
    v-if="visible"
    class="nc_ModelSelector_Root_a8d3 fixed inset-0 z-50 flex items-center justify-center p-4"
  >
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-black/20 backdrop-blur-sm"
      style="animation: fadeIn 0.3s ease-out"
      @click="handleClose"
    ></div>

    <!-- nc_ModelSelector_Content_a8d3: 对话框内容容器 -->
    <div
      class="nc_ModelSelector_Content_a8d3 relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[80vh] overflow-hidden"
      style="animation: slideUpBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)"
    >
      <!-- nc_ModelSelector_Header_a8d3: 对话框头部 -->
      <div class="nc_ModelSelector_Header_a8d3 px-5 py-4 border-b border-slate-100">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-base font-semibold text-slate-800">
            {{ title }}
          </h3>
          <button
            class="text-slate-400 hover:text-slate-600 transition-colors"
            @click="handleClose"
          >
            <svg
              class="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Search -->
        <div class="relative">
          <svg
            class="absolute left-3 top-2.5 w-4 h-4 text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="searchPlaceholder"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>
      </div>

      <!-- nc_ModelSelector_List_a8d3: 模型列表 -->
      <div class="nc_ModelSelector_List_a8d3 flex-1 overflow-y-auto p-2 space-y-1">
        <template v-for="provider in filteredProviders" :key="provider.id">
          <div v-if="provider.models.length > 0" class="mb-2 last:mb-0">
            <div
              class="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"
            >
              <span>{{ provider.name }}</span>
              <span class="h-px flex-1 bg-slate-100"></span>
            </div>

            <button
              v-for="model in provider.models"
              :key="model.id"
              @click="handleSelect(provider, model)"
              class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
              :class="{ 'bg-emerald-50 hover:bg-emerald-50/80': currentModelId === model.id }"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold border shadow-sm transition-colors"
                  :class="
                    currentModelId === model.id
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-white text-slate-600 border-slate-200 group-hover:border-slate-300'
                  "
                >
                  {{ model.name[0].toUpperCase() }}
                </div>
                <div class="text-left">
                  <div
                    class="text-sm font-medium"
                    :class="currentModelId === model.id ? 'text-emerald-900' : 'text-slate-700'"
                  >
                    {{ model.name }}
                  </div>
                  <div class="text-[10px] text-slate-400">
                    {{ model.group || model.id }}
                  </div>
                </div>
              </div>

              <div v-if="currentModelId === model.id" class="text-emerald-600">
                <svg
                  class="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
            </button>
          </div>
        </template>

        <div
          v-if="filteredProviders.every((p) => p.models.length === 0)"
          class="text-center py-8 text-slate-400 text-sm"
        >
          {{ emptyText }}
        </div>
      </div>

      <!-- nc_ModelSelector_Footer_a8d3: 对话框底部 -->
      <div
        class="nc_ModelSelector_Footer_a8d3 p-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 px-5"
      >
        <span>{{ hintText }}</span>
        <button
          v-if="showManageButton"
          class="hover:text-emerald-600 transition-colors"
          @click="handleManage"
        >
          {{ manageText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useModelConfigStore } from '@renderer/stores/model-config/store'
import type { ModelProvider, Model } from '@renderer/stores/model-config/types'

const props = withDefaults(
  defineProps<{
    visible: boolean
    currentProviderId: string | null
    currentModelId: string | null
    /** 标题文案，默认“切换模型” */
    title?: string
    /** 搜索框 placeholder */
    searchPlaceholder?: string
    /** 空列表提示文案 */
    emptyText?: string
    /** 底部提示文案 */
    hintText?: string
    /** 是否显示“管理模型源”按钮 */
    showManageButton?: boolean
    /** 管理按钮文案 */
    manageText?: string
    /** 打开时是否自动拉取 provider 列表（默认 true） */
    autoFetchProviders?: boolean
  }>(),
  {
    title: '切换模型',
    searchPlaceholder: '搜索模型名称...',
    emptyText: '未找到相关模型',
    hintText: '支持 Shift + Tab 切换',
    showManageButton: true,
    manageText: '管理模型源',
    autoFetchProviders: true
  }
)

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'select', payload: { provider: ModelProvider; model: Model }): void
  (e: 'manage'): void
}>()

const searchQuery = ref('')

const modelConfigStore = useModelConfigStore()
const providers = computed<ModelProvider[]>(() => modelConfigStore.providers)

const filteredProviders = computed(() => {
  if (!searchQuery.value) return providers.value

  const query = searchQuery.value.toLowerCase()
  return providers.value
    .map((p) => ({
      ...p,
      models: p.models.filter((m) => {
        const name = m.name?.toLowerCase?.() ?? ''
        const id = m.id?.toLowerCase?.() ?? ''
        const group = m.group?.toLowerCase?.() ?? ''
        const providerName = p.name?.toLowerCase?.() ?? ''
        return (
          name.includes(query) ||
          id.includes(query) ||
          group.includes(query) ||
          providerName.includes(query)
        )
      })
    }))
    .filter((p) => p.models.length > 0)
})

const handleSelect = (provider: ModelProvider, model: Model) => {
  emit('select', { provider, model })
  emit('update:visible', false)
}

const handleClose = () => {
  emit('update:visible', false)
}

const handleManage = () => {
  emit('manage')
}

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) return
    if (props.autoFetchProviders) {
      await modelConfigStore.fetchProviders()
    }
  }
)
</script>

<style>
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUpBounce {
  0% {
    opacity: 0;
    transform: translateY(100px) scale(0.95);
  }
  50% {
    opacity: 1;
    transform: translateY(-10px) scale(1.02);
  }
  75% {
    transform: translateY(5px) scale(0.99);
  }
  100% {
    transform: translateY(0) scale(1);
  }
}
</style>

