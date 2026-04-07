<template>
  <div class="overflow-hidden rounded-2xl border border-slate-200 bg-[#f7f8fa]">
    <div ref="editorHostRef" class="min-h-[120px]" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { json } from '@codemirror/lang-json'
import { yaml } from '@codemirror/lang-yaml'
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorState, RangeSetBuilder } from '@codemirror/state'
import { Decoration, EditorView, lineNumbers } from '@codemirror/view'
import { stringify as stringifyYaml } from 'yaml'
import { structuredCodeIndentGuides } from './structured-code-indent-guides'

const props = defineProps<{
  payload: unknown
  mode: 'json' | 'yaml'
  highlightKeys?: string[]
}>()

const editorHostRef = ref<HTMLDivElement | null>(null)
let editorView: EditorView | null = null

function maybeParseNestedJsonString(value: string): unknown {
  const trimmed = value.trim()
  if (!trimmed) {
    return value
  }

  const firstChar = trimmed[0]
  if (firstChar !== '{' && firstChar !== '[') {
    return value
  }

  try {
    return normalizeYamlPayload(JSON.parse(trimmed))
  } catch {
    return value
  }
}

function normalizeYamlPayload(payload: unknown): unknown {
  if (typeof payload === 'string') {
    return maybeParseNestedJsonString(payload)
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => normalizeYamlPayload(item))
  }

  if (payload && typeof payload === 'object') {
    return Object.fromEntries(
      Object.entries(payload).map(([key, value]) => [key, normalizeYamlPayload(value)])
    )
  }

  return payload
}

const documentText = computed(() => {
  if (typeof props.payload === 'string') {
    return props.payload
  }
  if (props.payload === null) {
    return 'null'
  }
  if (props.mode === 'yaml') {
    return stringifyYaml(normalizeYamlPayload(props.payload), {
      indent: 2,
      lineWidth: 0,
      blockQuote: 'literal'
    }).trimEnd()
  }
  return JSON.stringify(props.payload, null, 2)
})

const normalizedHighlightKeys = computed(() => new Set((props.highlightKeys ?? []).filter(Boolean)))

function buildHighlightDecorations(doc: EditorState['doc']) {
  if (normalizedHighlightKeys.value.size === 0) {
    return Decoration.none
  }

  const builder = new RangeSetBuilder<Decoration>()
  for (let lineNo = 1; lineNo <= doc.lines; lineNo += 1) {
    const line = doc.line(lineNo)
    const trimmed = line.text.trimStart()
    const isHighlighted = Array.from(normalizedHighlightKeys.value).some((key) => {
      return trimmed.startsWith(`"${key}"`) || trimmed.startsWith(`${key}:`)
    })

    if (isHighlighted) {
      builder.add(
        line.from,
        line.from,
        Decoration.line({ attributes: { class: 'cm-autofilled-line' } })
      )
    }
  }

  return builder.finish()
}

function createEditorState(): EditorState {
  return EditorState.create({
    doc: documentText.value,
    extensions: [
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
      EditorView.lineWrapping,
      lineNumbers(),
      props.mode === 'yaml' ? yaml() : json(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      structuredCodeIndentGuides,
      EditorView.decorations.compute([], (state) => buildHighlightDecorations(state.doc)),
      EditorView.theme(
        {
          '&': {
            backgroundColor: '#f7f8fa',
            color: '#1e293b',
            fontSize: '12px',
            lineHeight: '1.5rem'
          },
          '&.cm-focused': {
            outline: 'none'
          },
          '.cm-scroller': {
            overflow: 'auto',
            fontFamily: 'Consolas, "SFMono-Regular", "Liberation Mono", Menlo, Courier, monospace'
          },
          '.cm-content': {
            padding: '0',
            minHeight: '120px'
          },
          '.cm-line': {
            padding: '0 16px',
            minHeight: '24px'
          },
          '.cm-line.cm-autofilled-line': {
            backgroundColor: 'rgba(250, 204, 21, 0.16)'
          },
          '.cm-gutters': {
            backgroundColor: '#f3f4f6',
            color: '#94a3b8',
            borderRight: '1px solid rgba(203, 213, 225, 0.8)'
          },
          '.cm-gutter': {
            minWidth: '0'
          },
          '.cm-lineNumbers .cm-gutterElement': {
            minWidth: '36px',
            padding: '0 12px 0 8px',
            textAlign: 'right'
          },
          '.cm-activeLine, .cm-activeLineGutter': {
            backgroundColor: 'transparent'
          },
          '.cm-selectionBackground, .cm-content ::selection': {
            backgroundColor: 'rgba(96, 165, 250, 0.18)'
          },
          '.cm-cursor, .cm-dropCursor': {
            display: 'none'
          }
        },
        { dark: false }
      )
    ]
  })
}

function syncEditorView(): void {
  if (!editorHostRef.value) {
    return
  }

  if (!editorView) {
    editorView = new EditorView({
      state: createEditorState(),
      parent: editorHostRef.value
    })
    return
  }

  editorView.setState(createEditorState())
}

onMounted(() => {
  syncEditorView()
})

watch(
  () => [props.mode, documentText.value, (props.highlightKeys ?? []).join('|')],
  () => {
    syncEditorView()
  }
)

onBeforeUnmount(() => {
  editorView?.destroy()
  editorView = null
})
</script>
