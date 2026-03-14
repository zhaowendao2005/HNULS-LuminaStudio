import {
  OFBlockEnum,
  OF_BLUEPRINT_REQUIRED_WORKFLOW_FIELDS,
  OF_BLUEPRINT_SECTION_DSL_HEADER,
  buildOFWorkflowAuthoringContract,
  listOFAuthoringNodeDefinitions,
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
  const workflowKeys = contract.global_fields
    .filter((item) => item.path.startsWith('workflow.'))
    .map((item) => item.path.replace(/^workflow\./, ''))
  const handleRules = listOFAuthoringNodeDefinitions().map((definition) => {
    if (definition.runtime.type === OFBlockEnum.IfElse) {
      return '- if: 控制流入边 handle = target；控制流出边 handle 必须使用 case.handleId 或 elseCase.handleId。'
    }

    const inputHandles = definition.runtime.ports
      .filter((port) => port.channel === 'control' && port.direction === 'input')
      .map((port) => port.id)
    const outputHandles = definition.runtime.ports
      .filter((port) => port.channel === 'control' && port.direction === 'output')
      .map((port) => port.id)

    return `- ${definition.llmSpec.authoringToken}: 控制流入边 handle = ${inputHandles.join(', ') || '(none)'}；控制流出边 handle = ${outputHandles.join(', ') || '(none)'}。`
  })

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
    `- [workflow] section 允许设置的键仅有: ${workflowKeys.join(', ')}`,
    `- 当前硬性必填字段: ${OF_BLUEPRINT_REQUIRED_WORKFLOW_FIELDS.join(', ')}`,
    '- 若缺少 workflow.name，blueprint-validation 会直接失败。',
    '- 推荐最小开头模板：',
    '- [workflow]',
    '- name = "your-workflow-name"',
    '',
    '## LLM 输出格式红线',
    '- 不要输出多行数组项：禁止写 `outputs = [` 然后下一行再写数组元素。',
    '- 不要输出多行对象项：禁止把 `{"a": 1, "b": 2}` 拆成多行 JSON 键值。',
    '- 正确写法是：整条 `key = ...` 保持单行，右侧直接放单行合法 JSON。',
    '- 错误写法示例：`outputs = [` / `  "x:string <- @ref"` / `]`。',
    '- 正确写法示例：`outputs = ["x:string <- @ref", "y:object <- {\\"ok\\": true}"]`。',
    '- 如果对象里要引用变量，写成 `{"field": "@node.output"}`，不要拆成多行。',
    '',
    '## 控制流 Handle 契约',
    `- 普通控制边默认写法：上游.${contract.edge_contract.default_source_handle} -> 下游.${contract.edge_contract.default_target_handle}。`,
    '- 普通节点禁止把控制流 handle 写成 input/output 这类泛化命名。',
    ...handleRules,
    '',
    '## Workflow Authoring Contract',
    ...contract.global_invariants.map((item) => `- ${item.scope}: ${item.summary}`)
  ].join('\n')
}
