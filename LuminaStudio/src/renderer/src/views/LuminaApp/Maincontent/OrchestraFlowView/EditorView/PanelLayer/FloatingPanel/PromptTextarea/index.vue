<template>
  <!-- eslint-disable vue/no-v-html -->
  <div class="of-prompt-input-wrapper relative w-full" :style="{ minHeight: `${height}px` }">
    <div
      ref="editorRef"
      class="of-prompt-editor min-h-full w-full whitespace-pre-wrap break-words rounded-xl px-3 py-2.5 text-sm leading-relaxed text-gray-700 outline-none"
      contenteditable="true"
      spellcheck="false"
      :data-placeholder="placeholder"
      @beforeinput="handleBeforeInput"
      @input="handleInput"
      @keydown="handleKeydown"
      @blur="syncSelection"
      v-html="renderedHtml"
    ></div>
  </div>
  <!-- eslint-enable vue/no-v-html -->
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

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

const editorRef = ref<HTMLDivElement | null>(null)
const selectionOffset = ref(0)
const isApplyingInput = ref(false)

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const renderedHtml = computed(() => {
  const source = props.modelValue || ''
  if (!source) return '<br />'

  const regex = /\{\{\s*([^}]+?)\s*\}\}/g
  let html = ''
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(source)) !== null) {
    html += escapeHtml(source.slice(lastIndex, match.index))
    html += `<span class="of-var-tag" data-variable="${escapeHtml(match[1])}">{{${escapeHtml(match[1].trim())}}}</span>`
    lastIndex = match.index + match[0].length
  }

  html += escapeHtml(source.slice(lastIndex))
  return html.replace(/\n/g, '<br />')
})

function getPlainText() {
  return editorRef.value?.innerText?.replace(/\r/g, '')?.replace(/\n$/, '') || ''
}

function createRangeFromOffset(root: Node, offset: number) {
  const range = document.createRange()
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let currentOffset = 0
  let currentNode = walker.nextNode()

  while (currentNode) {
    const length = currentNode.textContent?.length || 0
    if (currentOffset + length >= offset) {
      range.setStart(currentNode, Math.max(0, offset - currentOffset))
      range.collapse(true)
      return range
    }
    currentOffset += length
    currentNode = walker.nextNode()
  }

  range.selectNodeContents(root)
  range.collapse(false)
  return range
}

function getSelectionOffset() {
  const editor = editorRef.value
  const selection = window.getSelection()
  if (!editor || !selection || selection.rangeCount === 0) return 0

  const range = selection.getRangeAt(0)
  const preRange = range.cloneRange()
  preRange.selectNodeContents(editor)
  preRange.setEnd(range.endContainer, range.endOffset)
  return preRange.toString().length
}

function restoreSelection() {
  const editor = editorRef.value
  const selection = window.getSelection()
  if (!editor || !selection) return

  const range = createRangeFromOffset(editor, selectionOffset.value)
  selection.removeAllRanges()
  selection.addRange(range)
}

function syncSelection() {
  selectionOffset.value = getSelectionOffset()
}

function handleBeforeInput() {
  syncSelection()
}

function handleInput() {
  isApplyingInput.value = true
  syncSelection()
  emit('update:modelValue', getPlainText())
  nextTick(() => {
    restoreSelection()
    isApplyingInput.value = false
  })
}

function handleKeydown() {
  syncSelection()
}

watch(
  () => props.modelValue,
  async () => {
    if (isApplyingInput.value) return
    await nextTick()
    restoreSelection()
  }
)

defineExpose({
  focus: () => editorRef.value?.focus(),
  getCursorPosition: () => {
    syncSelection()
    return selectionOffset.value
  },
  getAnchorRect: () => editorRef.value?.getBoundingClientRect() || null
})
</script>

<style scoped>
.of-prompt-input-wrapper {
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  background: #f3f4f6;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
  transition:
    border-color 150ms ease,
    background-color 150ms ease,
    box-shadow 150ms ease;
}

.of-prompt-input-wrapper:focus-within {
  border-color: #9ca3af;
  background: #f8fafc;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    0 0 0 3px rgba(148, 163, 184, 0.12);
}

.of-prompt-editor {
  font-family: 'SFMono-Regular', 'Cascadia Code', 'JetBrains Mono', monospace;
  caret-color: #374151;
  background: transparent;
}

.of-prompt-editor:empty::before {
  content: attr(data-placeholder);
  color: #9ca3af;
}

.of-prompt-editor :deep(.of-var-tag) {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: pre;
  border-radius: 6px;
  background: rgba(99, 91, 255, 0.12);
  padding: 1px 6px;
  color: #4f46e5;
  font-size: 12px;
  line-height: 18px;
}
</style>
