<template>
  <div class="gs-global-settings mx-auto max-w-3xl px-6 py-6">
    <div class="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-100 px-6 py-5">
        <div class="text-lg font-semibold text-slate-900">全局配置</div>
        <div class="mt-1 text-sm text-slate-500">
          控制 Generate 子系统的调试行为。默认保持关闭，避免无意中放大数据库体积。
        </div>
      </div>

      <div class="space-y-4 px-6 py-5">
        <div
          class="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs leading-6 text-amber-700"
        >
          开启后，Generate 会把 assistant 的原始 LLM 文本和 provider
          事件追踪完整写入数据库，仅建议调试时临时打开。
        </div>

        <div
          class="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-4"
        >
          <div class="min-w-0">
            <div class="text-sm font-medium text-slate-800">保存原始 LLM 输出到数据库</div>
            <div class="mt-1 text-xs leading-6 text-slate-500">
              关闭时保持原本普通行为；开启后可在“查看原始会话”里看到完整 raw 输出和事件追踪。
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-3">
            <span
              :class="[
                'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                modelValue ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
              ]"
            >
              {{ modelValue ? '已开启' : '已关闭' }}
            </span>
            <ToggleSwitch
              :model-value="modelValue"
              @update:model-value="$emit('update:modelValue', $event)"
            />
          </div>
        </div>

        <div v-if="isLoading" class="text-xs text-slate-400">正在加载 Generate 全局配置...</div>
        <div v-else-if="isSaving" class="text-xs text-slate-400">正在保存配置...</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ToggleSwitch from '@renderer/views/LuminaApp/Maincontent/OrchestraFlowView/EditorView/PanelLayer/Components/ToggleSwitch/index.vue'

defineProps<{
  modelValue: boolean
  isLoading: boolean
  isSaving: boolean
}>()

defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()
</script>
