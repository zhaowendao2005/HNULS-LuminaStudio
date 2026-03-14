import {
  listOFAuthoringNodeDefinitions,
  type OFAuthoringNodeDefinition,
  type OFNodeAuthoringToken
} from '@shared/Orchestraflow-types'
import { extractDeclaredNodeTypesFromPlanningMarkdown } from './node-selection.source'

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

  return [
    '## 声明节点 Spec',
    '只允许使用以下已声明节点，以及系统保底节点 start/end。',
    ...definitions.flatMap((definition) => {
      return [
        `### ${definition.llmSpec.title}`,
        `- type: ${definition.llmSpec.authoringToken}`,
        `- 摘要: ${definition.llmSpec.summary}`,
        `- OFT/1 节点 section: ${definition.llmSpec.section_template}`,
        `- 必填作者字段: ${definition.llmSpec.required_fields.join(', ') || '(none)'}`,
        `- 可选作者字段: ${definition.llmSpec.optional_fields.join(', ') || '(none)'}`,
        ...(definition.llmSpec.examples || []).map((item) =>
          item.value !== undefined
            ? `- 示例 ${item.label}: ${String(item.value)}`
            : `- 示例 ${item.label}: ${item.summary}`
        ),
        `- 产出输出: ${definition.llmSpec.output_artifacts.join(', ') || '(none)'}`,
        ...(definition.llmSpec.authoring_hints || []).map((note) => `- 提示: ${note}`),
        ...(definition.llmSpec.warnings_zh || []).map((note) => `- 注意: ${note}`),
        ...(definition.llmSpec.selector_policies || []).map((note) => `- selector: ${note}`),
        ...(definition.llmSpec.output_policies || []).map((note) => `- 输出: ${note}`),
        ...(definition.llmSpec.omit_rules || []).map((note) => `- 不要输出: ${note}`),
        ...(definition.llmSpec.notes || []).map((note) => `- 说明: ${note}`)
      ]
    })
  ].join('\n')
}
