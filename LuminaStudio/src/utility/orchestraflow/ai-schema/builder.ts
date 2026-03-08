/**
 * 可运行工作流 bundle 导出器。
 *
 * 代码即文档：
 * - 导出的 schema 面向工作流目录中的最终 OFWorkflow JSON。
 * - 只要 AI 遵循这份 bundle 生成内容，结果就应能直接落盘到 OrchestraFlow 存储目录。
 * - `schema` 负责结构约束，`annotated_workflow_jsonc` 负责作者约束。
 */
import type {
  OFAISchemaBundle,
  OFAISchemaNodeSummary,
  OFAIDslWorkflow,
  OFEdge,
  OFNode,
  OFWorkflow
} from '@shared/Orchestraflow-types'
import { OFBlockEnum, OFNodeRunningStatus, OFVarType } from '@shared/Orchestraflow-types'
import { getOFRuntimeNodeDescriptors } from './registry'
import { compileAIDslToWorkflow } from './compiler'

const NON_EMPTY_STRING = { type: 'string', minLength: 1 } as const
const SELECTOR_ARRAY = {
  type: 'array',
  minItems: 1,
  items: NON_EMPTY_STRING
} as const

export function buildOrchestraflowAISchemaBundle(): OFAISchemaBundle {
  const generatedAt = new Date().toISOString()
  const nodes = getOFRuntimeNodeDescriptors().map<OFAISchemaNodeSummary>((item) => ({
    type: item.type,
    category: item.category,
    title: item.title,
    summary: item.summary,
    internal: item.internal
  }))
  const example = buildRunnableExampleWorkflow()
  const schema = buildRunnableWorkflowSchemaDocument()
  const annotatedWorkflowJsonc = buildAnnotatedWorkflowJsonc(example)
  const promptMarkdown = buildPromptMarkdown(nodes, example)
  const bundledMarkdown = [
    '# OrchestraFlow Runnable Workflow Schema',
    '',
    promptMarkdown,
    '',
    '## JSON Schema',
    '```json',
    JSON.stringify(schema, null, 2),
    '```',
    '',
    '## Runnable Example',
    '```json',
    JSON.stringify(example, null, 2),
    '```',
    '',
    '## Annotated JSONC Template',
    '```jsonc',
    annotatedWorkflowJsonc,
    '```'
  ].join('\n')

  return {
    version: '1.0',
    format: 'orchestraflow-runnable-workflow',
    generated_at: generatedAt,
    nodes,
    schema,
    example,
    annotated_workflow_jsonc: annotatedWorkflowJsonc,
    prompt_markdown: promptMarkdown,
    bundled_markdown: bundledMarkdown
  }
}

function buildPromptMarkdown(nodeSummaries: OFAISchemaNodeSummary[], example: OFWorkflow): string {
  return [
    '## 目标',
    '- 让 AI 直接输出最终可运行的 `OFWorkflow` JSON。',
    '- 先阅读 `annotated_workflow_jsonc` 里的中文注释，再输出最终 JSON。',
    '- 若人工检查方便，可先产出带 `//` 注释的 JSONC；系统读取时会先剥离注释再解析。',
    '',
    '## 强约束',
    '- 顶层字段固定：`id`、`name`、`author`、`createdAt`、`updatedAt`、`status`、`graph`。',
    '- `status` 只能是：`draft`、`published`、`archived`。',
    '- `node.type` 只能是系统枚举中的固定值，不能自造新类型。',
    '- `graph.nodes[*]` 必须是当前运行时可识别的真实节点，包括容器内部的 `iteration-start` / `loop-start`。',
    '- 普通边必须显式写 `sourceHandle: \"source\"`、`targetHandle: \"target\"`。',
    '- `ifelse` 出边的 `sourceHandle` 必须等于真实 `case.handleId` 或 `elseCase.handleId`。',
    '- `subgraph.edges` 为空只表示确实没有连接，不能用 `null handle` 代替未连接。',
    '- `selector` 一律使用 `string[]`，不是点字符串。',
    '- `llm`、`iteration`、`loop`、`variable-assign`、`end` 的输出字段不能省略。',
    '',
    '## 节点清单',
    ...nodeSummaries.map((item) => {
      const suffix = item.internal ? '（内部节点，容器子图里必须真实存在）' : ''
      return `- \`${item.type}\`：${item.summary}${suffix}`
    }),
    '',
    '## 示例文件名',
    `- 推荐：\`${example.id}.json\``
  ].join('\n')
}

function buildRunnableWorkflowSchemaDocument(): Record<string, any> {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'orchestraflow-runnable-workflow.schema.json',
    title: 'OrchestraFlow Runnable Workflow',
    description: '最终持久化工作流 JSON，允许系统读取前先剥离 `//` 注释。',
    type: 'object',
    required: ['id', 'name', 'author', 'createdAt', 'updatedAt', 'status', 'graph'],
    properties: {
      id: NON_EMPTY_STRING,
      name: NON_EMPTY_STRING,
      description: { type: 'string' },
      author: NON_EMPTY_STRING,
      createdAt: { type: 'number' },
      updatedAt: { type: 'number' },
      status: { type: 'string', enum: ['draft', 'published', 'archived'] },
      graph: { $ref: '#/$defs/workflowGraph' }
    },
    additionalProperties: false,
    $defs: {
      nonEmptyString: NON_EMPTY_STRING,
      selectorArray: SELECTOR_ARRAY,
      runningStatus: {
        type: 'string',
        enum: Object.values(OFNodeRunningStatus)
      },
      workflowGraph: workflowGraphSchema(),
      subWorkflowGraph: subWorkflowGraphSchema(),
      rootNode: {
        oneOf: [
          nodeEnvelopeSchema({
            nodeType: OFBlockEnum.Start,
            nested: false,
            dataSchema: startNodeDataSchema()
          }),
          nodeEnvelopeSchema({
            nodeType: OFBlockEnum.LLM,
            nested: false,
            dataSchema: llmNodeDataSchema()
          }),
          nodeEnvelopeSchema({
            nodeType: OFBlockEnum.IfElse,
            nested: false,
            dataSchema: ifElseNodeDataSchema()
          }),
          nodeEnvelopeSchema({
            nodeType: OFBlockEnum.Iteration,
            nested: false,
            dataSchema: iterationNodeDataSchema()
          }),
          nodeEnvelopeSchema({
            nodeType: OFBlockEnum.Loop,
            nested: false,
            dataSchema: loopNodeDataSchema()
          }),
          nodeEnvelopeSchema({
            nodeType: OFBlockEnum.VariableAssign,
            nested: false,
            dataSchema: variableAssignNodeDataSchema()
          }),
          nodeEnvelopeSchema({
            nodeType: OFBlockEnum.End,
            nested: false,
            dataSchema: endNodeDataSchema()
          })
        ]
      },
      subgraphNode: {
        oneOf: [
          nodeEnvelopeSchema({
            nodeType: OFBlockEnum.IterationStart,
            nested: true,
            dataSchema: iterationStartNodeDataSchema()
          }),
          nodeEnvelopeSchema({
            nodeType: OFBlockEnum.LoopStart,
            nested: true,
            dataSchema: loopStartNodeDataSchema()
          }),
          nodeEnvelopeSchema({
            nodeType: OFBlockEnum.LLM,
            nested: true,
            dataSchema: llmNodeDataSchema()
          }),
          nodeEnvelopeSchema({
            nodeType: OFBlockEnum.IfElse,
            nested: true,
            dataSchema: ifElseNodeDataSchema()
          }),
          nodeEnvelopeSchema({
            nodeType: OFBlockEnum.VariableAssign,
            nested: true,
            dataSchema: variableAssignNodeDataSchema()
          }),
          nodeEnvelopeSchema({
            nodeType: OFBlockEnum.End,
            nested: true,
            dataSchema: endNodeDataSchema()
          })
        ]
      },
      rootEdge: edgeSchema(false),
      subgraphEdge: edgeSchema(true),
      variable: variableSchema(),
      structuredJsonSchema: structuredJsonSchemaDefinition(),
      promptItem: promptItemSchema(),
      ifElseCondition: ifElseConditionSchema(),
      variableAssignRule: variableAssignRuleSchema(),
      loopVariable: loopVariableSchema()
    }
  }
}

function workflowGraphSchema(): Record<string, any> {
  return {
    type: 'object',
    required: ['nodes', 'edges'],
    properties: {
      nodes: {
        type: 'array',
        minItems: 1,
        items: { $ref: '#/$defs/rootNode' }
      },
      edges: {
        type: 'array',
        items: { $ref: '#/$defs/rootEdge' }
      }
    },
    additionalProperties: false
  }
}

function subWorkflowGraphSchema(): Record<string, any> {
  return {
    type: 'object',
    required: ['nodes', 'edges', 'viewport'],
    properties: {
      nodes: {
        type: 'array',
        minItems: 1,
        items: { $ref: '#/$defs/subgraphNode' }
      },
      edges: {
        type: 'array',
        items: { $ref: '#/$defs/subgraphEdge' }
      },
      viewport: {
        type: 'object',
        required: ['x', 'y', 'zoom'],
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
          zoom: { type: 'number' }
        },
        additionalProperties: false
      }
    },
    additionalProperties: false
  }
}

function nodeEnvelopeSchema(params: {
  nodeType: OFBlockEnum
  nested: boolean
  dataSchema: Record<string, any>
}): Record<string, any> {
  return {
    type: 'object',
    required: params.nested
      ? ['id', 'type', 'position', 'parentNode', 'extent', 'data']
      : ['id', 'type', 'position', 'data'],
    properties: {
      id: NON_EMPTY_STRING,
      type: { const: params.nodeType },
      parentNode: params.nested ? NON_EMPTY_STRING : { type: 'string' },
      extent: params.nested ? { const: 'parent' } : { type: 'string', enum: ['parent'] },
      position: {
        type: 'object',
        required: ['x', 'y'],
        properties: {
          x: { type: 'number' },
          y: { type: 'number' }
        },
        additionalProperties: false
      },
      data: params.dataSchema
    },
    additionalProperties: false
  }
}

function commonNodeDataSchema(nodeType: OFBlockEnum): Record<string, any> {
  return {
    type: 'object',
    required: ['type', 'title', 'desc'],
    properties: {
      type: { const: nodeType },
      title: NON_EMPTY_STRING,
      desc: { type: 'string' },
      width: { type: 'number' },
      height: { type: 'number' },
      selected: { type: 'boolean' },
      _runningStatus: { $ref: '#/$defs/runningStatus' },
      _connectedSourceHandleIds: {
        type: 'array',
        items: NON_EMPTY_STRING
      },
      _connectedTargetHandleIds: {
        type: 'array',
        items: NON_EMPTY_STRING
      }
    },
    additionalProperties: false
  }
}

function mergeNodeDataSchema(
  baseSchema: Record<string, any>,
  extraRequired: string[],
  extraProperties: Record<string, any>
): Record<string, any> {
  const required = [...new Set([...(baseSchema.required || []), ...extraRequired])]
  return {
    ...baseSchema,
    required,
    properties: {
      ...(baseSchema.properties || {}),
      ...extraProperties
    }
  }
}

function startNodeDataSchema(): Record<string, any> {
  return mergeNodeDataSchema(commonNodeDataSchema(OFBlockEnum.Start), ['input'], {
    input: {
      type: 'object',
      required: ['variables'],
      properties: {
        variables: {
          type: 'array',
          minItems: 1,
          items: { $ref: '#/$defs/variable' }
        }
      },
      additionalProperties: false
    }
  })
}

function llmNodeDataSchema(): Record<string, any> {
  return mergeNodeDataSchema(
    commonNodeDataSchema(OFBlockEnum.LLM),
    ['model', 'prompt_template', 'structured_output', 'output'],
    {
      model: {
        type: 'object',
        required: ['provider', 'name'],
        properties: {
          provider: NON_EMPTY_STRING,
          name: NON_EMPTY_STRING,
          mode: { type: 'string' },
          completion_params: { type: 'object', additionalProperties: true }
        },
        additionalProperties: false
      },
      prompt_template: {
        type: 'array',
        minItems: 1,
        items: { $ref: '#/$defs/promptItem' }
      },
      context: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          variable_selector: { $ref: '#/$defs/selectorArray' }
        },
        additionalProperties: false
      },
      memory: { type: 'object', additionalProperties: true },
      vision: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' }
        },
        additionalProperties: false
      },
      structured_output: {
        type: 'object',
        required: ['enabled'],
        properties: {
          enabled: { type: 'boolean' },
          schema: { $ref: '#/$defs/structuredJsonSchema' }
        },
        additionalProperties: false
      },
      output: nodeOutputSchema(1)
    }
  )
}

function ifElseNodeDataSchema(): Record<string, any> {
  return mergeNodeDataSchema(commonNodeDataSchema(OFBlockEnum.IfElse), ['cases', 'elseCase'], {
    cases: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['id', 'kind', 'label', 'handleId', 'conditions'],
        properties: {
          id: NON_EMPTY_STRING,
          kind: { type: 'string', enum: ['if', 'elif'] },
          label: NON_EMPTY_STRING,
          handleId: NON_EMPTY_STRING,
          conditions: {
            type: 'array',
            minItems: 1,
            items: { $ref: '#/$defs/ifElseCondition' }
          }
        },
        additionalProperties: false
      }
    },
    elseCase: {
      type: 'object',
      required: ['handleId', 'label'],
      properties: {
        handleId: NON_EMPTY_STRING,
        label: NON_EMPTY_STRING
      },
      additionalProperties: false
    }
  })
}

function iterationNodeDataSchema(): Record<string, any> {
  return mergeNodeDataSchema(
    commonNodeDataSchema(OFBlockEnum.Iteration),
    [
      'width',
      'height',
      'iterator_selector',
      'output_selector',
      'start_node_id',
      'subgraph',
      'parallel_mode',
      'parallel_nums',
      'error_handle_mode',
      'flatten_output',
      'output'
    ],
    {
      iterator_selector: { $ref: '#/$defs/selectorArray' },
      output_selector: { $ref: '#/$defs/selectorArray' },
      branch_output_selectors: {
        type: 'array',
        items: {
          type: 'object',
          required: ['source_node_id', 'source_handle_id', 'output_selector'],
          properties: {
            source_node_id: NON_EMPTY_STRING,
            source_handle_id: NON_EMPTY_STRING,
            output_selector: { $ref: '#/$defs/selectorArray' }
          },
          additionalProperties: false
        }
      },
      start_node_id: NON_EMPTY_STRING,
      subgraph: { $ref: '#/$defs/subWorkflowGraph' },
      parallel_mode: { type: 'string', enum: ['sequential', 'parallel'] },
      parallel_nums: { type: 'integer', minimum: 1, maximum: 10 },
      error_handle_mode: {
        type: 'string',
        enum: ['terminated', 'continue-on-error', 'remove-abnormal-output']
      },
      flatten_output: { type: 'boolean' },
      output: nodeOutputSchema(1)
    }
  )
}

function iterationStartNodeDataSchema(): Record<string, any> {
  return mergeNodeDataSchema(commonNodeDataSchema(OFBlockEnum.IterationStart), ['input'], {
    input: {
      type: 'object',
      required: ['variables'],
      properties: {
        variables: {
          type: 'array',
          minItems: 3,
          items: { $ref: '#/$defs/variable' }
        }
      },
      additionalProperties: false
    }
  })
}

function loopNodeDataSchema(): Record<string, any> {
  return mergeNodeDataSchema(
    commonNodeDataSchema(OFBlockEnum.Loop),
    ['width', 'height', 'loop_count', 'loop_variables', 'start_node_id', 'subgraph', 'output'],
    {
      loop_count: { type: 'integer', minimum: 1 },
      loop_variables: {
        type: 'array',
        minItems: 1,
        items: { $ref: '#/$defs/loopVariable' }
      },
      break_conditions: {
        type: 'array',
        items: { $ref: '#/$defs/ifElseCondition' }
      },
      logical_operator: { type: 'string', enum: ['and', 'or'] },
      start_node_id: NON_EMPTY_STRING,
      subgraph: { $ref: '#/$defs/subWorkflowGraph' },
      output: nodeOutputSchema(1)
    }
  )
}

function loopStartNodeDataSchema(): Record<string, any> {
  return mergeNodeDataSchema(commonNodeDataSchema(OFBlockEnum.LoopStart), ['input'], {
    input: {
      type: 'object',
      required: ['variables'],
      properties: {
        variables: {
          type: 'array',
          minItems: 3,
          items: { $ref: '#/$defs/variable' }
        }
      },
      additionalProperties: false
    }
  })
}

function variableAssignNodeDataSchema(): Record<string, any> {
  return mergeNodeDataSchema(
    commonNodeDataSchema(OFBlockEnum.VariableAssign),
    ['rules', 'output'],
    {
      rules: {
        type: 'array',
        minItems: 1,
        items: { $ref: '#/$defs/variableAssignRule' }
      },
      output: nodeOutputSchema(1)
    }
  )
}

function endNodeDataSchema(): Record<string, any> {
  return mergeNodeDataSchema(commonNodeDataSchema(OFBlockEnum.End), ['output'], {
    output: nodeOutputSchema(1)
  })
}

function nodeOutputSchema(minItems = 1): Record<string, any> {
  return {
    type: 'object',
    required: ['variables'],
    properties: {
      variables: {
        type: 'array',
        minItems,
        items: { $ref: '#/$defs/variable' }
      }
    },
    additionalProperties: false
  }
}

function edgeSchema(isSubgraph: boolean): Record<string, any> {
  return {
    type: 'object',
    required: ['id', 'source', 'target', 'sourceHandle', 'targetHandle'],
    properties: {
      id: NON_EMPTY_STRING,
      source: NON_EMPTY_STRING,
      target: NON_EMPTY_STRING,
      sourceHandle: NON_EMPTY_STRING,
      targetHandle: NON_EMPTY_STRING,
      class: { type: 'string' },
      zIndex: { type: 'number' },
      data: {
        type: 'object',
        properties: {
          isInIteration: { type: 'boolean' },
          iterationId: { type: 'string' },
          sourceType: { type: 'string', enum: Object.values(OFBlockEnum) },
          targetType: { type: 'string', enum: Object.values(OFBlockEnum) },
          _hovering: { type: 'boolean' },
          _connectedNodeIsHovering: { type: 'boolean' },
          _connectedNodeIsSelected: { type: 'boolean' },
          _sourceRunningStatus: { $ref: '#/$defs/runningStatus' },
          _targetRunningStatus: { $ref: '#/$defs/runningStatus' }
        },
        additionalProperties: true
      }
    },
    additionalProperties: false,
    description: isSubgraph
      ? '容器子图内部边。sourceHandle 和 targetHandle 必须显式填写，不能为 null。'
      : '根图边。普通边使用 source/target，IfElse 出边使用真实分支 handle。'
  }
}

function variableSchema(): Record<string, any> {
  return {
    type: 'object',
    required: ['variable'],
    properties: {
      variable: NON_EMPTY_STRING,
      label: { type: 'string' },
      type: { type: 'string', enum: Object.values(OFVarType) },
      item_type: { type: 'string', enum: Object.values(OFVarType) },
      description: { type: 'string' },
      required: { type: 'boolean' },
      default: {},
      options: {
        type: 'array',
        items: NON_EMPTY_STRING
      },
      value_selector: { $ref: '#/$defs/selectorArray' },
      schema: { $ref: '#/$defs/structuredJsonSchema' },
      item_schema: { $ref: '#/$defs/structuredJsonSchema' }
    },
    additionalProperties: false
  }
}

function promptItemSchema(): Record<string, any> {
  return {
    type: 'object',
    required: ['id', 'role', 'text'],
    properties: {
      id: NON_EMPTY_STRING,
      role: { type: 'string', enum: ['system', 'user', 'assistant'] },
      text: NON_EMPTY_STRING
    },
    additionalProperties: false
  }
}

function structuredJsonSchemaDefinition(): Record<string, any> {
  return {
    oneOf: [
      {
        type: 'object',
        required: ['type', 'properties', 'required', 'additionalProperties'],
        properties: {
          type: { const: 'object' },
          properties: {
            type: 'object',
            additionalProperties: {
              oneOf: [
                {
                  type: 'object',
                  required: ['type'],
                  properties: {
                    type: { type: 'string', enum: ['string', 'number', 'boolean'] },
                    description: { type: 'string' },
                    default: {}
                  },
                  additionalProperties: true
                },
                { $ref: '#/$defs/structuredJsonSchema' }
              ]
            }
          },
          required: {
            type: 'array',
            items: NON_EMPTY_STRING
          },
          additionalProperties: { const: false },
          description: { type: 'string' },
          default: {}
        },
        additionalProperties: true
      },
      {
        type: 'object',
        required: ['type', 'items'],
        properties: {
          type: { const: 'array' },
          items: { $ref: '#/$defs/structuredJsonSchema' },
          description: { type: 'string' },
          default: { type: 'array' }
        },
        additionalProperties: true
      }
    ]
  }
}

function ifElseConditionSchema(): Record<string, any> {
  return {
    type: 'object',
    required: ['id', 'variable_selector', 'operator'],
    properties: {
      id: NON_EMPTY_STRING,
      variable_selector: { $ref: '#/$defs/selectorArray' },
      variable_path: { type: 'string' },
      variable_label: { type: 'string' },
      variable_type: { type: 'string', enum: Object.values(OFVarType) },
      operator: {
        type: 'string',
        enum: [
          'contains',
          'not_contains',
          'starts_with',
          'ends_with',
          'is',
          'is_not',
          'is_empty',
          'is_not_empty',
          'gt',
          'gte',
          'lt',
          'lte',
          'length_is',
          'length_gt',
          'length_gte',
          'length_lt',
          'length_lte'
        ]
      },
      value: {},
      value_type: {
        type: 'string',
        enum: [OFVarType.String, OFVarType.Number, OFVarType.Boolean]
      },
      compare_source_mode: { type: 'string', enum: ['constant', 'variable'] },
      compare_selector: { $ref: '#/$defs/selectorArray' },
      compare_path: { type: 'string' },
      compare_label: { type: 'string' },
      compare_type: { type: 'string', enum: Object.values(OFVarType) },
      logical_operator: { type: 'string', enum: ['and', 'or'] }
    },
    additionalProperties: false
  }
}

function variableAssignRuleSchema(): Record<string, any> {
  return {
    type: 'object',
    required: ['id', 'source_mode', 'target_variable', 'target_type'],
    properties: {
      id: NON_EMPTY_STRING,
      source_mode: { type: 'string', enum: ['variable', 'constant'] },
      source_selector: { $ref: '#/$defs/selectorArray' },
      source_path: { type: 'string' },
      source_label: { type: 'string' },
      source_type: { type: 'string', enum: Object.values(OFVarType) },
      constant_value: {},
      target_variable: NON_EMPTY_STRING,
      target_label: { type: 'string' },
      target_type: { type: 'string', enum: Object.values(OFVarType) },
      item_type: { type: 'string', enum: Object.values(OFVarType) },
      schema: { $ref: '#/$defs/structuredJsonSchema' },
      item_schema: { $ref: '#/$defs/structuredJsonSchema' },
      description: { type: 'string' }
    },
    additionalProperties: false
  }
}

function loopVariableSchema(): Record<string, any> {
  return {
    type: 'object',
    required: ['variable', 'value_type'],
    properties: {
      id: { type: 'string' },
      variable: NON_EMPTY_STRING,
      label: { type: 'string' },
      type: { type: 'string', enum: Object.values(OFVarType) },
      item_type: { type: 'string', enum: Object.values(OFVarType) },
      description: { type: 'string' },
      required: { type: 'boolean' },
      value_type: { type: 'string', enum: ['constant', 'variable'] },
      value: {},
      value_selector: { $ref: '#/$defs/selectorArray' },
      schema: { $ref: '#/$defs/structuredJsonSchema' },
      item_schema: { $ref: '#/$defs/structuredJsonSchema' }
    },
    additionalProperties: false
  }
}

function buildRunnableExampleWorkflow(): OFWorkflow {
  const workflow = compileAIDslToWorkflow(exampleDsl())
  const rootNodeMap = new Map(workflow.graph.nodes.map((node) => [node.id, node] as const))

  workflow.graph.edges = workflow.graph.edges.map((edge) =>
    normalizeExampleEdge(edge, rootNodeMap, {
      iterationId: undefined,
      defaultSourceHandle:
        rootNodeMap.get(edge.source)?.data.type === OFBlockEnum.IfElse ? undefined : 'source',
      defaultTargetHandle: 'target'
    })
  )

  workflow.graph.nodes = workflow.graph.nodes.map((node) => {
    if (node.data.type !== OFBlockEnum.Iteration && node.data.type !== OFBlockEnum.Loop) {
      return node
    }

    const subgraphNodeMap = new Map(node.data.subgraph.nodes.map((item) => [item.id, item] as const))
    const startNodeId = node.data.start_node_id
    const firstChild = node.data.subgraph.nodes.find((item) => item.id !== startNodeId)
    const subgraphEdges =
      firstChild && startNodeId
        ? [
            normalizeExampleEdge(
              {
                id: `edge_${startNodeId}_${firstChild.id}`,
                source: startNodeId,
                target: firstChild.id,
                sourceHandle: 'source',
                targetHandle: 'target'
              },
              subgraphNodeMap,
              {
                iterationId: node.id,
                defaultSourceHandle: 'source',
                defaultTargetHandle: 'target'
              }
            )
          ]
        : []

    return {
      ...node,
      data: {
        ...node.data,
        subgraph: {
          ...node.data.subgraph,
          edges: subgraphEdges
        }
      }
    }
  })

  return workflow
}

function normalizeExampleEdge(
  edge: OFEdge,
  nodeMap: Map<string, OFNode>,
  params: {
    iterationId?: string
    defaultSourceHandle?: string
    defaultTargetHandle: string
  }
): OFEdge {
  const sourceNode = nodeMap.get(edge.source)
  const targetNode = nodeMap.get(edge.target)
  const sourceType = sourceNode?.data.type
  const targetType = targetNode?.data.type

  if (sourceType === OFBlockEnum.IfElse && !edge.sourceHandle) {
    throw new Error(`IfElse example edge must declare sourceHandle: ${edge.id}`)
  }

  return {
    ...edge,
    sourceHandle: edge.sourceHandle || params.defaultSourceHandle || 'source',
    targetHandle: edge.targetHandle || params.defaultTargetHandle,
    class: params.iterationId ? 'of-edge-iteration' : edge.class,
    zIndex: params.iterationId ? 7 : edge.zIndex,
    data: {
      ...edge.data,
      isInIteration: Boolean(params.iterationId),
      iterationId: params.iterationId,
      sourceType,
      targetType
    }
  }
}

function buildAnnotatedWorkflowJsonc(example: OFWorkflow): string {
  const prettyJson = JSON.stringify(example, null, 2)
  const withGraphComment = replaceFirst(
    prettyJson,
    '  "graph": {',
    '  // 顶层 graph 只能放根节点和根边。不要把容器内部节点直接塞到根图里。\\n  "graph": {'
  )
  const withRootEdgeComment = replaceFirst(
    withGraphComment,
    '    "edges": [',
    '    // 根图边规则：普通边必须显式写 sourceHandle:\"source\"、targetHandle:\"target\"。\\n    // IfElse 出边的 sourceHandle 必须等于 case.handleId 或 elseCase.handleId。\\n    "edges": ['
  )
  const withSubgraphComment = withRootEdgeComment.replace(
    /(\\s+)\"subgraph\": \\{/g,
    '$1// 容器子图规则：必须保留内部 start 节点，且子图节点必须带 parentNode 与 extent:\"parent\"。\\n$1// subgraph.edges 为空只表示确实没有连接，不能用 null handle 代替“未连接”。\\n$1\"subgraph\": {'
  )

  return [
    '// OrchestraFlow 可运行工作流 JSONC 模板',
    '// 固定枚举字段：',
    '// - status: draft | published | archived',
    '// - node.type: start | llm | ifelse | iteration | iteration-start | loop | loop-start | variable-assign | end',
    '// - prompt_template[*].role: system | user | assistant',
    '// - ifelse.cases[*].kind: if | elif',
    '// - parallel_mode: sequential | parallel',
    '// - error_handle_mode: terminated | continue-on-error | remove-abnormal-output',
    '// - logical_operator: and | or',
    '// - variable.type / item_type: string | number | boolean | object | array',
    '// - loop_variables[*].value_type: constant | variable',
    '// - variable-assign.rules[*].source_mode: variable | constant',
    '// selector 规则：',
    '// - 所有 selector 一律写 string[]，不要写点字符串',
    '// - value_selector / iterator_selector / output_selector 至少 1 段',
    withSubgraphComment
  ].join('\n')
}

function replaceFirst(source: string, search: string, replacement: string): string {
  const index = source.indexOf(search)
  if (index === -1) return source
  return `${source.slice(0, index)}${replacement}${source.slice(index + search.length)}`
}

function exampleDsl(): OFAIDslWorkflow {
  return {
    version: '1.0',
    workflow: {
      name: 'content_router_demo',
      description: 'Start -> IfElse -> Iteration / Loop -> VariableAssign -> End',
      author: 'schema-exporter'
    },
    nodes: [
      {
        id: 'start',
        type: OFBlockEnum.Start,
        title: 'start',
        config: {
          input: {
            variables: [
              { variable: 'query', label: 'query', type: OFVarType.String, required: true },
              {
                variable: 'items',
                label: 'items',
                type: OFVarType.Array,
                required: true,
                item_schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    content: { type: 'string' }
                  },
                  required: ['title', 'content'],
                  additionalProperties: false
                }
              }
            ]
          }
        }
      },
      {
        id: 'branch',
        type: OFBlockEnum.IfElse,
        title: 'branch',
        config: {
          cases: [
            {
              id: 'route_iteration',
              kind: 'if',
              label: 'Use Iteration',
              handleId: 'if_iteration',
              conditions: [
                {
                  id: 'cond_true',
                  variable_selector: ['query'],
                  operator: 'contains',
                  value: 'batch',
                  value_type: OFVarType.String
                }
              ]
            }
          ],
          elseCase: { handleId: 'else', label: 'Fallback Loop' }
        }
      },
      {
        id: 'iterate_items',
        type: OFBlockEnum.Iteration,
        title: 'iterate_items',
        config: {
          iterator_selector: ['items'],
          output_selector: ['summarize_item', 'llmoutput'],
          parallel_mode: 'sequential',
          parallel_nums: 1,
          error_handle_mode: 'terminated',
          flatten_output: true
        },
        subgraph: {
          nodes: [
            {
              id: 'summarize_item',
              type: OFBlockEnum.LLM,
              title: 'summarize_item',
              config: {
                model: { provider: 'openai', name: 'gpt-4o-mini' },
                prompt_template: [
                  {
                    id: 'iter_user',
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
        id: 'counter_loop',
        type: OFBlockEnum.Loop,
        title: 'counter_loop',
        config: {
          loop_count: 3,
          loop_variables: [
            {
              variable: 'counter',
              label: 'counter',
              type: OFVarType.Number,
              value_type: 'constant',
              value: 0
            }
          ],
          break_conditions: [],
          logical_operator: 'and'
        },
        subgraph: {
          nodes: [
            {
              id: 'sync_counter',
              type: OFBlockEnum.VariableAssign,
              title: 'sync_counter',
              config: {
                rules: [
                  {
                    id: 'assign_counter',
                    source_mode: 'variable',
                    source_selector: ['counter_loop', 'index'],
                    source_path: 'counter_loop.index',
                    target_variable: 'counter',
                    target_label: 'counter',
                    target_type: OFVarType.Number
                  }
                ]
              }
            }
          ],
          edges: []
        }
      },
      {
        id: 'assign_final',
        type: OFBlockEnum.VariableAssign,
        title: 'assign_final',
        config: {
          rules: [
            {
              id: 'assign_summary',
              source_mode: 'variable',
              source_selector: ['iterate_items', 'result'],
              source_path: 'iterate_items.result',
              target_variable: 'final_summary',
              target_label: 'final_summary',
              target_type: OFVarType.Array
            }
          ]
        }
      },
      {
        id: 'end',
        type: OFBlockEnum.End,
        title: 'end',
        config: {
          output: {
            variables: [
              {
                variable: 'summary',
                label: 'summary',
                type: OFVarType.Array,
                value_selector: ['assign_final', 'final_summary']
              }
            ]
          }
        }
      }
    ],
    edges: [
      { from: { node: 'start', handle: 'source' }, to: { node: 'branch', handle: 'target' } },
      {
        from: { node: 'branch', handle: 'if_iteration' },
        to: { node: 'iterate_items', handle: 'target' }
      },
      {
        from: { node: 'branch', handle: 'else' },
        to: { node: 'counter_loop', handle: 'target' }
      },
      {
        from: { node: 'iterate_items', handle: 'source' },
        to: { node: 'assign_final', handle: 'target' }
      },
      {
        from: { node: 'counter_loop', handle: 'source' },
        to: { node: 'assign_final', handle: 'target' }
      },
      {
        from: { node: 'assign_final', handle: 'source' },
        to: { node: 'end', handle: 'target' }
      }
    ]
  }
}
