<template>
  <div
    v-if="visible"
    class="of-kr-rerank-selector fixed inset-0 z-[70] flex items-center justify-center p-4"
  >
    <div
      class="absolute inset-0 bg-black/20 backdrop-blur-sm"
      style="animation: fadeIn 0.2s ease-out"
      @click="$emit('update:visible', false)"
    ></div>

    <div
      class="relative flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl"
      style="animation: slideUpBounce 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)"
    >
      <div class="border-b border-slate-100 px-5 py-4">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-base font-semibold text-slate-800">选择重排模型</h3>
          <button
            class="text-slate-400 transition-colors hover:text-slate-600"
            @click="$emit('update:visible', false)"
          >
            <svg
              class="h-5 w-5"
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

        <div class="relative">
          <svg
            class="absolute left-3 top-2.5 h-4 w-4 text-slate-400"
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
            class="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      <div class="flex-1 space-y-1 overflow-y-auto p-2">
        <div v-if="isLoading" class="py-8 text-center text-slate-400">
          <p class="text-sm">加载重排模型中...</p>
        </div>

        <div v-else-if="errorMessage" class="py-8 text-center text-red-500">
          <p class="text-sm">{{ errorMessage }}</p>
          <button
            class="mt-2 text-xs text-blue-600 hover:underline"
            @click="loadRerankModels(true)"
          >
            重试
          </button>
        </div>

        <template v-else-if="Object.keys(filteredGroups).length > 0">
          <div
            v-for="(groupModels, groupName) in filteredGroups"
            :key="groupName"
            class="mb-2 last:mb-0"
          >
            <div
              class="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"
            >
              <span>{{ groupName }}</span>
              <span class="h-px flex-1 bg-slate-100"></span>
            </div>

            <button
              v-for="model in groupModels"
              :key="model.id"
              class="group flex w-full items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50"
              :class="{ 'bg-blue-50 hover:bg-blue-50/80': currentModelId === model.id }"
              @click="handleSelect(model)"
            >
              <div class="flex items-center gap-3">
                <div
                  class="flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-bold shadow-sm transition-colors"
                  :class="
                    currentModelId === model.id
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-slate-200 bg-white text-slate-600 group-hover:border-slate-300'
                  "
                >
                  R
                </div>
                <div class="text-left">
                  <div
                    class="text-sm font-medium"
                    :class="currentModelId === model.id ? 'text-blue-900' : 'text-slate-700'"
                  >
                    {{ model.displayName }}
                  </div>
                  <div class="text-[10px] text-slate-400">
                    {{ model.providerName || model.id }}
                  </div>
                </div>
              </div>
              <div v-if="currentModelId === model.id" class="text-blue-600">
                <svg
                  class="h-4 w-4"
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

        <div v-else class="py-8 text-center text-sm text-slate-400">
          <p>{{ searchQuery ? '未找到相关重排模型' : '暂无可用重排模型' }}</p>
        </div>
      </div>

      <div
        class="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-400"
      >
        <span>OrchestraFlow 专用重排模型源</span>
        <button class="transition-colors hover:text-blue-600" @click="loadRerankModels(true)">
          刷新
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { RerankModelInfo } from '@preload/types'

const props = defineProps<{
  visible: boolean
  currentModelId: string | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'select', model: RerankModelInfo): void
}>()

const searchQuery = ref('')
const models = ref<RerankModelInfo[]>([])
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)

const groupedModels = computed<Record<string, RerankModelInfo[]>>(() => {
  const grouped: Record<string, RerankModelInfo[]> = {}
  for (const model of models.value) {
    const groupName = model.group || model.providerName || 'default'
    if (!grouped[groupName]) {
      grouped[groupName] = []
    }
    grouped[groupName].push(model)
  }

  const sorted: Record<string, RerankModelInfo[]> = {}
  Object.keys(grouped)
    .sort()
    .forEach((key) => {
      sorted[key] = grouped[key]
    })
  return sorted
})

const filteredGroups = computed<Record<string, RerankModelInfo[]>>(() => {
  if (!searchQuery.value) return groupedModels.value
  const query = searchQuery.value.toLowerCase()
  const filtered: Record<string, RerankModelInfo[]> = {}
  for (const [groupName, groupModels] of Object.entries(groupedModels.value)) {
    const matched = groupModels.filter(
      (model) =>
        model.displayName.toLowerCase().includes(query) ||
        model.id.toLowerCase().includes(query) ||
        (model.providerName || '').toLowerCase().includes(query)
    )
    if (matched.length > 0) {
      filtered[groupName] = matched
    }
  }
  return filtered
})

async function loadRerankModels(forceRefresh = false): Promise<void> {
  if (!forceRefresh && models.value.length > 0) return

  isLoading.value = true
  errorMessage.value = null
  try {
    const response = await window.api.orchestraflow.listRerankModels()
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to load orchestraflow rerank models')
    }
    models.value = response.data.models
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    isLoading.value = false
  }
}

function handleSelect(model: RerankModelInfo): void {
  emit('select', model)
  emit('update:visible', false)
}

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) return
    searchQuery.value = ''
    await loadRerankModels()
  }
)
</script>
