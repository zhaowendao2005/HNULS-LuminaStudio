<template>
  <!-- eslint-disable vue/no-v-html -->
  <div
    class="nc-chat-markdown-content-a9k2"
    :class="isPending ? 'is-pending' : ''"
    v-html="html"
  ></div>
  <!-- eslint-enable vue/no-v-html -->
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'

const props = defineProps<{
  content: string
  isPending?: boolean
}>()

const markdown = new MarkdownIt({
  html: false,
  linkify: false,
  breaks: true
})

const html = computed(() => markdown.render(props.content || ''))
</script>

<style scoped lang="scss">
.nc-chat-markdown-content-a9k2 {
  color: rgb(31 41 55);
  font-size: 14px;
  line-height: 1.75;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.nc-chat-markdown-content-a9k2 :deep(p) {
  margin: 0.35rem 0;
}

.nc-chat-markdown-content-a9k2 :deep(p:first-child) {
  margin-top: 0;
}

.nc-chat-markdown-content-a9k2 :deep(p:last-child) {
  margin-bottom: 0;
}

.nc-chat-markdown-content-a9k2 :deep(ul),
.nc-chat-markdown-content-a9k2 :deep(ol) {
  margin: 0.4rem 0;
  padding-left: 1.2rem;
}

.nc-chat-markdown-content-a9k2 :deep(li) {
  margin: 0.2rem 0;
}

.nc-chat-markdown-content-a9k2 :deep(blockquote) {
  margin: 0.5rem 0;
  border-left: 3px solid rgb(203 213 225);
  padding-left: 0.75rem;
  color: rgb(75 85 99);
}

.nc-chat-markdown-content-a9k2 :deep(code) {
  border-radius: 0.35rem;
  background: rgba(15, 23, 42, 0.05);
  padding: 0.1rem 0.25rem;
  font-size: 0.92em;
}

.nc-chat-markdown-content-a9k2 :deep(pre) {
  overflow-x: auto;
  margin: 0.65rem 0;
  border-radius: 0.75rem;
  background: rgb(15 23 42 / 0.96);
  padding: 0.85rem 0.95rem;
  color: rgb(226 232 240);
}

.nc-chat-markdown-content-a9k2 :deep(pre code) {
  padding: 0;
  background: transparent;
  color: inherit;
  font-size: 0.9em;
  line-height: 1.6;
}

.nc-chat-markdown-content-a9k2 :deep(a) {
  color: rgb(37 99 235);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.nc-chat-markdown-content-a9k2.is-pending {
  opacity: 0.96;
}
</style>
