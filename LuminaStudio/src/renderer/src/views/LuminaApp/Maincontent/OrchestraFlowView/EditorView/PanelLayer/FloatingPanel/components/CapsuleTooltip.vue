<template>
  <div
    class="of-capsule-tooltip group relative flex min-w-0"
    @mouseenter="visible = true"
    @mouseleave="visible = false"
  >
    <slot />
    <Transition name="of-capsule-tooltip-fade">
      <div
        v-if="visible && text"
        class="pointer-events-none absolute z-[70] rounded-xl border border-white/50 bg-white/80 px-3 py-1.5 text-xs text-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.08)] backdrop-blur-md"
        :class="placementClass"
        :style="{ maxWidth }"
      >
        <div class="truncate whitespace-nowrap" :title="text">{{ text }}</div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

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

const placementClass = computed(() => {
  if (props.placement === 'bottom') {
    return 'left-1/2 top-full mt-2 -translate-x-1/2'
  }
  if (props.placement === 'left') {
    return 'right-full top-1/2 mr-2 -translate-y-1/2'
  }
  if (props.placement === 'right') {
    return 'left-full top-1/2 ml-2 -translate-y-1/2'
  }
  return 'bottom-full left-1/2 mb-2 -translate-x-1/2'
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
