<template>
  <Teleport to="body">
    <Transition name="of-centered-dialog">
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm" @click="handleMaskClick"></div>
        <!-- 根容器：定位类 of-centered-dialog-59d -->
        <div
          class="of-centered-dialog-59d relative z-10 flex max-h-[80vh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl"
          @click.stop
        >
          <!-- Header -->
          <div
            v-if="$slots.header || title"
            class="flex items-center justify-between border-b border-gray-100 px-6 py-4"
          >
            <div class="flex min-w-0 items-center gap-3">
              <div
                v-if="$slots.icon"
                class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50"
              >
                <slot name="icon" />
              </div>
              <div class="min-w-0">
                <div v-if="title" class="system-lg-semibold truncate text-gray-900">
                  {{ title }}
                </div>
                <div v-if="subtitle" class="system-xs-regular mt-0.5 truncate text-gray-500">
                  {{ subtitle }}
                </div>
                <slot name="header" />
              </div>
            </div>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              @click="close"
            >
              <svg
                class="h-4 w-4"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto px-6 py-4">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="border-t border-gray-100 px-6 py-4">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  title?: string
  subtitle?: string
  /**
   * 点击遮罩层是否关闭
   */
  closeOnMask?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

function close(): void {
  emit('update:modelValue', false)
}

function handleMaskClick(): void {
  if (props.closeOnMask ?? true) {
    close()
  }
}
</script>

<style scoped>
.of-centered-dialog-59d {
  font-family: inherit;
}

.of-centered-dialog-enter-active,
.of-centered-dialog-leave-active {
  transition: opacity 0.16s ease;
}

.of-centered-dialog-enter-from,
.of-centered-dialog-leave-to {
  opacity: 0;
}
</style>
