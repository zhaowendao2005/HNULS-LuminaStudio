<template>
  <CapsuleTooltip :text="text || placeholder" placement="top" :max-width="tooltipMaxWidth">
    <button
      type="button"
      class="flex h-8 min-w-0 w-full items-center gap-1.5 overflow-hidden rounded-md border border-gray-200 bg-white px-2 py-1 text-gray-700 shadow-sm transition"
      :class="buttonClass"
      @click="handleClick"
    >
      <span v-if="$slots.icon" class="flex shrink-0 items-center">
        <slot name="icon" />
      </span>
      <span class="min-w-0 flex-1 truncate text-left">{{ text || placeholder }}</span>
    </button>
  </CapsuleTooltip>
</template>

<script setup lang="ts">
import CapsuleTooltip from './CapsuleTooltip.vue'

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

withDefaults(
  defineProps<{
    text?: string
    placeholder?: string
    buttonClass?: string
    tooltipMaxWidth?: string
  }>(),
  {
    text: '',
    placeholder: '选择变量',
    buttonClass: '',
    tooltipMaxWidth: '420px'
  }
)

function handleClick(event: MouseEvent) {
  emit('click', event)
}
</script>
