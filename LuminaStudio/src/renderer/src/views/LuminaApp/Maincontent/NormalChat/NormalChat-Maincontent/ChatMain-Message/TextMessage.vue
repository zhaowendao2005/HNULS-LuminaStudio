<template>
  <div>
    <!-- AI 消息：Markdown 渲染 -->
    <div v-if="role === 'assistant'" class="markdown-content">
      <div v-html="renderMarkdown(content)" class="markdown"></div>
      <span
        v-if="isStreaming"
        class="inline-block w-1 h-4 bg-emerald-500 animate-pulse ml-0.5 align-middle"
      ></span>
    </div>

    <!-- 用户消息：普通文本 -->
    <div
      v-else
      class="text-[14px] leading-relaxed text-slate-800 whitespace-pre-wrap bg-emerald-50 px-4 py-3 rounded-2xl inline-block"
    >
      {{ content }}
      <span
        v-if="isStreaming"
        class="inline-block w-1 h-4 bg-emerald-500 animate-pulse ml-0.5 align-middle"
      ></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import MarkdownIt from 'markdown-it'

defineProps<{
  content: string
  role: 'user' | 'assistant'
  isStreaming?: boolean
}>()

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
})

const renderMarkdown = (content: string) => {
  return markdown.render(content || '')
}
</script>

<style scoped>
.markdown-content {
  font-size: 14px;
  line-height: 1.6;
  color: #334155;
  overflow-y: visible;
}

.markdown :deep(h1),
.markdown :deep(h2),
.markdown :deep(h3),
.markdown :deep(h4),
.markdown :deep(h5),
.markdown :deep(h6) {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  font-weight: 600;
  line-height: 1.3;
  color: #1e293b;
}

.markdown :deep(h1) {
  font-size: 1.75em;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.3em;
}

.markdown :deep(h2) {
  font-size: 1.5em;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.3em;
}

.markdown :deep(h3) {
  font-size: 1.25em;
}

.markdown :deep(h4) {
  font-size: 1.1em;
}

.markdown :deep(p) {
  margin-top: 0.8em;
  margin-bottom: 0.8em;
  line-height: 1.7;
}

.markdown :deep(ul),
.markdown :deep(ol) {
  margin-top: 0.8em;
  margin-bottom: 0.8em;
  padding-left: 2em;
}

.markdown :deep(li) {
  margin-top: 0.4em;
  margin-bottom: 0.4em;
}

.markdown :deep(strong) {
  font-weight: 600;
  color: #0f172a;
}

.markdown :deep(em) {
  font-style: italic;
}

.markdown :deep(code) {
  background-color: #f1f5f9;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
  color: #dc2626;
}

.markdown :deep(pre) {
  background-color: #1e293b;
  color: #e2e8f0;
  padding: 1em;
  border-radius: 6px;
  overflow-x: auto;
  margin-top: 1em;
  margin-bottom: 1em;
}

.markdown :deep(pre code) {
  background-color: transparent;
  padding: 0;
  color: inherit;
  font-size: 0.875em;
}

.markdown :deep(blockquote) {
  border-left: 4px solid #10b981;
  padding-left: 1em;
  margin-left: 0;
  margin-top: 1em;
  margin-bottom: 1em;
  color: #64748b;
  font-style: italic;
}

.markdown :deep(a) {
  color: #10b981;
  text-decoration: none;
  transition: color 0.2s;
}

.markdown :deep(a:hover) {
  color: #059669;
  text-decoration: underline;
}

.markdown :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin-top: 1em;
  margin-bottom: 1em;
}

.markdown :deep(th),
.markdown :deep(td) {
  border: 1px solid #e2e8f0;
  padding: 0.6em 1em;
  text-align: left;
}

.markdown :deep(th) {
  background-color: #f8fafc;
  font-weight: 600;
}

.markdown :deep(hr) {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 2em 0;
}

.markdown :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin: 1em 0;
}
</style>
