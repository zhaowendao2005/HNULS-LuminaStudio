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
        ref="tooltipRef"
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
const tooltipRef = ref<HTMLElement | null>(null)
const tooltipPosition = ref({ top: 0, left: 0 })

const GAP = 10
const VIEWPORT_PADDING = 8

const tooltipStyle = computed(() => {
  return {
    maxWidth: props.maxWidth,
    top: `${tooltipPosition.value.top}px`,
    left: `${tooltipPosition.value.left}px`
  }
})

function updatePosition() {
  const element = triggerRef.value
  const tooltip = tooltipRef.value
  if (!element || !tooltip) return
  const rect = element.getBoundingClientRect()
  const tooltipRect = tooltip.getBoundingClientRect()
  const width = tooltipRect.width
  const height = tooltipRect.height
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let placement = props.placement

  if (placement === 'top' && rect.top - height - GAP < VIEWPORT_PADDING) {
    placement = 'bottom'
  } else if (
    placement === 'bottom' &&
    rect.bottom + height + GAP > viewportHeight - VIEWPORT_PADDING
  ) {
    placement = 'top'
  } else if (placement === 'left' && rect.left - width - GAP < VIEWPORT_PADDING) {
    placement = 'right'
  } else if (
    placement === 'right' &&
    rect.right + width + GAP > viewportWidth - VIEWPORT_PADDING
  ) {
    placement = 'left'
  }

  let top = rect.top - height - GAP
  let left = rect.left + rect.width / 2 - width / 2

  if (placement === 'bottom') {
    top = rect.bottom + GAP
    left = rect.left + rect.width / 2 - width / 2
  } else if (placement === 'left') {
    top = rect.top + rect.height / 2 - height / 2
    left = rect.left - width - GAP
  } else if (placement === 'right') {
    top = rect.top + rect.height / 2 - height / 2
    left = rect.right + GAP
  }

  tooltipPosition.value = {
    top: Math.min(Math.max(VIEWPORT_PADDING, top), viewportHeight - height - VIEWPORT_PADDING),
    left: Math.min(Math.max(VIEWPORT_PADDING, left), viewportWidth - width - VIEWPORT_PADDING)
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
