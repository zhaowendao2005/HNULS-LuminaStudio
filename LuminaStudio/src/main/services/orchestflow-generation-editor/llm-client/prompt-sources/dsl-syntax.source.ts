import {
  OF_BLUEPRINT_SECTION_DSL_HEADER,
  OF_BLUEPRINT_SECTION_DSL_RULES,
  OF_BLUEPRINT_SECTION_DSL_SECTION_FORMS
} from '@shared/Orchestraflow-types'

export function buildDslSyntaxPrompt(): string {
  return [
    '## DSL 语法与格式',
    `- 固定头部: ${OF_BLUEPRINT_SECTION_DSL_HEADER}`,
    ...OF_BLUEPRINT_SECTION_DSL_SECTION_FORMS.map((item) => `- section: ${item}`),
    ...OF_BLUEPRINT_SECTION_DSL_RULES.map((rule) => `- 规则: ${rule}`),
    '',
    '## 最小模板',
    '[workflow]',
    'name = "demo_flow"',
    '',
    '[node.start]',
    'type = "start"',
    'inputs = ["user_query"]',
    '',
    '[node.end]',
    'type = "end"',
    'outputs = ["result:string <- @start.user_query"]',
    '',
    '[graph]',
    'edges = ["start -> end"]',
    '',
    '## 重要边界',
    '- 这里仅定义语法和格式，不负责节点字段 spec、变量语义、handle/link 语义。',
    '- 节点字段与系统底层规则必须以“声明节点 Spec”和“系统底层机制规则”为准。'
  ].join('\n')
}
