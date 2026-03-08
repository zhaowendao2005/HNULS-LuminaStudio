<template>
  <CapsuleTooltip :text="text || placeholder" placement="top" :max-width="tooltipMaxWidth">
    <button
      type="button"
      class="of-ref-trigger"
      :class="[buttonClass, { 'of-ref-trigger-empty': !text }]"
      @click="handleClick"
    >
      <span v-if="$slots.icon" class="flex shrink-0 items-center">
        <slot name="icon" />
      </span>
      <span class="of-ref-text">{{ text || placeholder }}</span>
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

<style scoped src="../../../../styles/node-panel.scss"></style>
