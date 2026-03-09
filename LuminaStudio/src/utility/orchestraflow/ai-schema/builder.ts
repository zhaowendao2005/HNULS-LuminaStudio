/**
 * 可运行工作流 bundle 导出器。
 *
 * 代码即文档：
 * - 结构 schema 来自共享类型 codegen 产物。
 * - 行为约束来自 runtime registry contract。
 * - builder 只做组装，不再手写主要结构规则。
 */
import type {
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
import { getOFRuntimeNodeDescriptors, getOFWorkflowAuthoringContract } from './registry'
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
  const example = buildCompactRunnableExampleWorkflow()
  const promptMarkdown = buildPromptMarkdown(authoringContract)
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
    '- 使用 bundle.schema 读取完整自动生成 schema；主提示不再内嵌整份 schema。'
  ].join('\n')

  return {
    version: '1.0',
    format: 'orchestraflow-runnable-workflow',
    generated_at: generatedAt,
    nodes,
    authoring_contract: authoringContract,
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

function buildPromptMarkdown(contract: OFWorkflowAuthoringContract): string {
  return [
    '## 目标',
    '- 输出严格的 `OFRunnableWorkflow` JSON，不输出宽松编辑态结构。',
    '- 主体遵循 `authoring_contract`，完整结构参考 `schema` 字段。',
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
    '- 例如：`[\"input\"]`、`[\"node_llm.llmoutput\"]`、`[\"node_llm.structured_output\", \"reason\"]`。',
    '- selector 不能为空，且每一段都必须是非空字符串。',
    '',
    '## 节点规则',
    ...contract.nodes
      .filter((item) => item.ai_exposed)
      .map((item) => {
        const required = item.author_required_fields.join('、') || '无'
        const injected = item.compiler_injected_fields.join('、') || '无'
        const outputs = item.produced_outputs.join('、') || '无'
        const notes = item.notes.join('；') || '无'
        return `- \`${item.type}\`：作者必填 ${required}；系统注入 ${injected}；输出 ${outputs}；说明 ${notes}`
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

  return assertRunnableWorkflow(workflow)
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
    '// OrchestraFlow 严格可运行工作流 JSONC 模板',
    '// 不兼容缺失 handle 的旧边格式。',
    '// 根图禁止出现 iteration-start / loop-start。',
    '// selector 规则：selector[0] 是变量存储 key，可以包含点，例如 ["summarize_item.llmoutput"]。',
    '// 根图/子图边规则：非 ifelse 节点出边统一使用 source -> target；ifelse 出边必须匹配 case.handleId / elseCase.handleId。',
    '// 容器规则：子图必须保留唯一内部 start 节点，且子图节点必须带 parentNode 和 extent:"parent"。',
    '// 读取 JSONC 时只支持 // 行注释，不支持 /* */。',
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
              { variable: 'mode', label: 'mode', type: OFVarType.String, required: true },
              { variable: 'items', label: 'items', type: OFVarType.Array, required: true }
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
