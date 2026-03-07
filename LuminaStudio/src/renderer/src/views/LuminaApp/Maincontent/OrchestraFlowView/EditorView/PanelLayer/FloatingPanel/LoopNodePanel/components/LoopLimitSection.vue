<template>
  <section class="space-y-3 border-t border-gray-100 pt-4">
    <div class="space-y-1">
      <div class="system-sm-semibold-uppercase text-gray-700">最大循环次数</div>
      <p class="text-xs leading-5 text-gray-500">限制单次运行的最大迭代次数，避免循环失控。</p>
    </div>

    <div class="flex items-center justify-between gap-4 border-l-2 border-violet-200 pl-3">
      <div class="min-w-0">
        <div class="text-[13px] font-semibold leading-[18px] text-violet-700">当前次数</div>
        <div class="mt-1 text-xs text-gray-500">超过上限后自动结束本次循环。</div>
      </div>

      <div class="flex shrink-0 items-center gap-3">
        <button
          type="button"
          class="text-[13px] font-semibold leading-[18px] text-gray-400 transition hover:text-violet-600"
          @click="updateValue(modelValue - 1)"
        >
          减少
        </button>
        <button
          type="button"
          class="min-w-[52px] border-b border-violet-300 px-1 pb-1 text-center text-[13px] font-semibold leading-[18px] text-gray-900"
          @click="stepInputVisible = !stepInputVisible"
        >
          {{ modelValue }} 次
        </button>
        <button
          type="button"
          class="text-[13px] font-semibold leading-[18px] text-gray-400 transition hover:text-violet-600"
          @click="updateValue(modelValue + 1)"
        >
          增加
        </button>
      </div>
    </div>

    <div v-if="stepInputVisible" class="flex items-center gap-2 pl-4 text-xs text-gray-500">
      <span>直接输入</span>
      <button
        type="button"
        class="border-b border-gray-300 pb-0.5 text-[13px] font-semibold leading-[18px] text-gray-900 outline-none"
      >
        <input
          ref="inputRef"
          :value="modelValue"
          type="number"
          min="1"
          class="w-16 border-0 bg-transparent px-0 text-center text-[13px] font-semibold leading-[18px] text-gray-900 outline-none"
          :class="theme.controlFocusClass"
          @input="updateValue(Number(($event.target as HTMLInputElement).value || 1))"
          @blur="stepInputVisible = false"
        />
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { OFPanelTheme } from '../../panel-theme'

const props = defineProps<{
  modelValue: number
  theme: OFPanelTheme
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const stepInputVisible = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

function updateValue(value: number) {
  emit('update:modelValue', Math.max(1, Number.isFinite(value) ? Math.trunc(value) : 1))
}

watch(stepInputVisible, async (visible) => {
  if (!visible) return
  await nextTick()
  inputRef.value?.focus()
  inputRef.value?.select()
})

watch(
  () => props.modelValue,
  () => {
    if (props.modelValue < 1) {
      stepInputVisible.value = false
    }
  }
)
</script>
