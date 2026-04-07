<template>
  <div class="space-y-4">
    <template v-for="segment in segments" :key="segment.id">
      <ChatMarkdownContent v-if="segment.type === 'markdown'" :content="segment.content" />
      <StructuredCodeViewer v-else :payload="segment.payload" mode="json" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ChatMarkdownContent from './ChatMarkdownContent.vue'
import StructuredCodeViewer from './StructuredCodeViewer.vue'

const props = defineProps<{
  content: string
}>()

type MarkdownJsonSegment =
  | {
      id: string
      type: 'markdown'
      content: string
    }
  | {
      id: string
      type: 'json'
      payload: unknown
    }

const JSON_FENCE_PATTERN = /```json\s*\n([\s\S]*?)```/giu

function flushMarkdownSegment(segments: MarkdownJsonSegment[], content: string, id: string): void {
  const trimmed = content.trim()
  if (!trimmed) {
    return
  }

  segments.push({
    id,
    type: 'markdown',
    content: trimmed
  })
}

function tryParseStandaloneJsonBlock(source: string, startIndex: number) {
  const openingChar = source[startIndex]
  if (openingChar !== '{' && openingChar !== '[') {
    return null
  }

  const stack = [openingChar]
  let inString = false
  let isEscaped = false

  for (let index = startIndex + 1; index < source.length; index += 1) {
    const char = source[index]

    if (inString) {
      if (isEscaped) {
        isEscaped = false
        continue
      }
      if (char === '\\') {
        isEscaped = true
        continue
      }
      if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === '{' || char === '[') {
      stack.push(char)
      continue
    }

    if (char === '}' || char === ']') {
      const expected = char === '}' ? '{' : '['
      if (stack.at(-1) !== expected) {
        return null
      }
      stack.pop()
      if (stack.length === 0) {
        const rawBlock = source.slice(startIndex, index + 1)
        try {
          return {
            endIndex: index + 1,
            payload: JSON.parse(rawBlock)
          }
        } catch {
          return null
        }
      }
    }
  }

  return null
}

function splitMarkdownAndJson(source: string): MarkdownJsonSegment[] {
  const segments: MarkdownJsonSegment[] = []
  let cursor = 0
  let jsonIndex = 0
  let markdownStart = 0

  while (cursor < source.length) {
    const lineStart = cursor === 0 ? 0 : cursor + 1
    const nextNewline = source.indexOf('\n', lineStart)
    const lineEnd = nextNewline === -1 ? source.length : nextNewline
    const line = source.slice(lineStart, lineEnd)
    const trimmedLine = line.trimStart()
    const leadingSpaces = line.length - trimmedLine.length
    const isStandaloneJsonStart = trimmedLine.startsWith('{') || trimmedLine.startsWith('[')

    if (isStandaloneJsonStart) {
      const jsonStart = lineStart + leadingSpaces
      const parsed = tryParseStandaloneJsonBlock(source, jsonStart)
      if (parsed) {
        flushMarkdownSegment(
          segments,
          source.slice(markdownStart, lineStart),
          `md-${jsonIndex}-${markdownStart}`
        )
        segments.push({
          id: `json-${jsonIndex}`,
          type: 'json',
          payload: parsed.payload
        })
        jsonIndex += 1
        cursor = parsed.endIndex
        markdownStart = parsed.endIndex
        continue
      }
    }

    if (nextNewline === -1) {
      break
    }
    cursor = nextNewline
  }

  flushMarkdownSegment(segments, source.slice(markdownStart), `md-tail-${markdownStart}`)

  if (segments.length === 0) {
    return [
      {
        id: 'md-empty',
        type: 'markdown',
        content: source
      }
    ]
  }

  return segments
}

function splitFencedJson(source: string): MarkdownJsonSegment[] {
  const result: MarkdownJsonSegment[] = []
  let lastIndex = 0
  let fenceIndex = 0

  for (const match of source.matchAll(JSON_FENCE_PATTERN)) {
    const fullMatch = match[0]
    const jsonText = match[1] ?? ''
    const matchIndex = match.index ?? 0

    if (matchIndex > lastIndex) {
      const markdownChunk = source.slice(lastIndex, matchIndex)
      result.push(...splitMarkdownAndJson(markdownChunk))
    }

    try {
      result.push({
        id: `json-fence-${fenceIndex}`,
        type: 'json',
        payload: JSON.parse(jsonText)
      })
    } catch {
      result.push({
        id: `md-fallback-${fenceIndex}`,
        type: 'markdown',
        content: fullMatch.trim()
      })
    }

    lastIndex = matchIndex + fullMatch.length
    fenceIndex += 1
  }

  if (lastIndex < source.length) {
    result.push(...splitMarkdownAndJson(source.slice(lastIndex)))
  }

  return result
}

const segments = computed<MarkdownJsonSegment[]>(() => {
  const source = props.content || ''
  const result = splitFencedJson(source)

  if (result.length === 0) {
    return [
      {
        id: 'md-empty',
        type: 'markdown',
        content: source
      }
    ]
  }

  return result
})
</script>
