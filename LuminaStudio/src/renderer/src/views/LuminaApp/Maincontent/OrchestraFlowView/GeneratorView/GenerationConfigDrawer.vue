<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="of-generation-config-drawer fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-[1px]"
      @click.self="$emit('close')"
    >
      <aside
        class="flex h-full w-full max-w-[420px] flex-col border-l border-gray-200 bg-white shadow-2xl"
      >
        <header class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div>
            <h3 class="text-[13px] font-semibold uppercase tracking-wider text-gray-800">
              生成配置
            </h3>
            <p class="mt-1 text-xs leading-5 text-gray-500">阶段模型与模型选择器都放在这里维护。</p>
          </div>
          <button
            type="button"
            class="text-sm text-gray-400 transition-colors hover:text-gray-700"
            @click="$emit('close')"
          >
            ×
          </button>
        </header>

        <div class="flex-1 overflow-y-auto p-4">
          <div class="space-y-3">
            <section
              v-for="phase in phaseOrder"
              :key="phase"
              class="rounded border border-gray-200 bg-white px-4 py-3 shadow-sm"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-[13px] font-semibold text-gray-900">
                      {{ phaseLabelMap[phase] }}
                    </span>
                    <span class="text-[11px] font-mono text-gray-500">model</span>
                    <span
                      v-if="models[phase]?.enabled"
                      class="text-[10px] font-semibold uppercase text-emerald-600"
                    >
                      启用
                    </span>
                  </div>
                  <div class="mt-2 text-xs leading-5 text-gray-500">
                    {{ formatModelSummary(models[phase]) }}
                  </div>
                </div>
                <button
                  type="button"
                  class="rounded border border-gray-200 px-2.5 py-1 text-xs text-gray-700 transition-colors hover:border-cyan-500 hover:text-cyan-700"
                  @click="openModelSelector(phase)"
                >
                  选择模型
                </button>
              </div>
            </section>
          </div>
        </div>

        <footer
          class="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-3"
        >
          <span class="text-xs text-gray-500">修改后点击保存，才会写回 generation session。</span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded border border-gray-200 bg-white px-3 py-1.5 text-[13px] text-gray-700 transition-colors hover:border-gray-300"
              @click="$emit('close')"
            >
              取消
            </button>
            <button
              type="button"
              class="rounded bg-gray-900 px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-gray-800"
              @click="$emit('save')"
            >
              保存配置
            </button>
          </div>
        </footer>
      </aside>

      <ModelSelector
        v-model:visible="selectorVisible"
        :current-provider-id="selectorProviderId"
        :current-model-id="selectorModelId"
        title="选择阶段模型"
        search-placeholder="搜索模型名称..."
        empty-text="未找到可用模型"
        hint-text="选择后会写入当前阶段配置"
        :show-manage-button="false"
        @select="handleModelSelect"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { OFGenerationPhase, OFGenerationPhaseModelConfig } from '@shared/Orchestraflow-types'
import ModelSelector from '@renderer/components/ModelSelector/index.vue'
import type { Model, ModelProvider } from '@renderer/stores/model-config/types'

const props = defineProps<{
  visible: boolean
  models: Record<OFGenerationPhase, OFGenerationPhaseModelConfig>
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save'): void
  (e: 'update-model', phase: OFGenerationPhase, patch: Partial<OFGenerationPhaseModelConfig>): void
}>()

const phaseOrder: OFGenerationPhase[] = ['plan', 'wire', 'config', 'validate']
const phaseLabelMap: Record<OFGenerationPhase, string> = {
  plan: '规划',
  wire: '连线',
  config: '配置',
  validate: '校验'
}

const selectorVisible = ref(false)
const selectorPhase = ref<OFGenerationPhase>('plan')
const selectorProviderId = ref<string | null>(null)
const selectorModelId = ref<string | null>(null)

function formatModelSummary(config: OFGenerationPhaseModelConfig | undefined): string {
  if (!config?.model) {
    return '未选择模型'
  }
  if (config.provider) {
    return `${config.provider} / ${config.model}`
  }
  return config.model
}

function openModelSelector(phase: OFGenerationPhase) {
  selectorPhase.value = phase
  selectorProviderId.value = props.models[phase]?.provider || null
  selectorModelId.value = props.models[phase]?.model || null
  selectorVisible.value = true
}

function handleModelSelect(payload: { provider: ModelProvider; model: Model }) {
  emit('update-model', selectorPhase.value, {
    phase: selectorPhase.value,
    provider: payload.provider.id,
    model: payload.model.id,
    enabled: true
  })
}
</script>
