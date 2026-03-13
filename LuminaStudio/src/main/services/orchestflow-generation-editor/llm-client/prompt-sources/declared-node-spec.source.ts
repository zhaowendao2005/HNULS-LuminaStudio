import {
  listOFNodeDefinitions,
  OFBlockEnum,
  type OFNodeDefinition
} from '@shared/Orchestraflow-types'
import { extractDeclaredNodeTypesFromPlanningMarkdown } from './node-selection.source'

function normalizeDeclaredTypes(sourceMarkdown: string): OFBlockEnum[] {
  const declared = extractDeclaredNodeTypesFromPlanningMarkdown(sourceMarkdown)
  const required = [OFBlockEnum.Start, OFBlockEnum.End]
  const merged = [...required, ...declared]
  return Array.from(new Set(merged))
}

function resolveDefinitions(nodeTypes: OFBlockEnum[]): OFNodeDefinition[] {
  const registry = new Map(
    listOFNodeDefinitions().map((definition) => [definition.meta.type, definition] as const)
  )
  return nodeTypes
    .map((type) => registry.get(type))
    .filter((definition): definition is OFNodeDefinition => Boolean(definition))
}

export function buildDeclaredNodeSpecsPrompt(sourceMarkdown: string): string {
  const nodeTypes = normalizeDeclaredTypes(sourceMarkdown)
  const definitions = resolveDefinitions(nodeTypes)

  return [
    '## 声明节点 Spec',
    '只允许使用以下已声明节点，以及系统保底节点 start/end。',
    ...definitions.flatMap((definition) => {
      const syntaxSpec = buildDslNodeSyntaxSpec(definition.meta.type)
      return [
        `### ${definition.meta.title}`,
        `- type: ${definition.meta.type}`,
        `- 摘要: ${definition.meta.summary}`,
        `- OFT/1 节点 section: [node.${definition.meta.type === OFBlockEnum.Start ? 'start' : '<id>'}]`,
        ...syntaxSpec,
        `- 产出输出: ${definition.authoring.contract.produced_outputs.join(', ') || '(none)'}`,
        `- 端口: ${
          definition.spec.ports
            .map((port) => `${port.id}(${port.direction}/${port.channel})`)
            .join(', ') || '(none)'
        }`,
        `- system-managed: ${definition.spec.system_managed_fields?.join(', ') || '(none)'}`,
        ...definition.authoring.contract.notes.map((note) => `- 说明: ${note}`)
      ]
    })
  ].join('\n')
}

function buildDslNodeSyntaxSpec(nodeType: OFBlockEnum): string[] {
  switch (nodeType) {
    case OFBlockEnum.Start:
      return [
        '- 必填字段: type, inputs',
        '- 写法: type = "start"',
        '- 写法: inputs = ["main_topic","config"]'
      ]
    case OFBlockEnum.LLM:
      return [
        '- 必填字段: type, model, prompt',
        '- 可选字段: struct',
        '- 写法: type = "llm"',
        '- 写法: model = "openai/gpt-4.1-mini"',
        '- 写法: prompt = """..."""',
        '- 写法: struct = "score:number weakness:string"'
      ]
    case OFBlockEnum.IfElse:
      return [
        '- 必填字段: type, when',
        '- 写法: type = "if"',
        '- 写法: when = ["@rate.score >= 8 => pass"]',
        '- Else handle 固定为 else，对应边写法使用 check.else -> next'
      ]
    case OFBlockEnum.Loop:
      return [
        '- 必填字段: type, count, vars, [subgraph.<container>].entry, [subgraph.<container>].edges',
        '- 写法: type = "loop"',
        '- 写法: count = 3',
        '- 写法: vars = ["concept_text:string=@draft","is_refined:boolean=false"]',
        '- 当前 count 仅支持常量整数，不支持变量引用'
      ]
    case OFBlockEnum.Iteration:
      return [
        '- 必填字段: type, over, result, [subgraph.<container>].entry, [subgraph.<container>].edges',
        '- 写法: type = "iter"',
        '- 写法: over = "@target_angles"',
        '- 写法: result = "@write.structured_output"'
      ]
    case OFBlockEnum.VariableAssign:
      return [
        '- 必填字段: type, let',
        '- 写法: type = "set"',
        '- 写法: let = ["is_refined:boolean=true","concept_text:string=@improve.better_text"]',
        '- set 只能写常量或单个引用，不要拼装带多个引用的对象'
      ]
    case OFBlockEnum.End:
      return [
        '- 必填字段: type, outputs',
        '- 写法: type = "end"',
        '- 写法: outputs = ["summary:string <- @summary.executive_summary"]'
      ]
    default:
      return ['- 当前节点尚未提供专用 OFT/1 语法说明。']
  }
}
