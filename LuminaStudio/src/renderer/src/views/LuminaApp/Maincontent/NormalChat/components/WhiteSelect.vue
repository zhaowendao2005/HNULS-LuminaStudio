<template>
  <div ref="rootRef" class="WhiteSelect_root relative" :class="rootClass">
    <button
      type="button"
      class="WhiteSelect_trigger flex items-center justify-between gap-2 w-full rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm shadow-sm hover:bg-slate-50 transition"
      :class="triggerClass"
      :disabled="disabled"
      @click="toggle"
    >
      <div class="min-w-0 flex-1 text-left">
        <div class="truncate" :title="selectedLabel || placeholder">
          <span v-if="selectedLabel" class="text-slate-900">{{ selectedLabel }}</span>
          <span v-else class="text-slate-400">{{ placeholder }}</span>
        </div>
      </div>

      <svg
        class="h-4 w-4 text-slate-400 transition-transform"
        :class="open ? 'rotate-180' : 'rotate-0'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>

    <Transition name="white-select-pop">
      <div
        v-if="open"
        class="WhiteSelect_panel absolute z-50 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden"
        :class="panelClass"
      >
        <div v-if="$slots.header" class="WhiteSelect_header px-3 pt-3">
          <slot name="header" />
        </div>

        <div class="max-h-60 overflow-auto py-1">
          <button
            v-for="opt in options"
            :key="String(opt.value)"
            type="button"
            class="WhiteSelect_option w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition"
            :class="optionClass(opt.value)"
            @click="select(opt.value)"
          >
            <span class="min-w-0 flex-1 truncate" :title="opt.label">{{ opt.label }}</span>
            <svg
              v-if="opt.value === modelValue"
              class="h-4 w-4 text-slate-900 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        </div>

        <div v-if="$slots.footer" class="WhiteSelect_footer px-3 pb-3">
          <slot name="footer" />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

export type WhiteSelectOption<T = string> = {
  label: string
  value: T
  disabled?: boolean
}

const props = defineProps<{
  modelValue: string | number | null
  options: Array<WhiteSelectOption<string | number>>
  placeholder?: string
  disabled?: boolean
  rootClass?: string
  triggerClass?: string
  panelClass?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: string | number | null): void
  (e: 'change', v: string | number | null): void
  (e: 'open-change', open: boolean): void
}>()

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const placeholder = computed(() => props.placeholder ?? '请选择')

const selectedLabel = computed(() => {
  const found = props.options.find((o) => o.value === props.modelValue)
  return found?.label ?? ''
})

const toggle = () => {
  if (props.disabled) return
  open.value = !open.value
  emit('open-change', open.value)
}

const close = () => {
  if (!open.value) return
  open.value = false
  emit('open-change', false)
}

const select = (v: string | number) => {
  const opt = props.options.find((o) => o.value === v)
  if (opt?.disabled) return
  emit('update:modelValue', v)
  emit('change', v)
  close()
}

const optionClass = (value: string | number) => {
  const active = value === props.modelValue
  return [
    active ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  ].join(' ')
}

const onDocPointerDown = (e: PointerEvent) => {
  const el = rootRef.value
  if (!el) return
  if (!open.value) return
  if (el.contains(e.target as Node)) return
  close()
}

const onDocKeyDown = (e: KeyboardEvent) => {
  if (!open.value) return
  if (e.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDown)
  document.addEventListener('keydown', onDocKeyDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown)
  document.removeEventListener('keydown', onDocKeyDown)
})
</script>

<style scoped>
.white-select-pop-enter-active {
  transition:
    opacity 250ms cubic-bezier(0.34, 1.56, 0.64, 1),
    transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.white-select-pop-leave-active {
  transition:
    opacity 180ms cubic-bezier(0.4, 0, 1, 1),
    transform 220ms cubic-bezier(0.4, 0, 1, 1);
}
.white-select-pop-enter-from,
.white-select-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
.white-select-pop-enter-to,
.white-select-pop-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}
</style>
