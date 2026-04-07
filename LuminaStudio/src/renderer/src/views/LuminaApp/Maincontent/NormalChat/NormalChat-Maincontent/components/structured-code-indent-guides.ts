import { RangeSetBuilder } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate
} from '@codemirror/view'

const INDENT_UNIT_SPACES = 2
const GUIDE_OFFSET_CHARS = 1
const GUIDE_COLOR = 'rgba(148, 163, 184, 0.45)'

function buildIndentGuideStyle(indentSpaces: number, indentLevel: number): string {
  const gradients = Array.from(
    { length: indentLevel },
    () => `linear-gradient(${GUIDE_COLOR}, ${GUIDE_COLOR})`
  ).join(', ')
  const positions = Array.from(
    { length: indentLevel },
    (_, index) => `calc(${index * INDENT_UNIT_SPACES + GUIDE_OFFSET_CHARS}ch + 1rem) 0`
  ).join(', ')
  const sizes = Array.from({ length: indentLevel }, () => '1px 100%').join(', ')

  const styleParts = [
    `padding-left: calc(16px + ${indentSpaces}ch)`,
    `text-indent: -${indentSpaces}ch`
  ]

  if (indentLevel > 0) {
    styleParts.push(
      `background-image: ${gradients}`,
      `background-position: ${positions}`,
      'background-repeat: no-repeat',
      `background-size: ${sizes}`
    )
  }

  return styleParts.join('; ')
}

function buildIndentGuideDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()

  for (const { from, to } of view.visibleRanges) {
    let line = view.state.doc.lineAt(from)

    while (line.from <= to) {
      if (line.text.trim().length > 0) {
        const indentSpaces = line.text.match(/^ */)?.[0].length ?? 0
        const indentLevel = Math.floor(indentSpaces / INDENT_UNIT_SPACES)

        builder.add(
          line.from,
          line.from,
          Decoration.line({
            attributes: {
              style: buildIndentGuideStyle(indentSpaces, indentLevel)
            }
          })
        )
      }

      if (line.to >= to) {
        break
      }
      line = view.state.doc.lineAt(line.to + 1)
    }
  }

  return builder.finish()
}

export const structuredCodeIndentGuides = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildIndentGuideDecorations(view)
    }

    update(update: ViewUpdate): void {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildIndentGuideDecorations(update.view)
      }
    }
  },
  {
    decorations: (value) => value.decorations
  }
)
