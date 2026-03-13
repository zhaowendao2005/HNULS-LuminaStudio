import {
  OF_BLUEPRINT_SECTION_DSL_HEADER,
  OF_BLUEPRINT_REQUIRED_WORKFLOW_FIELDS,
  OF_BLUEPRINT_TEXT_DSL_ALLOWED_WORKFLOW_FIELDS,
  buildOFWorkflowAuthoringContract,
  listOFMechanismDefinitions
} from '@shared/Orchestraflow-types'

export function buildMechanismSelectionSummaryPrompt(): string {
  const definitions = listOFMechanismDefinitions()
  return [
    '## 系统边界摘要',
    '以下规则只用于需求规划分析阶段判断方案可行性，不是字段级实现说明。',
    ...definitions.flatMap((definition) => {
      return [
        `### ${definition.title}`,
        `- 摘要: ${definition.summary}`,
        ...(definition.hard_rules || []).slice(0, 2).map((rule) => `- 规则: ${rule}`)
      ]
    })
  ].join('\n')
}

export function buildMechanismRulesPrompt(): string {
  const definitions = listOFMechanismDefinitions()
  const contract = buildOFWorkflowAuthoringContract()

  return [
    '## 系统底层机制规则',
    ...definitions.flatMap((definition) => {
      return [
        `### ${definition.title}`,
        `- 摘要: ${definition.summary}`,
        ...(definition.hard_rules || []).map((rule) => `- 规则: ${rule}`),
        ...(definition.failure_modes || []).map((item) => `- 失败模式: ${item}`)
      ]
    }),
    '',
    '## Workflow 元信息约束',
    `- 生成 DSL 时，第一行必须先写 ${OF_BLUEPRINT_SECTION_DSL_HEADER}，然后立即进入 [workflow] section。`,
    `- 允许设置的 workflow 字段仅有: ${OF_BLUEPRINT_TEXT_DSL_ALLOWED_WORKFLOW_FIELDS.join(', ')}`,
    `- 当前硬性必填字段: ${OF_BLUEPRINT_REQUIRED_WORKFLOW_FIELDS.join(', ')}`,
    '- 若缺少 workflow.name，blueprint-validation 会直接失败。',
    '- 推荐最小开头模板：',
    '- [workflow]',
    '- name = "your-workflow-name"',
    '',
    '## Workflow Authoring Contract',
    ...contract.global_invariants.map((item) => `- ${item.scope}: ${item.summary}`)
  ].join('\n')
}
