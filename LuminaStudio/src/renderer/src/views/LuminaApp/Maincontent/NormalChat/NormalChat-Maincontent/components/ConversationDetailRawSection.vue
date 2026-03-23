<template>
  <section
    ref="sectionRef"
    class="nc-conversation-detail-raw-section-a9k2 rounded-2xl border border-gray-200 bg-white"
  >
    <div class="border-b border-gray-100 px-4 py-3">
      <h3 class="text-[14px] font-semibold text-gray-900">{{ title }}</h3>
      <p v-if="description" class="mt-1 text-[12px] leading-5 text-gray-500">
        {{ description }}
      </p>
    </div>

    <div class="p-4">
      <div
        v-if="!isReady"
        class="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-[13px] text-gray-400"
      >
        滚动到这里后再加载，避免一次性渲染过大的 JSON。
      </div>
      <pre
        v-else
        class="max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-gray-950 px-4 py-3 text-[12px] leading-6 text-gray-100"
        >{{ formattedContent }}</pre
      >
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{
  title: string
  description?: string
  value: unknown
}>()

const sectionRef = ref<HTMLElement | null>(null)
const isReady = ref(false)
let observer: IntersectionObserver | null = null

function stringifyValue(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const formattedContent = computed(() => {
  if (!isReady.value) {
    return ''
  }

  return stringifyValue(props.value)
})

onMounted(() => {
  if (!sectionRef.value || typeof IntersectionObserver === 'undefined') {
    isReady.value = true
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        isReady.value = true
        observer?.disconnect()
        observer = null
      }
    },
    {
      rootMargin: '160px 0px'
    }
  )

  observer.observe(sectionRef.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>
