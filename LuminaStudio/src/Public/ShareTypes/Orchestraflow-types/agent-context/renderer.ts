import type { OFAgentContextPack } from './contracts'

function renderMechanisms(pack: OFAgentContextPack): string {
  const mechanisms = (pack.payload.mechanisms as Array<Record<string, unknown>>) || []
  return [
    '## Mechanisms',
    ...mechanisms.flatMap((mechanism) => {
      const hardRules = ((mechanism.hard_rules as string[]) || []).map((rule) => `- ${rule}`)
      const failureModes = ((mechanism.failure_modes as string[]) || []).map(
        (rule) => `- 失败模式：${rule}`
      )
      return [
        `### ${String(mechanism.title || mechanism.id)}`,
        String(mechanism.summary || ''),
        ...hardRules,
        ...failureModes
      ]
    })
  ].join('\n')
}

function renderNodes(pack: OFAgentContextPack): string {
  const nodes = (pack.payload.nodes as Array<Record<string, unknown>>) || []
  return [
    '## Nodes',
    ...nodes.flatMap((node) => {
      const agent = (node.agent as Record<string, unknown> | null) || {}
      const boundaries = ((agent.boundaries_zh as string[]) || []).map((item) => `- 边界：${item}`)
      const composition = ((agent.composition_hints as string[]) || []).map(
        (item) => `- 组合提示：${item}`
      )
      return [
        `### ${String(node.title || node.type)}`,
        `- 类型：${String(node.type)}`,
        `- 摘要：${String(node.summary || '')}`,
        `- 能力：${String(agent.capability_summary || '未补充')}`,
        ...boundaries,
        ...composition
      ]
    })
  ].join('\n')
}

function renderRequirementDocument(pack: OFAgentContextPack): string {
  const document = (pack.payload.requirement_document as Record<string, unknown>) || {}
  const sections: Array<[string, string[]]> = [
    ['目标', (document.goals as string[]) || []],
    ['成功标准', (document.success_criteria as string[]) || []],
    ['约束', (document.constraints as string[]) || []],
    ['禁止项', (document.prohibitions as string[]) || []],
    ['人类确认项', (document.human_confirmation_questions as string[]) || []],
    ['输入需求', (document.input_requirements as string[]) || []],
    ['输出需求', (document.output_requirements as string[]) || []],
    ['对蓝图 agent 的硬要求', (document.blueprint_requirements as string[]) || []]
  ]
  return [
    '## Requirement Document',
    ...sections.flatMap(([title, items]) => [title, ...items.map((item) => `- ${item}`)])
  ].join('\n')
}

function renderBlueprintAuthoring(_pack: OFAgentContextPack): string {
  return [
    '## Blueprint Authoring',
    '- 正式作者态：`OFBlueprintWorkflow`。',
    '- 使用 `validateOFBlueprint()` 做独立 DSL 校验。',
    '- 使用 `compileOFBlueprintToRunnable()` 生成执行态。',
    '- Blueprint / Runnable schema 资产放在共享层，供 compiler、validator、agent pack 共用。'
  ].join('\n')
}

function renderEditOperations(): string {
  return [
    '## Edit Operations',
    '- `add-node` / `remove-node` / `patch-node`',
    '- `add-edge` / `remove-edge` / `patch-edge`',
    '- `update-selector` / `rename-node` / `rename-variable`',
    '- `enter-subgraph` / `exit-subgraph` 作为编辑导航信号',
    '- 使用 `applyOFBlueprintEditOperation()` / `applyOFBlueprintEditOperations()` 执行纯函数修改'
  ].join('\n')
}

function renderPlanningEditContext(pack: OFAgentContextPack): string {
  const planningFramework =
    (pack.payload.planning_framework as Array<Record<string, unknown>>) || []
  const currentDocument = String(pack.payload.planning_document || '')
  const sourceDocument = String(pack.payload.source_planning_document || '')

  return [
    '## Planning Framework',
    '- 唯一允许的根标题：# 需求分析 / # 设计交接',
    '- 只能修改 section 正文，不能改标题、层级、顺序',
    '- section-key -> 标题',
    ...planningFramework.map((item) => {
      return `- ${String(item.key)} => ${String(item.rootTitle)} / ${String(item.title)}`
    }),
    '',
    '## Current Planning Document',
    currentDocument || '(empty)',
    '',
    '## Source Planning Document',
    sourceDocument || '(empty)'
  ].join('\n')
}

export function renderOFAgentContextPack(pack: OFAgentContextPack, sectionIds?: string[]): string {
  const selectedSections = pack.sections.filter((section) =>
    sectionIds?.length ? sectionIds.includes(section.id) : true
  )

  return selectedSections
    .map((section) => {
      switch (section.id) {
        case 'manifest':
          return `# ${pack.manifest.title}\n- kind: ${pack.manifest.kind}\n- generated_at: ${pack.manifest.generated_at}`
        case 'mechanisms':
          return renderMechanisms(pack)
        case 'nodes':
          return renderNodes(pack)
        case 'requirement-document':
          return renderRequirementDocument(pack)
        case 'blueprint-authoring':
          return renderBlueprintAuthoring(pack)
        case 'edit-operations':
          return renderEditOperations()
        case 'planning-framework':
        case 'planning-document':
          return renderPlanningEditContext(pack)
        default:
          return `## ${section.title}\n${section.summary}`
      }
    })
    .join('\n\n')
}
