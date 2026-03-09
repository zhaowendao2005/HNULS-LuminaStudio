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
  OFBlockEnum,
  OFEdge,
  OFIterationNodeData,
  OFNode,
  OFRunnableWorkflow,
  OFWorkflowAuthoringContract
} from '@shared/Orchestraflow-types'
import { OFVarType } from '@shared/Orchestraflow-types'
import { compileAIDslToWorkflow } from './compiler'
import { GENERATED_RUNNABLE_WORKFLOW_SCHEMA } from './generated-runnable-schema'
import {
  getOFRuntimeNodeDescriptors,
  getOFWorkflowAuthoringContract,
  getOFWorkflowAuthoringDefaults
} from './registry'
import { assertRunnableWorkflow } from './validator'

export function buildOrchestraflowAISchemaBundle(): OFAISchemaBundle {
  const generatedAt = new Date().toISOString()
  const nodes = getOFRuntimeNodeDescriptors().map((item) => ({
    type: item.type,
    category: item.category,
    title: item.title,
    summary: item.summary,
    internal: item.internal
  }))
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
  const startDefaultRecommendations = authoringDefaults.filter((item) =>
    item.path.startsWith('graph.nodes[start].data.input.variables')
  )
  const nodeWarnings: Partial<Record<OFBlockEnum, string[]>> = {
    start: [
      '如果声明运行前需要填写的输入变量，优先补 `default`，让导入后的工作流可以直接运行。',
      '`default` 是运行前预填值，不是 `value_selector`；两者不要混淆。',
      '`array` / `object` 类型的 `default` 必须写成真实 JSON 值，不要写成字符串化 JSON。'
    ],
    llm: [
      '`structured_output.enabled=false` 时不要再写 `structured_output.schema:null`。',
      '`data.model.provider` 和 `data.model.name` 必须同时存在，不能留空对象。'
    ],
    ifelse: [
      '仅当 `compare_source_mode=variable` 时才写 `compare_selector`，且 selector 必须非空。',
      '不要为普通分支条件补空 `compare_selector: []` 占位。'
    ],
    iteration: [
      '`iterator_selector` 必须非空；`output_selector` 可省略但不能写空数组。',
      '不要手写伪造的 `start_node_id`、`iteration-start` 或 `subgraph.viewport`。'
    ],
    loop: [
      '`loop_count`、`loop_variables`、`subgraph` 必须同时给全。',
      '`loop_variables` 不能只有变量名，必须给出初始化值或值来源。',
      '`result` 默认按聚合数组输出，不要把 `loop.output.variables[].type` 写成 `object`。',
      '不要手写伪造的 `start_node_id`、`loop-start` 或 `subgraph.viewport`。'
    ],
    end: ['`output.variables[*].value_selector` 可省略时直接省略，不能写空数组。']
  }

  return [
    '## 目标',
    '- 输出严格的 `OFRunnableWorkflow` JSON，不输出宽松编辑态结构。',
    '- 主体遵循 `authoring_contract`，完整结构参考 `schema` 字段。',
    '',
    '## 生成禁令',
    '- 可省略字段直接省略，不要用 `[]`、`null`、空对象做占位。',
    '- 不要输出空 selector 数组；任何 selector 一旦出现就必须是至少 1 段的非空字符串数组。',
    '- `compare_selector` 只在 `compare_source_mode=variable` 时出现，且必须非空。',
    '- `structured_output.enabled=false` 时不要写 `structured_output.schema:null`。',
    '- `loop` 必须同时给出 `loop_count`、`loop_variables`、`subgraph`；`loop_variables` 不能只有变量名。',
    '- `loop.output.variables` 中的 `result` 默认写成聚合数组结果，不要写成 `object`。',
    '- `iteration` / `loop` 的 `start_node_id`、内部 start 节点、`subgraph.viewport` 由系统维护，不要伪造。',
    '',
    '## 全局规则',
    '- 顶层固定字段：`id`、`name`、`author`、`createdAt`、`updatedAt`、`status`、`graph`。',
    '- `status` 只能是：`draft`、`published`、`archived`。',
    '- 根图禁止出现 `iteration-start` / `loop-start`。',
    '- 所有边都必须显式写 `sourceHandle` 和 `targetHandle`。',
    '- 非 `ifelse` 节点出边的 `sourceHandle` 固定为 `source`；所有 `targetHandle` 固定为 `target`。',
    '- `ifelse` 出边的 `sourceHandle` 必须匹配 `case.handleId` 或 `elseCase.handleId`。',
    '',
    '## Selector 规范',
    `- selector 语义：${contract.selector_contract.representation}。`,
    '- `selector[0]` 是变量存储 key，本身允许包含点。',
    '- 例如：`["input"]`、`["node_llm.llmoutput"]`、`["node_llm.structured_output", "reason"]`。',
    '- selector 不能为空，且每一段都必须是非空字符串。',
    '',
    '## 输入默认值建议',
    '- `graph.nodes[start].data.input.variables[*].default` 用于运行面板预填，不是编译器自动回填。',
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
      .map((item) => {
        const required = item.author_required_fields.join('、') || '无'
        const injected = item.compiler_injected_fields.join('、') || '无'
        const outputs = item.produced_outputs.join('、') || '无'
        const notes = item.notes.join('；') || '无'
        const warnings = nodeWarnings[item.type]?.join('；') || '无'
        return `- \`${item.type}\`：作者必填 ${required}；系统注入 ${injected}；输出 ${outputs}；禁止项 ${warnings}；说明 ${notes}`
      }),
    '',
    '## 内部节点',
    ...contract.nodes
      .filter((item) => item.internal)
      .map((item) => `- \`${item.type}\`：${item.notes.join('；')}`),
    '',
    '## 输出策略',
    '- `prompt_markdown` 只提供高密度 contract 摘要。',
    '- `annotated_workflow_jsonc` 提供最小注释模板。',
    '- `schema` 提供完整结构参考。'
  ].join('\n')
}

function buildCompactRunnableExampleWorkflow(): OFRunnableWorkflow {
  const workflow = compileAIDslToWorkflow(exampleDsl())
  const rootNodeMap = new Map<string, OFNode>(workflow.graph.nodes.map((node) => [node.id, node]))

  workflow.graph.edges = workflow.graph.edges.map((edge) =>
    normalizeEdge(edge, rootNodeMap, {
      defaultSourceHandle: rootNodeMap.get(edge.source)?.data.type === 'ifelse' ? undefined : 'source',
      defaultTargetHandle: 'target'
    })
  )

  workflow.graph.nodes = workflow.graph.nodes.map((node) => {
    if (node.data.type !== 'iteration') {
      return node
    }

    const patchedNode = patchIterationNodeSelectors(node) as OFNode & { data: OFIterationNodeData }
    const subgraphNodeMap = new Map<string, OFNode>(
      patchedNode.data.subgraph.nodes.map((item) => [item.id, item as OFNode])
    )
    patchedNode.data.subgraph.edges = patchedNode.data.subgraph.edges.map((edge) =>
      normalizeEdge(edge, subgraphNodeMap, {
        defaultSourceHandle:
          subgraphNodeMap.get(edge.source)?.data.type === 'ifelse' ? undefined : 'source',
        defaultTargetHandle: 'target'
      })
    )
    if (patchedNode.data.subgraph.edges.length === 0) {
      const startNodeId = patchedNode.data.start_node_id
      const firstBusinessNode = patchedNode.data.subgraph.nodes.find((item) => item.id !== startNodeId)
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
  })

  return assertRunnableWorkflow(sanitizeWorkflowForPromptExample(workflow))
}

function sanitizeWorkflowForPromptExample(workflow: OFRunnableWorkflow): OFRunnableWorkflow {
  return {
    ...workflow,
    graph: {
      ...workflow.graph,
      nodes: workflow.graph.nodes.map((node) => sanitizeNodeForPromptExample(node as OFNode)) as typeof workflow.graph.nodes
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
          nodes: data.subgraph.nodes.map((item) => sanitizeNodeForPromptExample(item as OFNode)) as typeof data.subgraph.nodes
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
        output_selector:
          Array.isArray(data.output_selector) && data.output_selector.length === 0
            ? undefined
            : data.output_selector,
        branch_output_selectors: data.branch_output_selectors.filter(
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
          variables: data.output.variables.map((item) => omitEmptySelector(omitNullSchemaFields(item), 'value_selector'))
        }
      }
    case 'iteration-start':
    case 'loop-start':
      return {
        ...data,
        input: {
          ...data.input,
          variables: data.input.variables.map((item) => omitNullSchemaFields(omitEmptySelector(item, 'value_selector')))
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

function patchIterationNodeSelectors(node: OFNode): OFNode {
  if (node.data.type !== 'iteration') {
    return node
  }

  return {
    ...node,
    data: {
      ...node.data,
      iterator_selector: ['items'],
      output_selector: ['summarize_item.llmoutput'],
      subgraph: {
        ...node.data.subgraph,
        nodes: node.data.subgraph.nodes.map((item) => {
          if (item.data.type === 'llm') {
            return {
              ...item,
              data: {
                ...item.data,
                output: {
                  variables: [
                    {
                      variable: 'llmoutput',
                      label: 'llmoutput',
                      type: OFVarType.String,
                      required: true,
                      value_selector: ['summarize_item.llmoutput']
                    }
                  ]
                }
              }
            }
          }
          return item
        })
      }
    }
  }
}

function normalizeEdge(
  edge: OFEdge,
  nodeMap: Map<string, OFNode>,
  params: {
    defaultSourceHandle?: string
    defaultTargetHandle: string
  }
): OFEdge {
  const sourceNode = nodeMap.get(edge.source)
  if (sourceNode?.data.type === 'ifelse' && !edge.sourceHandle) {
    throw new Error(`IfElse edge must declare sourceHandle: ${edge.id}`)
  }

  return {
    ...edge,
    sourceHandle: edge.sourceHandle || params.defaultSourceHandle || 'source',
    targetHandle: edge.targetHandle || params.defaultTargetHandle
  }
}

function buildAnnotatedWorkflowJsonc(example: OFRunnableWorkflow): string {
  return [
    '// OrchestraFlow strict runnable workflow JSONC template',
    '// Omit optional fields entirely; do not use [], null, or empty objects as placeholders.',
    '// Start input variables should usually include `default` so the run panel can prefill runnable values.',
    '// Any selector that appears must be a non-empty string array.',
    '// `compare_selector` only appears when compare_source_mode=variable; never emit an empty array.',
    '// `structured_output.enabled=false` means do not emit `schema:null`.',
    '// Loop `result` should default to an aggregated array output, not `object`.',
    '// Missing edge handles from legacy formats are not allowed.',
    '// Root graph must not contain iteration-start / loop-start.',
    '// selector rule: selector[0] is the variable-store key and may contain dots, e.g. ["summarize_item.llmoutput"].',
    '// Edge rule: non-ifelse nodes use source -> target; ifelse edges must match case.handleId / elseCase.handleId.',
    '// Container rule: keep exactly one internal start node, and every subgraph node must carry parentNode plus extent:"parent".',
    '// Do not hand-author fake start_node_id / internal start nodes / subgraph.viewport for iteration or loop containers.',
    '// Only // line comments are supported. /* */ is not supported.',
    JSON.stringify(example, null, 2)
  ].join('\n')
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
                default: ['sample-item-1', 'sample-item-2']
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
