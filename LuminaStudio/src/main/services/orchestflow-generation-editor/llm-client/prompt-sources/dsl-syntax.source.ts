import {
  OF_BLUEPRINT_SECTION_DSL_HEADER,
  OF_BLUEPRINT_SECTION_DSL_SECTION_FORMS
} from '@shared/Orchestraflow-types'

const CANONICAL_DSL_RULES = [
  '所有结构用 section 表达，不使用缩进表达层级。',
  '多行 prompt 使用三引号字符串 `""" ... """`。',
  '数组必须写成单行 JSON 数组。',
  '边必须显式写成 `node.handle -> node.handle`。',
  '变量声明统一写成单行 JSON 对象数组。',
  '变量来源统一写成 `{"mode":"ref","ref":"@path"}` 或 `{"mode":"value","value":...}`。',
  '组合 object / array 中如需引用变量，必须把引用写成 JSON 字符串 `"@ref"`。'
] as const

export const CANONICAL_OBJECT_SCHEMA_TEMPLATE =
  '{"type":"object","properties":{"mode":{"type":"string"}},"required":["mode"],"additionalProperties":false,"default":{"mode":"batch"}}'
export const CANONICAL_ARRAY_SCHEMA_TEMPLATE =
  '{"type":"array","items":{"type":"string"},"default":[]}'
export const CANONICAL_REF_SOURCE_TEMPLATE =
  '{"mode":"ref","ref":"@writer.structured_output.answer"}'
export const CANONICAL_VALUE_SOURCE_TEMPLATE = '{"mode":"value","value":{"mode":"strict"}}'
export const CANONICAL_START_INPUT_TEMPLATE =
  'inputs = [{"variable":"user_query","schema":{"type":"string","default":"hello"}}]'
export const CANONICAL_LOOP_VAR_TEMPLATE =
  'vars = [{"variable":"draft","schema":{"type":"string"},"source":{"mode":"ref","ref":"@planner.structured_output.outline"}}]'
export const CANONICAL_LET_TEMPLATE =
  'let = [{"variable":"audit_config","schema":{"type":"object","properties":{"mode":{"type":"string"}},"required":["mode"],"additionalProperties":false},"source":{"mode":"value","value":{"mode":"strict"}}}]'
export const CANONICAL_END_OUTPUT_TEMPLATE =
  'outputs = [{"variable":"final_answer","schema":{"type":"string"},"source":{"mode":"ref","ref":"@writer.structured_output.answer"}}]'

export function buildDslSyntaxPrompt(): string {
  return [
    '## DSL 语法与格式',
    `- 固定头部: ${OF_BLUEPRINT_SECTION_DSL_HEADER}`,
    ...OF_BLUEPRINT_SECTION_DSL_SECTION_FORMS.map((item) => `- section: ${item}`),
    ...CANONICAL_DSL_RULES.map((rule) => `- 规则: ${rule}`),
    '',
    '## 唯一合法变量骨架',
    `- start.inputs: ${CANONICAL_START_INPUT_TEMPLATE}`,
    `- loop.vars: ${CANONICAL_LOOP_VAR_TEMPLATE}`,
    `- set.let: ${CANONICAL_LET_TEMPLATE}`,
    `- end.outputs: ${CANONICAL_END_OUTPUT_TEMPLATE}`,
    '',
    '## 唯一合法 schema 骨架',
    `- object schema: ${CANONICAL_OBJECT_SCHEMA_TEMPLATE}`,
    `- array schema: ${CANONICAL_ARRAY_SCHEMA_TEMPLATE}`,
    '',
    '## 唯一合法 source 骨架',
    `- ref source: ${CANONICAL_REF_SOURCE_TEMPLATE}`,
    `- value source: ${CANONICAL_VALUE_SOURCE_TEMPLATE}`,
    '',
    '## 单一最小模板',
    OF_BLUEPRINT_SECTION_DSL_HEADER,
    '[workflow]',
    'name = "demo_flow"',
    '',
    '[node.start]',
    'type = "start"',
    CANONICAL_START_INPUT_TEMPLATE,
    '',
    '[node.end]',
    'type = "end"',
    CANONICAL_END_OUTPUT_TEMPLATE,
    '',
    '[graph]',
    'edges = ["start.source -> end.target"]',
    '',
    '## 格式红线',
    '- 不要自然语言解释。',
    '- 不要 markdown code fence。',
    '- 不要多行数组或多行对象。',
    '- 普通控制边只使用 source / target。',
    '',
    '## 重要边界',
    '- 这里仅定义语法和格式，不负责节点字段 spec、变量语义、handle/link 语义。',
    '- 节点字段与系统底层规则必须以“声明节点 Spec”和“系统底层机制规则”为准。'
  ].join('\n')
}
