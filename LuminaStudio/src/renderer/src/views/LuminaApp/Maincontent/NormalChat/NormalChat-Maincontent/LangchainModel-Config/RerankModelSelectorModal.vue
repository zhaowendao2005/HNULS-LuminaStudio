<template>
  <div v-if="visible" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-black/20 backdrop-blur-sm"
      style="animation: fadeIn 0.3s ease-out"
      @click="$emit('update:visible', false)"
    ></div>

    <!-- Content -->
    <div
      class="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[80vh] overflow-hidden"
      style="animation: slideUpBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)"
    >
      <!-- Header -->
      <div class="px-5 py-4 border-b border-slate-100">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-base font-semibold text-slate-800">选择重排模型</h3>
          <button
            class="text-slate-400 hover:text-slate-600 transition-colors"
            @click="$emit('update:visible', false)"
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
            placeholder="搜索重排模型..."
            class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>
      </div>

      <!-- Model List -->
      <div class="flex-1 overflow-y-auto p-2 space-y-1">
        <!-- Loading -->
        <div v-if="rerankStore.isLoading" class="text-center py-8 text-slate-400">
          <svg
            class="w-8 h-8 mx-auto mb-3 animate-spin text-slate-300"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p class="text-sm">加载中...</p>
        </div>

        <!-- Error -->
        <div v-else-if="rerankStore.error" class="text-center py-8 text-red-400">
          <svg
            class="w-8 h-8 mx-auto mb-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4m0 4h.01" />
          </svg>
          <p class="text-sm">{{ rerankStore.error }}</p>
          <button
            @click="rerankStore.fetchModels(true)"
            class="mt-2 text-xs text-emerald-600 hover:underline"
          >
            重试
          </button>
        </div>

        <!-- Model Groups -->
        <template v-else-if="filteredGroups && Object.keys(filteredGroups).length > 0">
          <div
            v-for="(models, groupName) in filteredGroups"
            :key="groupName"
            class="mb-2 last:mb-0"
          >
            <div
              class="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"
            >
              <span>{{ groupName }}</span>
              <span class="h-px flex-1 bg-slate-100"></span>
            </div>

            <button
              v-for="model in models"
              :key="model.id"
              @click="handleSelect(model)"
              class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
              :class="{ 'bg-amber-50 hover:bg-amber-50/80': currentModelId === model.id }"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold border shadow-sm transition-colors"
                  :class="
                    currentModelId === model.id
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-slate-600 border-slate-200 group-hover:border-slate-300'
                  "
                >
                  R
                </div>
                <div class="text-left">
                  <div
                    class="text-sm font-medium"
                    :class="currentModelId === model.id ? 'text-amber-900' : 'text-slate-700'"
                  >
                    {{ model.displayName }}
                  </div>
                  <div class="text-[10px] text-slate-400">
                    {{ model.providerName || model.id }}
                  </div>
                </div>
              </div>

              <div v-if="currentModelId === model.id" class="text-amber-600">
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

        <!-- Empty -->
        <div v-else class="text-center py-8 text-slate-400 text-sm">
          <svg
            class="w-8 h-8 mx-auto mb-3 text-slate-300"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <path d="M12 8v8m-4-4h8" />
          </svg>
          <p>{{ searchQuery ? '未找到相关模型' : '暂无可用的重排模型' }}</p>
          <p class="text-xs mt-1 text-slate-300">请确保 KnowledgeDatabase 服务已启动</p>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="p-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 px-5"
      >
        <span>从 KnowledgeDatabase 获取</span>
        <button
          @click="rerankStore.fetchModels(true)"
          class="hover:text-emerald-600 transition-colors"
        >
          刷新列表
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRerankModelStore } from '@renderer/stores/rerank-model/store'
import type { RerankModel } from '@renderer/stores/rerank-model/types'

const props = defineProps<{
  visible: boolean
  currentModelId: string | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'select', model: RerankModel): void
}>()

const searchQuery = ref('')
const rerankStore = useRerankModelStore()

const filteredGroups = computed(() => {
  const groups = rerankStore.modelGroups
  if (!searchQuery.value) return groups

  const query = searchQuery.value.toLowerCase()
  const filtered: typeof groups = {}

  for (const [groupName, models] of Object.entries(groups)) {
    const matchedModels = models.filter(
      (m) =>
        m.displayName.toLowerCase().includes(query) ||
        m.id.toLowerCase().includes(query) ||
        (m.providerName && m.providerName.toLowerCase().includes(query))
    )
    if (matchedModels.length > 0) {
      filtered[groupName] = matchedModels
    }
  }

  return filtered
})

const handleSelect = (model: RerankModel) => {
  emit('select', model)
  emit('update:visible', false)
}

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) return
    await rerankStore.fetchModels()
  }
)
</script>

<style scoped>
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
