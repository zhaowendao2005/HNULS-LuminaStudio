import {
  OFBlockEnum,
  OF_BLUEPRINT_REQUIRED_WORKFLOW_FIELDS,
  OF_BLUEPRINT_SECTION_DSL_HEADER,
  buildOFWorkflowAuthoringContract,
  listOFAuthoringNodeDefinitions,
  listOFMechanismDefinitions
} from '@shared/Orchestraflow-types'
import {
  CANONICAL_ARRAY_SCHEMA_TEMPLATE,
  CANONICAL_END_OUTPUT_TEMPLATE,
  CANONICAL_LET_TEMPLATE,
  CANONICAL_LOOP_VAR_TEMPLATE,
  CANONICAL_OBJECT_SCHEMA_TEMPLATE,
  CANONICAL_REF_SOURCE_TEMPLATE,
  CANONICAL_START_INPUT_TEMPLATE,
  CANONICAL_VALUE_SOURCE_TEMPLATE
} from './dsl-syntax.source'

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
    '- 以下内容就是当前唯一生效的 authoring contract，生成时只遵循这一套骨架。',
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
    '## 变量与 Schema 机制',
    `- start 输入声明固定写法：${CANONICAL_START_INPUT_TEMPLATE}`,
    `- loop vars 固定写法：${CANONICAL_LOOP_VAR_TEMPLATE}`,
    `- set let 固定写法：${CANONICAL_LET_TEMPLATE}`,
    `- end outputs 固定写法：${CANONICAL_END_OUTPUT_TEMPLATE}`,
    `- object schema 固定骨架：${CANONICAL_OBJECT_SCHEMA_TEMPLATE}`,
    `- array schema 固定骨架：${CANONICAL_ARRAY_SCHEMA_TEMPLATE}`,
    `- ref source 固定骨架：${CANONICAL_REF_SOURCE_TEMPLATE}`,
    `- value source 固定骨架：${CANONICAL_VALUE_SOURCE_TEMPLATE}`,
    '',
    '## Selector / Ref 机制',
    '- 作者态引用统一写成单个 `@ref` 字符串。',
    '- 组合 JSON 里如果要引用变量，引用值写成字符串 `"@ref"`。',
    '',
    '## 控制流 Handle 契约',
    `- 普通控制边默认写法：上游.${contract.edge_contract.default_source_handle} -> 下游.${contract.edge_contract.default_target_handle}。`,
    '- 普通节点控制边只使用 source / target。',
    ...handleRules,
    '',
    '## Container 子图约束',
    '- 作者只描述业务子图节点；内部 start 由系统维护。',
    '- [subgraph.<container>] 只允许 entry 与 edges。',
    '- 子图内禁止继续嵌套容器节点。',
    '- 不要手写 `loop-start` / `iteration-start` 作为作者态节点、边端点或引用根。',
    '',
    '## 格式红线',
    '- 不要自然语言解释。',
    '- 不要 markdown code fence。',
    '- 不要多行数组或多行对象。',
    '- 不要把普通控制边 handle 写成 input / output。',
    '',
    '## Workflow Authoring Contract',
    ...contract.global_invariants.map((item) => `- ${item.scope}: ${item.summary}`)
  ].join('\n')
}
