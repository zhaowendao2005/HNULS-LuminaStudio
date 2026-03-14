import {
  listOFAuthoringNodeDefinitions,
  type OFAuthoringNodeDefinition,
  type OFNodeAuthoringToken
} from '@shared/Orchestraflow-types'
import { extractDeclaredNodeTypesFromPlanningMarkdown } from './node-selection.source'

const LEGACY_PROMPT_PATTERNS = [
  /\[input\./i,
  /<-\s*@/,
  /\bname:type=value\b/i,
  /\bitem_schema\b/i,
  /\bvalue_selector\b/i,
  /\bvalue_ref\b/i
]

function normalizeDeclaredTypes(sourceMarkdown: string): OFNodeAuthoringToken[] {
  const declared = extractDeclaredNodeTypesFromPlanningMarkdown(sourceMarkdown)
  const required: OFNodeAuthoringToken[] = ['start', 'end']
  const merged = [...required, ...declared]
  return Array.from(new Set(merged))
}

function resolveDefinitions(nodeTypes: OFNodeAuthoringToken[]): OFAuthoringNodeDefinition[] {
  const registry = new Map(
    listOFAuthoringNodeDefinitions().map(
      (definition) => [definition.llmSpec.authoringToken, definition] as const
    )
  )
  return nodeTypes
    .map((type) => registry.get(type))
    .filter((definition): definition is OFAuthoringNodeDefinition => Boolean(definition))
}

export function buildDeclaredNodeSpecsPrompt(sourceMarkdown: string): string {
  const nodeTypes = normalizeDeclaredTypes(sourceMarkdown)
  const definitions = resolveDefinitions(nodeTypes)

  const lines = [
    '## 声明节点 Spec',
    '只允许使用以下已声明节点，以及系统保底节点 start/end。',
    '以下字段清单就是当前唯一生效的作者态字段，不再补充旧别名或历史写法。',
    ...definitions.flatMap((definition) => {
      const example = selectSafeExample(definition)
      return [
        `### ${definition.llmSpec.title}`,
        `- type: ${definition.llmSpec.authoringToken}`,
        `- 摘要: ${definition.llmSpec.summary}`,
        `- OFT/1 节点 section: ${definition.llmSpec.section_template}`,
        `- 必填作者字段: ${definition.llmSpec.required_fields.join(', ') || '(none)'}`,
        `- 可选作者字段: ${definition.llmSpec.optional_fields.join(', ') || '(none)'}`,
        example ? `- 合法示例: ${example}` : null,
        `- 产出输出: ${definition.llmSpec.output_artifacts.join(', ') || '(none)'}`
      ]
    })
  ].filter((line): line is string => Boolean(line))

  return filterLegacyPromptLines(lines).join('\n')
}

function selectSafeExample(definition: OFAuthoringNodeDefinition): string | null {
  const example = (definition.llmSpec.examples || []).find((item) => {
    const value = item.value !== undefined ? String(item.value) : item.summary
    return Boolean(value) && !containsLegacyPromptSyntax(value)
  })

  if (!example) {
    return null
  }

  const rawValue = example.value !== undefined ? String(example.value) : example.summary
  return rawValue.replace(/\s+/g, ' ').trim()
}

function filterLegacyPromptLines(lines: string[]): string[] {
  return lines.filter((line) => !containsLegacyPromptSyntax(line))
}

function containsLegacyPromptSyntax(text: string): boolean {
  return LEGACY_PROMPT_PATTERNS.some((pattern) => pattern.test(text))
}
