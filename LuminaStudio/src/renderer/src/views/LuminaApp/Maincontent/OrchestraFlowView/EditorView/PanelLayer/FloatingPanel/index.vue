<template>
  <!-- 通用浮窗容器：从右向左滑入 -->
  <Transition name="panel-slide">
    <div
      v-if="visible"
      class="absolute inset-y-0 py-1"
      :style="panelPositionStyle"
      @pointerdown="handleFocus"
    >
      <div
        class="of-floating-panel flex h-full w-[420px] flex-col overflow-hidden rounded-2xl border bg-white transition-all"
        :class="
          active
            ? 'border-emerald-200 shadow-2xl ring-1 ring-emerald-100'
            : 'border-gray-200 shadow-lg opacity-95'
        "
      >
        <!-- 头部 -->
        <div class="px-4 pt-4 pb-2 flex-shrink-0">
          <div class="flex items-center justify-between">
            <h3 class="system-xl-semibold text-gray-900">{{ title }}</h3>
            <button
              class="flex h-6 w-6 cursor-pointer items-center justify-center"
              @click="handleClose"
            >
              <svg
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="currentColor"
                class="remixicon h-4 w-4 text-gray-400"
              >
                <path
                  d="M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.04996 5.63672L11.9997 10.5865Z"
                ></path>
              </svg>
            </button>
          </div>
          <p v-if="description" class="system-sm-regular mt-1 text-gray-500">
            {{ description }}
          </p>
        </div>

        <!-- 内容区 -->
        <div class="flex-1 overflow-y-auto px-4 pb-4">
          <slot />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  visible: boolean
  title: string
  description?: string
  zIndex?: number
  offsetX?: number
  active?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  description: '',
  zIndex: 30,
  offsetX: 0,
  active: false
})

const emit = defineEmits<{
  close: []
  focus: []
}>()

const panelPositionStyle = computed(() => ({
  zIndex: props.zIndex,
  right: `${props.offsetX}px`
}))

function handleClose() {
  emit('close')
}

function handleFocus() {
  emit('focus')
}
</script>

<style scoped>
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: all 0.2s ease;
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
