<template>
  <div
    ref="triggerRef"
    class="of-capsule-tooltip group relative flex min-w-0"
    @mouseenter="showTooltip"
    @mouseleave="hideTooltip"
  >
    <slot />
  </div>
  <Teleport to="body">
    <Transition name="of-capsule-tooltip-fade">
      <div
        v-if="visible && text"
        class="pointer-events-none fixed z-[2147483647] rounded-xl border border-white/70 bg-white/92 px-3 py-1.5 text-xs text-slate-700 shadow-[0_12px_40px_rgba(15,23,42,0.14)] backdrop-blur-md"
        :style="tooltipStyle"
      >
        <div class="truncate whitespace-nowrap" :title="text">{{ text }}</div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    text: string
    placement?: 'top' | 'bottom' | 'left' | 'right'
    maxWidth?: string
  }>(),
  {
    placement: 'top',
    maxWidth: '320px'
  }
)

const visible = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const tooltipPosition = ref({ top: 0, left: 0 })

const GAP = 10

const tooltipStyle = computed(() => {
  if (props.placement === 'bottom') {
    return {
      maxWidth: props.maxWidth,
      top: `${tooltipPosition.value.top}px`,
      left: `${tooltipPosition.value.left}px`,
      transform: 'translate(-50%, 0)'
    }
  }
  if (props.placement === 'left') {
    return {
      maxWidth: props.maxWidth,
      top: `${tooltipPosition.value.top}px`,
      left: `${tooltipPosition.value.left}px`,
      transform: 'translate(-100%, -50%)'
    }
  }
  if (props.placement === 'right') {
    return {
      maxWidth: props.maxWidth,
      top: `${tooltipPosition.value.top}px`,
      left: `${tooltipPosition.value.left}px`,
      transform: 'translate(0, -50%)'
    }
  }
  return {
    maxWidth: props.maxWidth,
    top: `${tooltipPosition.value.top}px`,
    left: `${tooltipPosition.value.left}px`,
    transform: 'translate(-50%, -100%)'
  }
})

function updatePosition() {
  const element = triggerRef.value
  if (!element) return
  const rect = element.getBoundingClientRect()

  if (props.placement === 'bottom') {
    tooltipPosition.value = {
      top: rect.bottom + GAP,
      left: rect.left + rect.width / 2
    }
    return
  }

  if (props.placement === 'left') {
    tooltipPosition.value = {
      top: rect.top + rect.height / 2,
      left: rect.left - GAP
    }
    return
  }

  if (props.placement === 'right') {
    tooltipPosition.value = {
      top: rect.top + rect.height / 2,
      left: rect.right + GAP
    }
    return
  }

  tooltipPosition.value = {
    top: rect.top - GAP,
    left: rect.left + rect.width / 2
  }
}

async function showTooltip() {
  visible.value = true
  await nextTick()
  updatePosition()
  window.addEventListener('scroll', updatePosition, true)
  window.addEventListener('resize', updatePosition)
}

function hideTooltip() {
  visible.value = false
  window.removeEventListener('scroll', updatePosition, true)
  window.removeEventListener('resize', updatePosition)
}

onBeforeUnmount(() => {
  hideTooltip()
})
</script>

<style scoped>
.of-capsule-tooltip-fade-enter-active,
.of-capsule-tooltip-fade-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.of-capsule-tooltip-fade-enter-from,
.of-capsule-tooltip-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
