<template>
  <!-- eslint-disable vue/no-v-html -->
  <div class="of-generate-planning-md mt-2 text-[12px] leading-5 text-gray-700" v-html="html"></div>
  <!-- eslint-enable vue/no-v-html -->
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'

const props = defineProps<{
  content: string
}>()

const markdown = new MarkdownIt({
  html: false,
  linkify: false,
  breaks: true
})

const html = computed(() => markdown.render(props.content || ''))
</script>

<style scoped>
.of-generate-planning-md :deep(p) {
  margin: 0.35rem 0;
}

.of-generate-planning-md :deep(ul),
.of-generate-planning-md :deep(ol) {
  margin: 0.4rem 0;
  padding-left: 1.15rem;
}

.of-generate-planning-md :deep(li) {
  margin: 0.2rem 0;
}

.of-generate-planning-md :deep(code) {
  border-radius: 0.25rem;
  background: rgba(15, 23, 42, 0.05);
  padding: 0.1rem 0.25rem;
}
</style>
