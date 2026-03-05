<template>
  <div class="of-prompt-input-wrapper relative w-full" :style="{ minHeight: height + 'px' }">
    <!-- 渲染层：显示变量标签 -->
    <div
      ref="renderDiv"
      class="of-prompt-render-layer absolute inset-0 whitespace-pre-wrap break-words text-sm leading-relaxed text-transparent pointer-events-none overflow-hidden"
      :style="{ minHeight: height + 'px' }"
      v-html="renderedHtml"
    />
    <!-- 输入层：透明 textarea -->
    <textarea
      ref="textareaRef"
      :value="modelValue"
      class="of-prompt-textarea absolute inset-0 w-full resize-none appearance-none bg-transparent text-sm leading-relaxed text-transparent caret-gray-700 outline-none placeholder:text-gray-400"
      :placeholder="placeholder"
      :style="{ minHeight: height + 'px' }"
      @input="handleInput"
      @scroll="syncScroll"
      @keydown="handleKeydown"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    height?: number
  }>(),
  {
    placeholder: '输入提示词内容...',
    height: 60
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const renderDiv = ref<HTMLDivElement | null>(null)

// 解析文本中的变量并渲染为 HTML
const renderedHtml = computed(() => {
  if (!props.modelValue) return '<br>'

  // 正则匹配 {{变量名}}
  const regex = /\{\{([^}]+)\}\}/g

  // 先转义 HTML 特殊字符
  let html = props.modelValue
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

  // 然后替换变量标签为彩色 span
  html = html.replace(regex, (_match, varName) => {
    return `<span class="of-var-tag inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-mono text-xs">{{${varName.trim()}}}</span>`
  })

  // 处理换行
  html = html.replace(/\n/g, '<br>')

  return html
})

// 同步滚动
function syncScroll() {
  if (textareaRef.value && renderDiv.value) {
    renderDiv.value.scrollTop = textareaRef.value.scrollTop
    renderDiv.value.scrollLeft = textareaRef.value.scrollLeft
  }
}

// 处理输入
function handleInput(event: Event) {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)

  // 同步滚动
  nextTick(syncScroll)
}

// 处理按键
function handleKeydown(event: KeyboardEvent) {
  // 阻止在变量标签内的某些按键行为
  // 这里可以添加更多快捷键处理
}

defineExpose({
  focus: () => textareaRef.value?.focus(),
  getCursorPosition: () => textareaRef.value?.selectionStart || 0,
  getAnchorRect: () => textareaRef.value?.getBoundingClientRect() || null
})
</script>

<style scoped>
.of-prompt-textarea {
  caret-color: #374151;
}

.of-prompt-textarea::placeholder {
  color: #9ca3af;
}

.of-var-tag {
  white-space: pre;
}
</style>
