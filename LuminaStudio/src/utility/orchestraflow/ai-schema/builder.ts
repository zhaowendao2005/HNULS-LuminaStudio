/**
 * Runnable workflow bundle exporter.
 *
 * Code is the contract:
 * - structural schema comes from shared-type codegen output
 * - behavioral constraints come from runtime registry contracts
 * - this builder only assembles compact AI-facing materials
 */
import type {
  OFAuthoringDefaultRecommendation,
  OFAISchemaBundle,
  OFAIDslWorkflow,
  OFIterationNodeData,
  OFNode,
  OFRunnableEdge,
  OFRunnableRootNode,
  OFRunnableWorkflow,
  OFWorkflowAuthoringContract
} from '@shared/Orchestraflow-types'
import {
  getOFEdgeSourcePortId,
  getOFEdgeTargetPortId,
  listOFNodeDefinitions,
  OFBlockEnum,
  OFVarType
} from '@shared/Orchestraflow-types'
import { compileAIDslToWorkflow } from './compiler'
import { GENERATED_RUNNABLE_WORKFLOW_SCHEMA } from './generated-runnable-schema'
import {
  listOFAISchemaNodeSummaries,
  getOFWorkflowAuthoringContract,
  getOFWorkflowAuthoringDefaults
} from './registry'
import { assertRunnableWorkflow } from './validator'

export function buildOrchestraflowAISchemaBundle(): OFAISchemaBundle {
  const generatedAt = new Date().toISOString()
  const nodes = listOFAISchemaNodeSummaries()
  const authoringContract = getOFWorkflowAuthoringContract()
  const authoringDefaults = getOFWorkflowAuthoringDefaults()
  const example = buildCompactRunnableExampleWorkflow()
  const promptMarkdown = buildPromptMarkdown(authoringContract, authoringDefaults)
  const annotatedWorkflowJsonc = buildAnnotatedWorkflowJsonc(example)
  const bundledMarkdown = [
    '# OrchestraFlow Runnable Workflow Contract',
    '',
    promptMarkdown,
    '',
    '## Annotated JSONC Template',
    '```jsonc',
    annotatedWorkflowJsonc,
    '```',
    '',
    '## Compact Runnable Example',
    '```json',
    JSON.stringify(example, null, 2),
    '```',
    '',
    '## Schema Access',
    '- Use `bundle.schema` for the full generated schema; the main prompt intentionally stays compact.',
    '- Use `bundle.authoring_defaults` for recommendation metadata about runnable start-input defaults.'
  ].join('\n')

  return {
    version: '1.0',
    format: 'orchestraflow-runnable-workflow',
    generated_at: generatedAt,
    nodes,
    authoring_contract: authoringContract,
    authoring_defaults: authoringDefaults,
    schema: cloneGeneratedSchema(),
    example,
    annotated_workflow_jsonc: annotatedWorkflowJsonc,
    prompt_markdown: promptMarkdown,
    bundled_markdown: bundledMarkdown
  }
}

function cloneGeneratedSchema(): Record<string, any> {
  return JSON.parse(JSON.stringify(GENERATED_RUNNABLE_WORKFLOW_SCHEMA))
}

function buildPromptMarkdown(
  contract: OFWorkflowAuthoringContract,
  authoringDefaults: OFAuthoringDefaultRecommendation[]
): string {
  const definitionMap = new Map(listOFNodeDefinitions().map((item) => [item.meta.type, item]))
  const startDefaultRecommendations = authoringDefaults.filter((item) =>
    item.path.startsWith('graph.nodes[start].data.input.variables')
  )

  return [
    '## 目标',
    '- 输出严格的 `OFRunnableWorkflow` JSON，不输出宽松编辑态结构。',
    '- 主体遵循 `authoring_contract`，完整结构参考 `schema` 字段。',
    '',
    '## 全局规则',
    ...renderWorkflowRuleLines(contract),
    '',
    '## 输入默认值建议',
    '- `graph.nodes[start].data.input.variables[*].default` 用于运行面板预填，不是编译器自动回填。',
    '- `string` / `number` / `boolean` 可以直接写变量级 `default`。',
    '- `object` 必须声明 `schema`，字段默认值应写在 object schema 内部。',
    '- `array` 直接写变量级 JSON 数组 `default`，系统不再支持数组 schema。',
    ...startDefaultRecommendations.map(
      (item) =>
        `- \`${item.path}\` (${item.kind})：${item.summary}${
          item.omit_when ? `；省略条件：${item.omit_when}` : ''
        }；示例值：\`${JSON.stringify(item.value)}\``
    ),
    '',
    '## 节点规则',
    ...contract.nodes
      .filter((item) => item.ai_exposed)
      .flatMap((item) => renderNodeRuleLines(item, definitionMap.get(item.type))),
    '',
    '## 内部节点',
    ...contract.nodes
      .filter((item) => item.internal)
      .flatMap((item) => renderNodeRuleLines(item, definitionMap.get(item.type))),
    '',
    '## 输出策略',
    '- `prompt_markdown` 只提供高密度 contract 摘要。',
    '- `annotated_workflow_jsonc` 提供最小注释模板。',
    '- `schema` 提供完整结构参考。'
  ].join('\n')
}

function buildCompactRunnableExampleWorkflow(): OFRunnableWorkflow {
  const workflow = assertRunnableWorkflow(compileAIDslToWorkflow(exampleDsl()))
  const rootNodeMap = new Map<string, OFNode>(workflow.graph.nodes.map((node) => [node.id, node]))

  workflow.graph.edges = workflow.graph.edges.map((edge) =>
    normalizeEdge(edge, rootNodeMap, {
      defaultSourceHandle:
        rootNodeMap.get(edge.source)?.data.type === 'ifelse' ? undefined : 'source',
      defaultTargetHandle: 'target'
    })
  ) as OFRunnableEdge[]

  workflow.graph.nodes = workflow.graph.nodes.map((node) => {
    if (node.data.type !== 'iteration' && node.data.type !== 'loop') {
      return node
    }

    const patchedNode = patchContainerSubgraphEdges(node) as OFNode & { data: OFIterationNodeData }
    const subgraphNodeMap = new Map<string, OFNode>(
      patchedNode.data.subgraph.nodes.map((item) => [item.id, item as OFNode])
    )
    patchedNode.data.subgraph.edges = patchedNode.data.subgraph.edges.map((edge) =>
      normalizeEdge(edge as OFRunnableEdge, subgraphNodeMap, {
        defaultSourceHandle:
          subgraphNodeMap.get(edge.source)?.data.type === 'ifelse' ? undefined : 'source',
        defaultTargetHandle: 'target'
      })
    )
    if (patchedNode.data.subgraph.edges.length === 0) {
      const startNodeId = patchedNode.data.start_node_id
      const firstBusinessNode = patchedNode.data.subgraph.nodes.find(
        (item) => item.id !== startNodeId
      )
      if (firstBusinessNode) {
        patchedNode.data.subgraph.edges = [
          normalizeEdge(
            {
              id: `edge_${startNodeId}_${firstBusinessNode.id}`,
              source: startNodeId,
              target: firstBusinessNode.id,
              sourceHandle: 'source',
              targetHandle: 'target'
            },
            subgraphNodeMap,
            { defaultSourceHandle: 'source', defaultTargetHandle: 'target' }
          )
        ]
      }
    }
    return patchedNode
  }) as OFRunnableRootNode[]

  return assertRunnableWorkflow(sanitizeWorkflowForPromptExample(workflow))
}

function sanitizeWorkflowForPromptExample(workflow: OFRunnableWorkflow): OFRunnableWorkflow {
  return {
    ...workflow,
    graph: {
      ...workflow.graph,
      nodes: workflow.graph.nodes.map((node) =>
        sanitizeNodeForPromptExample(node as OFNode)
      ) as typeof workflow.graph.nodes
    }
  }
}

function sanitizeNodeForPromptExample(node: OFNode): OFNode {
  const data = sanitizeNodeDataForPromptExample(node.data)

  if (data.type === 'iteration' || data.type === 'loop') {
    return {
      ...node,
      data: {
        ...data,
        subgraph: {
          ...data.subgraph,
          nodes: data.subgraph.nodes.map((item) =>
            sanitizeNodeForPromptExample(item as OFNode)
          ) as typeof data.subgraph.nodes
        }
      }
    }
  }

  return {
    ...node,
    data
  }
}

function sanitizeNodeDataForPromptExample(data: OFNode['data']): OFNode['data'] {
  switch (data.type) {
    case 'start':
      return {
        ...data,
        input: {
          ...data.input,
          variables: data.input.variables.map((item) => omitEmptySelector(item, 'value_selector'))
        }
      }
    case 'ifelse':
      return {
        ...data,
        cases: data.cases.map((item) => ({
          ...item,
          conditions: item.conditions.map((condition) => {
            if (condition.compare_source_mode === 'variable') {
              return condition
            }
            return omitField(condition, 'compare_selector')
          })
        }))
      }
    case 'llm': {
      const structuredOutput =
        data.structured_output.enabled === false
          ? omitField(data.structured_output, 'schema')
          : data.structured_output
      return {
        ...data,
        structured_output: structuredOutput,
        output: data.output
          ? {
              ...data.output,
              variables: data.output.variables.map((item) => omitNullSchemaFields(item))
            }
          : data.output
      }
    }
    case 'iteration':
      return {
        ...data,
        output_selector: data.output_selector,
        branch_output_selectors: (data.branch_output_selectors ?? []).filter(
          (item) => Array.isArray(item.output_selector) && item.output_selector.length > 0
        ),
        output: {
          ...data.output,
          variables: data.output.variables.map((item) => omitNullSchemaFields(item))
        }
      }
    case 'loop':
      return {
        ...data,
        loop_variables: data.loop_variables.map((item) => {
          if (item.value_type === 'variable') {
            return omitEmptySelector(item, 'value_selector')
          }
          return item
        }),
        output: {
          ...data.output,
          variables: data.output.variables.map((item) => omitNullSchemaFields(item))
        }
      }
    case 'variable-assign':
      return {
        ...data,
        rules: data.rules.map((item) =>
          item.source_mode === 'variable' ? omitEmptySelector(item, 'source_selector') : item
        ),
        output: {
          ...data.output,
          variables: data.output.variables.map((item) => omitNullSchemaFields(item))
        }
      }
    case 'end':
      return {
        ...data,
        output: {
          ...data.output,
          variables: data.output.variables.map((item) =>
            omitEmptySelector(omitNullSchemaFields(item), 'value_selector')
          )
        }
      }
    case 'iteration-start':
    case 'loop-start':
      if (!data.input) {
        return data
      }
      return {
        ...data,
        input: {
          ...data.input,
          variables: data.input.variables.map((item) =>
            omitNullSchemaFields(omitEmptySelector(item, 'value_selector'))
          )
        }
      }
    default:
      return data
  }
}

function omitEmptySelector<T extends Record<string, any>, K extends keyof T>(value: T, key: K): T {
  if (!Array.isArray(value[key]) || value[key].length > 0) {
    return value
  }
  return omitField(value, key)
}

function omitNullSchemaFields<T extends Record<string, any>>(value: T): T {
  let nextValue = value
  if ('schema' in nextValue && nextValue.schema === null) {
    nextValue = omitField(nextValue, 'schema')
  }
  if ('item_schema' in nextValue && nextValue.item_schema === null) {
    nextValue = omitField(nextValue, 'item_schema')
  }
  return nextValue
}

function omitField<T extends Record<string, any>, K extends keyof T>(value: T, key: K): T {
  const { [key]: _omitted, ...rest } = value
  return rest as T
}

function patchContainerSubgraphEdges(node: OFNode): OFNode {
  if (node.data.type !== 'iteration' && node.data.type !== 'loop') {
    return node
  }

  if (node.data.subgraph.edges.length > 0) {
    return node
  }

  const startNodeId = node.data.start_node_id
  const firstBusinessNode = node.data.subgraph.nodes.find((item) => item.id !== startNodeId)
  if (!firstBusinessNode) {
    return node
  }

  return {
    ...node,
    data: {
      ...node.data,
      subgraph: {
        ...node.data.subgraph,
        edges: [
          normalizeEdge(
            {
              id: `edge_${startNodeId}_${firstBusinessNode.id}`,
              source: startNodeId,
              target: firstBusinessNode.id,
              sourceHandle: 'source',
              targetHandle: 'target'
            },
            new Map(node.data.subgraph.nodes.map((item) => [item.id, item as OFNode])),
            { defaultSourceHandle: 'source', defaultTargetHandle: 'target' }
          )
        ]
      }
    }
  }
}

function normalizeEdge(
  edge: OFRunnableEdge,
  nodeMap: Map<string, OFNode>,
  params: {
    defaultSourceHandle?: string
    defaultTargetHandle: string
  }
): OFRunnableEdge {
  const sourceNode = nodeMap.get(edge.source)
  if (sourceNode?.data.type === 'ifelse' && !edge.sourceHandle) {
    throw new Error(`IfElse edge must declare sourceHandle: ${edge.id}`)
  }

  const sourcePortId = getOFEdgeSourcePortId(edge)
  const targetPortId = getOFEdgeTargetPortId(edge)

  return {
    ...edge,
    source_port_id: sourcePortId || params.defaultSourceHandle || 'source',
    target_port_id: targetPortId || params.defaultTargetHandle,
    sourceHandle: sourcePortId || params.defaultSourceHandle || 'source',
    targetHandle: targetPortId || params.defaultTargetHandle
  }
}

function buildAnnotatedWorkflowJsonc(example: OFRunnableWorkflow): string {
  const definitionMap = new Map(listOFNodeDefinitions().map((item) => [item.meta.type, item]))
  const contract = getOFWorkflowAuthoringContract()
  const authoringDefaults = getOFWorkflowAuthoringDefaults()
  return [
    '// OrchestraFlow strict runnable workflow JSONC template',
    ...buildAnnotatedCommentLines(contract, authoringDefaults, definitionMap),
    JSON.stringify(example, null, 2)
  ].join('\n')
}

function renderWorkflowRuleLines(contract: OFWorkflowAuthoringContract): string[] {
  return [
    `- 顶层固定字段：${contract.global_fields.map((item) => `\`${item.path}\``).join('、')}。`,
    ...contract.global_invariants.map((item) => `- ${item.summary}`),
    `- selector 语义：${contract.selector_contract.representation}。`,
    `- \`selector[0]\` 是变量存储 key（${contract.selector_contract.first_segment}），本身允许包含点。`,
    `- selector 最少 ${contract.selector_contract.min_items} 段，且每段必须是非空字符串。`,
    `- selector 示例：${contract.selector_contract.examples.map((item) => `\`${JSON.stringify(item)}\``).join('、')}。`,
    '- 开始节点 object 输入的嵌套字段必须写成分段 selector，例如 `["content_package","config","process_mode"]`。',
    '- 不要把开始节点 object 输入的完整点路径塞进 selector[0]，例如不要写成 `["content_package.config.process_mode"]`。',
    '- 可省略字段直接省略，不要用 `[]`、`null`、空对象做占位。',
    '- 不要输出空 selector 数组；任何 selector 一旦出现就必须是至少 1 段的非空字符串数组。',
    `- 所有边都必须显式写 \`${contract.edge_contract.default_source_handle}\` / \`${contract.edge_contract.default_target_handle}\` handle。`,
    `- 非 ifelse 节点默认 handle：source=\`${contract.edge_contract.default_source_handle}\`，target=\`${contract.edge_contract.default_target_handle}\`。`,
    `- ifelse 出边规则：${contract.edge_contract.ifelse_source_handle_rule}。`
  ]
}

function renderNodeRuleLines(
  contractNode: OFWorkflowAuthoringContract['nodes'][number],
  definition: ReturnType<typeof listOFNodeDefinitions>[number] | undefined
): string[] {
  const metadata = definition?.authoring
  const lines = [
    `- \`${contractNode.type}\`：作者必填 ${contractNode.author_required_fields.join('、') || '无'}；系统注入 ${contractNode.compiler_injected_fields.join('、') || '无'}；输出 ${contractNode.produced_outputs.join('、') || '无'}；说明 ${contractNode.notes.join('；') || '无'}`
  ]

  if (metadata?.system_managed_fields?.length) {
    lines.push(
      `- \`${contractNode.type}\` system-managed：${metadata.system_managed_fields.join('、')}`
    )
  } else if (definition?.spec.system_managed_fields?.length) {
    lines.push(
      `- \`${contractNode.type}\` system-managed：${definition.spec.system_managed_fields.join('、')}`
    )
  }
  if (metadata?.selector_policies?.length) {
    lines.push(`- \`${contractNode.type}\` selector：${metadata.selector_policies.join('；')}`)
  }
  if (metadata?.output_policies?.length) {
    lines.push(`- \`${contractNode.type}\` output：${metadata.output_policies.join('；')}`)
  }
  if (metadata?.omit_rules?.length) {
    lines.push(`- \`${contractNode.type}\` omit：${metadata.omit_rules.join('；')}`)
  }
  if (metadata?.warnings_zh?.length) {
    lines.push(`- \`${contractNode.type}\` warnings：${metadata.warnings_zh.join('；')}`)
  }
  if (metadata?.residual_notes_zh?.length) {
    lines.push(`- \`${contractNode.type}\` notes：${metadata.residual_notes_zh.join('；')}`)
  }

  return lines
}

function buildAnnotatedCommentLines(
  contract: OFWorkflowAuthoringContract,
  defaults: OFAuthoringDefaultRecommendation[],
  definitionMap: Map<string, ReturnType<typeof listOFNodeDefinitions>[number]>
): string[] {
  const managedFields = Array.from(
    new Set(
      Array.from(definitionMap.values()).flatMap(
        // 结构真相统一从 definition.spec 读取，避免继续回退到 authoring。
        (item) => item.spec.system_managed_fields || []
      )
    )
  )
  const omitRules = Array.from(
    new Set(Array.from(definitionMap.values()).flatMap((item) => item.authoring.omit_rules || []))
  )

  return [
    '// Omit optional fields entirely; do not use [], null, or empty objects as placeholders.',
    '// Start input variables should usually include `default` so the run panel can prefill runnable values.',
    '// Scalar and array start input variables may use variable-level `default`.',
    '// `object` variables must declare `schema`; put defaults inside object schema fields instead of on the variable.',
    `// selector rule: ${contract.selector_contract.representation}; first segment is ${contract.selector_contract.first_segment}.`,
    `// selector examples: ${contract.selector_contract.examples.map((item) => JSON.stringify(item)).join(' | ')}.`,
    '// start object field selectors must be segmented arrays, for example ["content_package","config","process_mode"].',
    '// never collapse a start object field path into selector[0] like ["content_package.config.process_mode"].',
    ...contract.global_invariants.map((item) => `// invariant: ${item.summary}`),
    `// edge rule: explicit handles required, target defaults to "${contract.edge_contract.default_target_handle}".`,
    `// edge rule: ifelse sourceHandle must follow ${contract.edge_contract.ifelse_source_handle_rule}.`,
    `// Edge rule: non-ifelse nodes use ${contract.edge_contract.default_source_handle} -> ${contract.edge_contract.default_target_handle}.`,
    ...defaults.slice(0, 2).map((item) => `// default hint: ${item.path} => ${item.summary}`),
    ...(managedFields.length ? [`// system-managed fields: ${managedFields.join(', ')}.`] : []),
    ...omitRules.map((item) => `// omit rule: ${item}`),
    '// Only // line comments are supported. /* */ is not supported.'
  ]
}

function exampleDsl(): OFAIDslWorkflow {
  return {
    version: '1.0',
    workflow: {
      name: 'compact_router_demo',
      description: 'Start -> IfElse -> Iteration / VariableAssign -> End',
      author: 'schema-exporter'
    },
    nodes: [
      {
        id: 'start',
        type: 'start' as OFBlockEnum,
        title: 'start',
        config: {
          input: {
            variables: [
              {
                variable: 'mode',
                label: 'mode',
                type: OFVarType.String,
                required: true,
                default: 'batch'
              },
              {
                variable: 'items',
                label: 'items',
                type: OFVarType.Array,
                required: true,
                default: ['sample-item-1']
              }
            ]
          }
        }
      },
      {
        id: 'branch',
        type: 'ifelse' as OFBlockEnum,
        title: 'branch',
        config: {
          cases: [
            {
              id: 'case_batch',
              kind: 'if',
              label: 'batch',
              handleId: 'batch_handle',
              conditions: [
                {
                  id: 'cond_batch',
                  variable_selector: ['mode'],
                  operator: 'is',
                  value: 'batch',
                  value_type: OFVarType.String
                }
              ]
            }
          ],
          elseCase: { handleId: 'else_handle', label: 'else' }
        }
      },
      {
        id: 'iterate_items',
        type: 'iteration' as OFBlockEnum,
        title: 'iterate_items',
        config: {
          iterator_selector: ['items'],
          output_selector: ['summarize_item.llmoutput'],
          parallel_mode: 'sequential',
          parallel_nums: 1,
          error_handle_mode: 'terminated',
          flatten_output: true
        },
        subgraph: {
          nodes: [
            {
              id: 'summarize_item',
              type: 'llm' as OFBlockEnum,
              title: 'summarize_item',
              config: {
                model: { provider: 'openai', name: 'gpt-4o-mini' },
                prompt_template: [
                  {
                    id: 'prompt_item',
                    role: 'user',
                    text: '请总结当前 item：{{iterate_items.item}}'
                  }
                ],
                structured_output: { enabled: false }
              }
            }
          ],
          edges: []
        }
      },
      {
        id: 'fallback_assign',
        type: 'variable-assign' as OFBlockEnum,
        title: 'fallback_assign',
        config: {
          rules: [
            {
              id: 'assign_mode',
              source_mode: 'variable',
              source_selector: ['mode'],
              source_path: 'mode',
              target_variable: 'single_result',
              target_label: 'single_result',
              target_type: OFVarType.String
            }
          ]
        }
      },
      {
        id: 'end',
        type: 'end' as OFBlockEnum,
        title: 'end',
        config: {
          output: {
            variables: [
              {
                variable: 'batch_result',
                label: 'batch_result',
                type: OFVarType.Array,
                value_selector: ['iterate_items.result']
              },
              {
                variable: 'single_result',
                label: 'single_result',
                type: OFVarType.String,
                value_selector: ['fallback_assign.single_result']
              }
            ]
          }
        }
      }
    ],
    edges: [
      { from: { node: 'start', handle: 'source' }, to: { node: 'branch', handle: 'target' } },
      {
        from: { node: 'branch', handle: 'batch_handle' },
        to: { node: 'iterate_items', handle: 'target' }
      },
      {
        from: { node: 'branch', handle: 'else_handle' },
        to: { node: 'fallback_assign', handle: 'target' }
      },
      {
        from: { node: 'iterate_items', handle: 'source' },
        to: { node: 'end', handle: 'target' }
      },
      {
        from: { node: 'fallback_assign', handle: 'source' },
        to: { node: 'end', handle: 'target' }
      }
    ]
  }
}
