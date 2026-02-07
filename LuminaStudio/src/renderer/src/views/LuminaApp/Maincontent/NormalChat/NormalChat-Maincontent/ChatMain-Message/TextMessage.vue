<template>
  <div>
    <!-- AI 消息：Markdown 渲染 -->
    <div v-if="role === 'assistant'" class="text-[15px] leading-relaxed text-slate-800">
      <div v-html="renderMarkdown(content)"></div>
      <span
        v-if="isStreaming"
        class="inline-block w-1 h-4 bg-emerald-500 animate-pulse ml-0.5 align-middle"
      ></span>
    </div>

    <!-- 用户消息：普通文本 -->
    <div
      v-else
      class="text-[15px] leading-relaxed text-slate-800 whitespace-pre-wrap bg-emerald-50 px-4 py-3 rounded-2xl inline-block"
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
