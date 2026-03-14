<template>
  <div v-if="visible" class="fixed inset-0 z-40 flex justify-end">
    <div class="absolute inset-0 bg-black/10" @click="$emit('close')"></div>
    <div
      class="relative flex h-full w-[360px] flex-col border-l border-gray-200 bg-white shadow-xl"
    >
      <div class="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 px-4">
        <div class="text-[13px] font-semibold text-gray-800">模型与阶段配置</div>
        <button
          type="button"
          class="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          @click="$emit('close')"
        >
          <X :size="16" />
        </button>
      </div>

      <div class="border-b border-gray-100 px-3 py-3">
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="item in tabs"
            :key="item.value"
            type="button"
            :class="[
              'rounded px-2 py-2 text-[11px] font-semibold transition-colors',
              activeTab === item.value
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            ]"
            @click="$emit('change-tab', item.value)"
          >
            {{ item.label }}
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-4 py-4">
        <div class="mb-4 rounded border border-gray-200 bg-gray-50 px-3 py-3 text-xs text-gray-600">
          当前模型：{{ modelConfigLabel }}
        </div>

        <component :is="panelComponent" v-bind="panelProps" v-on="panelListeners" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import type { GenerationStageKey } from '@preload/types'
import GenerateAnalysisConfigPanel from './GenerateAnalysisConfigPanel.vue'
import GenerateDesignConfigPanel from './GenerateDesignConfigPanel.vue'
import GenerateVerifyConfigPanel from './GenerateVerifyConfigPanel.vue'

const props = defineProps<{
  visible: boolean
  activeTab: GenerationStageKey
  modelConfigLabel: string
  analysisConfig: {
    discussionMemory: number
    copilotMemory: number
  }
  designConfig: {
    designMemory: number
    copilotMemory: number
    calibrationContextBudgetChars: number
  }
  verifyConfig: {
    verifyMemory: number
    copilotMemory: number
  }
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'change-tab', value: GenerationStageKey): void
  (e: 'update:analysis-discussion-memory', value: number): void
  (e: 'update:analysis-copilot-memory', value: number): void
  (e: 'update:design-memory', value: number): void
  (e: 'update:design-copilot-memory', value: number): void
  (e: 'update:design-calibration-context-budget-chars', value: number): void
  (e: 'update:verify-memory', value: number): void
  (e: 'update:verify-copilot-memory', value: number): void
}>()

const tabs = [
  { value: 'analysis', label: '需求分析' },
  { value: 'design', label: '规划设计' },
  { value: 'verify', label: '校验' }
] satisfies Array<{ value: GenerationStageKey; label: string }>

const panelComponent = computed(() => {
  if (props.activeTab === 'analysis') return GenerateAnalysisConfigPanel
  if (props.activeTab === 'design') return GenerateDesignConfigPanel
  return GenerateVerifyConfigPanel
})

const panelProps = computed(() => {
  if (props.activeTab === 'analysis') return props.analysisConfig
  if (props.activeTab === 'design') return props.designConfig
  return props.verifyConfig
})

const panelListeners = computed(() => {
  if (props.activeTab === 'analysis') {
    return {
      'update:discussion-memory': (value: number) =>
        emit('update:analysis-discussion-memory', value),
      'update:copilot-memory': (value: number) => emit('update:analysis-copilot-memory', value)
    }
  }
  if (props.activeTab === 'design') {
    return {
      'update:design-memory': (value: number) => emit('update:design-memory', value),
      'update:copilot-memory': (value: number) => emit('update:design-copilot-memory', value),
      'update:calibration-context-budget-chars': (value: number) =>
        emit('update:design-calibration-context-budget-chars', value)
    }
  }
  return {
    'update:verify-memory': (value: number) => emit('update:verify-memory', value),
    'update:copilot-memory': (value: number) => emit('update:verify-copilot-memory', value)
  }
})
</script>
