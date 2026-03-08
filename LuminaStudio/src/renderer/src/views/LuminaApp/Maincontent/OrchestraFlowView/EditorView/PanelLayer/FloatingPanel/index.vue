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
        class="of-floating-panel flex h-full w-[420px] flex-col overflow-hidden rounded-2xl border transition-all"
        :class="[themeClass, active ? 'is-active' : 'is-inactive']"
      >
        <!-- 头部 -->
        <div class="of-floating-panel-header px-4 pt-4 pb-2 flex-shrink-0">
          <div class="flex items-center justify-between">
            <h3 class="system-xl-semibold of-floating-panel-title">{{ title }}</h3>
            <button class="of-floating-panel-close flex h-6 w-6 cursor-pointer items-center justify-center" @click="handleClose">
              <svg
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="currentColor"
                class="remixicon h-4 w-4"
              >
                <path
                  d="M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.04996 5.63672L11.9997 10.5865Z"
                ></path>
              </svg>
            </button>
          </div>
          <p v-if="description" class="system-sm-regular mt-1 of-floating-panel-description">
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
  themeClass?: string
  zIndex?: number
  offsetX?: number
  active?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  description: '',
  themeClass: '',
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
.of-floating-panel {
  --of-floating-accent: #10b981;
  --of-floating-accent-strong: #059669;
  --of-floating-soft-bg: #ecfdf5;
  --of-floating-soft-bg-strong: #d1fae5;
  --of-floating-soft-border: #a7f3d0;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--of-floating-soft-bg) 48%, #ffffff 52%) 0,
    #ffffff 5rem
  );
}

.of-floating-panel.is-active {
  border-color: var(--of-floating-soft-border);
  box-shadow:
    0 24px 48px rgba(15, 23, 42, 0.12),
    0 0 0 1px color-mix(in srgb, var(--of-floating-accent) 12%, transparent);
}

.of-floating-panel.is-inactive {
  border-color: color-mix(in srgb, var(--of-floating-accent) 22%, #e5e7eb 78%);
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
  opacity: 0.97;
}

.of-floating-panel-title {
  color: var(--of-floating-accent-strong);
}

.of-floating-panel-description {
  color: color-mix(in srgb, var(--of-floating-accent) 70%, #64748b 30%);
}

.of-floating-panel-close {
  color: color-mix(in srgb, var(--of-floating-accent) 55%, #94a3b8 45%);
  border-radius: 0.5rem;
  transition: color 150ms ease, background-color 150ms ease;
}

.of-floating-panel-close:hover {
  color: var(--of-floating-accent-strong);
  background: color-mix(in srgb, var(--of-floating-soft-bg-strong) 85%, #ffffff 15%);
}

.of-floating-panel.of-panel-theme-start {
  --of-floating-accent: #10b981;
  --of-floating-accent-strong: #059669;
  --of-floating-soft-bg: #ecfdf5;
  --of-floating-soft-bg-strong: #d1fae5;
  --of-floating-soft-border: #a7f3d0;
}

.of-floating-panel.of-panel-theme-llm {
  --of-floating-accent: #6366f1;
  --of-floating-accent-strong: #4f46e5;
  --of-floating-soft-bg: #eef2ff;
  --of-floating-soft-bg-strong: #e0e7ff;
  --of-floating-soft-border: #c7d2fe;
}

.of-floating-panel.of-panel-theme-iteration,
.of-floating-panel.of-panel-theme-ifelse {
  --of-floating-accent: #06b6d4;
  --of-floating-accent-strong: #0891b2;
  --of-floating-soft-bg: #ecfeff;
  --of-floating-soft-bg-strong: #cffafe;
  --of-floating-soft-border: #a5f3fc;
}

.of-floating-panel.of-panel-theme-loop {
  --of-floating-accent: #f59e0b;
  --of-floating-accent-strong: #d97706;
  --of-floating-soft-bg: #fffbeb;
  --of-floating-soft-bg-strong: #fef3c7;
  --of-floating-soft-border: #fcd34d;
}

.of-floating-panel.of-panel-theme-end {
  --of-floating-accent: #ef4444;
  --of-floating-accent-strong: #dc2626;
  --of-floating-soft-bg: #fef2f2;
  --of-floating-soft-bg-strong: #fee2e2;
  --of-floating-soft-border: #fecaca;
}

.of-floating-panel.of-panel-theme-variable-assign {
  --of-floating-accent: #0ea5e9;
  --of-floating-accent-strong: #0284c7;
  --of-floating-soft-bg: #f0f9ff;
  --of-floating-soft-bg-strong: #e0f2fe;
  --of-floating-soft-border: #bae6fd;
}

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
