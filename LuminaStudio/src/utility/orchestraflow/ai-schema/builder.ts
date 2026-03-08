/**
 * 可运行工作流 bundle 导出器。
 *
 * 代码即文档：
 * - 导出的 schema 面向工作流目录中的最终 OFWorkflow JSON。
 * - 只要 AI 遵循这份 bundle 生成内容，结果就应能直接落盘到 OrchestraFlow 存储目录。
 * - 内部辅助 DSL 只是实现细节，不应泄漏成对外契约。
 *
 * 长期规则：
 * - 这里优先记录稳定的编写约束，而不是易变的 UI 或临时实现细节。
 */
import type { OFAISchemaBundle, OFAISchemaNodeSummary, OFAIDslWorkflow, OFWorkflow } from '@shared/Orchestraflow-types'
import { OFBlockEnum, OFVarType } from '@shared/Orchestraflow-types'
import { getOFRuntimeNodeDescriptors } from './registry'
import { compileAIDslToWorkflow } from './compiler'

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
    '```'
  ].join('\n')

  return {
    version: '1.0',
    format: 'orchestraflow-runnable-workflow',
    generated_at: generatedAt,
    nodes,
    schema,
    example,
    prompt_markdown: promptMarkdown,
    bundled_markdown: bundledMarkdown
  }
}

function buildPromptMarkdown(nodeSummaries: OFAISchemaNodeSummary[], example: OFWorkflow): string {
  return [
    '## 目标',
    '- 让 AI 直接输出最终可运行的 `OFWorkflow` JSON。',
    '- 生成结果需要能直接作为 `*.json` 工作流文件放进 OrchestraFlow 工作流目录。',
    '',
    '## 强约束',
    '- 不要输出中间 DSL；直接输出和示例同形状的 runnable workflow JSON。',
    '- 必须包含顶层字段：`id`、`name`、`author`、`createdAt`、`updatedAt`、`status`、`graph`。',
    '- `graph.nodes[*]` 必须是当前运行时可识别的真实节点，包括容器内部的 `iteration-start` / `loop-start`。',
    '- `graph.edges[*]` 必须使用真实 node id，分支边必须带正确的 `sourceHandle`。',
    '- `llm`、`iteration`、`loop`、`variable-assign` 节点的 `output.variables` 不能省略。',
    '- `selector` 使用当前运行时格式，即 `string[]`，例如 `["classify", "structured_output", "summary"]`。',
    '- 如果无法确定某字段，优先参考 runnable example 的结构，而不是自行发明新字段。',
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
    description:
      '最终持久化工作流 JSON。AI 只要遵循这份 schema 输出结果，就可以直接写入 OrchestraFlow 工作流目录。',
    type: 'object',
    required: ['id', 'name', 'author', 'createdAt', 'updatedAt', 'status', 'graph'],
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      description: { type: 'string' },
      author: { type: 'string' },
      createdAt: { type: 'number' },
      updatedAt: { type: 'number' },
      status: { type: 'string', enum: ['draft', 'published', 'archived'] },
      graph: { $ref: '#/$defs/workflowGraph' }
    },
    additionalProperties: false,
    $defs: {
      workflowGraph: workflowGraphSchema(),
      subWorkflowGraph: subWorkflowGraphSchema(),
      node: nodeSchema(),
      edge: edgeSchema(),
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
      nodes: { type: 'array', items: { $ref: '#/$defs/node' } },
      edges: { type: 'array', items: { $ref: '#/$defs/edge' } }
    },
    additionalProperties: false
  }
}

function subWorkflowGraphSchema(): Record<string, any> {
  return {
    type: 'object',
    required: ['nodes', 'edges', 'viewport'],
    properties: {
      nodes: { type: 'array', items: { $ref: '#/$defs/node' } },
      edges: { type: 'array', items: { $ref: '#/$defs/edge' } },
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

function nodeSchema(): Record<string, any> {
  return {
    type: 'object',
    required: ['id', 'type', 'position', 'data'],
    properties: {
      id: { type: 'string' },
      type: {
        type: 'string',
        enum: Object.values(OFBlockEnum)
      },
      parentNode: { type: 'string' },
      extent: { type: 'string', enum: ['parent'] },
      position: {
        type: 'object',
        required: ['x', 'y'],
        properties: {
          x: { type: 'number' },
          y: { type: 'number' }
        },
        additionalProperties: false
      },
      data: {
        type: 'object',
        required: ['type', 'title', 'desc'],
        properties: {
          type: { type: 'string', enum: Object.values(OFBlockEnum) },
          title: { type: 'string' },
          desc: { type: 'string' },
          width: { type: 'number' },
          height: { type: 'number' },
          input: {
            type: 'object',
            properties: {
              variables: { type: 'array', items: { $ref: '#/$defs/variable' } }
            },
            additionalProperties: true
          },
          output: {
            type: 'object',
            properties: {
              variables: { type: 'array', items: { $ref: '#/$defs/variable' } }
            },
            additionalProperties: true
          },
          model: { type: 'object', additionalProperties: true },
          prompt_template: { type: 'array', items: { $ref: '#/$defs/promptItem' } },
          structured_output: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
              schema: { $ref: '#/$defs/structuredJsonSchema' }
            },
            additionalProperties: true
          },
          cases: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                kind: { type: 'string', enum: ['if', 'elif'] },
                label: { type: 'string' },
                handleId: { type: 'string' },
                conditions: { type: 'array', items: { $ref: '#/$defs/ifElseCondition' } }
              },
              additionalProperties: true
            }
          },
          elseCase: { type: 'object', additionalProperties: true },
          iterator_selector: {
            type: 'array',
            items: { type: 'string' }
          },
          output_selector: {
            type: 'array',
            items: { type: 'string' }
          },
          branch_output_selectors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                source_node_id: { type: 'string' },
                source_handle_id: { type: 'string' },
                output_selector: { type: 'array', items: { type: 'string' } }
              },
              additionalProperties: false
            }
          },
          start_node_id: { type: 'string' },
          subgraph: { $ref: '#/$defs/subWorkflowGraph' },
          parallel_mode: { type: 'string', enum: ['sequential', 'parallel'] },
          parallel_nums: { type: 'number' },
          error_handle_mode: {
            type: 'string',
            enum: ['terminated', 'continue-on-error', 'remove-abnormal-output']
          },
          flatten_output: { type: 'boolean' },
          loop_count: { type: 'number' },
          loop_variables: { type: 'array', items: { $ref: '#/$defs/loopVariable' } },
          break_conditions: { type: 'array', items: { $ref: '#/$defs/ifElseCondition' } },
          logical_operator: { type: 'string', enum: ['and', 'or'] },
          rules: { type: 'array', items: { $ref: '#/$defs/variableAssignRule' } }
        },
        additionalProperties: true
      }
    },
    additionalProperties: false
  }
}

function edgeSchema(): Record<string, any> {
  return {
    type: 'object',
    required: ['id', 'source', 'target'],
    properties: {
      id: { type: 'string' },
      source: { type: 'string' },
      target: { type: 'string' },
      sourceHandle: { type: ['string', 'null'] },
      targetHandle: { type: ['string', 'null'] },
      class: { type: 'string' },
      zIndex: { type: 'number' },
      data: { type: 'object', additionalProperties: true }
    },
    additionalProperties: false
  }
}

function variableSchema(): Record<string, any> {
  return {
    type: 'object',
    required: ['variable'],
    properties: {
      variable: { type: 'string' },
      label: { type: 'string' },
      type: { type: 'string', enum: Object.values(OFVarType) },
      item_type: { type: 'string', enum: Object.values(OFVarType) },
      description: { type: 'string' },
      required: { type: 'boolean' },
      default: {},
      options: { type: 'array', items: { type: 'string' } },
      value_selector: { type: 'array', items: { type: 'string' } },
      schema: { $ref: '#/$defs/structuredJsonSchema' },
      item_schema: { $ref: '#/$defs/structuredJsonSchema' }
    },
    additionalProperties: true
  }
}

function promptItemSchema(): Record<string, any> {
  return {
    type: 'object',
    required: ['id', 'role', 'text'],
    properties: {
      id: { type: 'string' },
      role: { type: 'string', enum: ['system', 'user', 'assistant'] },
      text: { type: 'string' }
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
          required: { type: 'array', items: { type: 'string' } },
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
      id: { type: 'string' },
      variable_selector: { type: 'array', items: { type: 'string' } },
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
      value_type: { type: 'string', enum: [OFVarType.String, OFVarType.Number, OFVarType.Boolean] },
      compare_source_mode: { type: 'string', enum: ['constant', 'variable'] },
      compare_selector: { type: 'array', items: { type: 'string' } },
      logical_operator: { type: 'string', enum: ['and', 'or'] }
    },
    additionalProperties: true
  }
}

function variableAssignRuleSchema(): Record<string, any> {
  return {
    type: 'object',
    required: ['id', 'source_mode', 'target_variable', 'target_type'],
    properties: {
      id: { type: 'string' },
      source_mode: { type: 'string', enum: ['variable', 'constant'] },
      source_selector: { type: 'array', items: { type: 'string' } },
      source_path: { type: 'string' },
      constant_value: {},
      target_variable: { type: 'string' },
      target_label: { type: 'string' },
      target_type: { type: 'string', enum: Object.values(OFVarType) },
      item_type: { type: 'string', enum: Object.values(OFVarType) },
      schema: { $ref: '#/$defs/structuredJsonSchema' },
      item_schema: { $ref: '#/$defs/structuredJsonSchema' },
      description: { type: 'string' }
    },
    additionalProperties: true
  }
}

function loopVariableSchema(): Record<string, any> {
  return {
    type: 'object',
    required: ['variable', 'value_type'],
    properties: {
      variable: { type: 'string' },
      label: { type: 'string' },
      type: { type: 'string', enum: Object.values(OFVarType) },
      item_type: { type: 'string', enum: Object.values(OFVarType) },
      required: { type: 'boolean' },
      value_type: { type: 'string', enum: ['constant', 'variable'] },
      value: {},
      value_selector: { type: 'array', items: { type: 'string' } },
      schema: { $ref: '#/$defs/structuredJsonSchema' },
      item_schema: { $ref: '#/$defs/structuredJsonSchema' }
    },
    additionalProperties: true
  }
}

function buildRunnableExampleWorkflow(): OFWorkflow {
  return compileAIDslToWorkflow(exampleDsl())
}

function exampleDsl(): OFAIDslWorkflow {
  return {
    version: '1.0',
    workflow: {
      name: 'content_router_demo',
      description: 'Start -> LLM -> IfElse -> Iteration / Loop -> End',
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
        id: 'classify',
        type: OFBlockEnum.LLM,
        title: 'classify',
        config: {
          model: { provider: 'openai', name: 'gpt-4o-mini' },
          prompt_template: [
            { id: 'sys', role: 'system', text: '判断请求应该走迭代还是循环。' },
            { id: 'user', role: 'user', text: 'query={{query}}' }
          ],
          structured_output: {
            enabled: true,
            schema: {
              type: 'object',
              properties: {
                use_iteration: { type: 'boolean' },
                summary: { type: 'string' }
              },
              required: ['use_iteration', 'summary'],
              additionalProperties: false
            }
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
                  variable_selector: 'classify.structured_output.use_iteration',
                  operator: 'is',
                  value: true,
                  value_type: OFVarType.Boolean
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
          iterator_selector: 'items',
          output_selector: 'summarize_item.llmoutput',
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
                    source_selector: 'counter_loop.index',
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
              source_selector: 'classify.structured_output.summary',
              source_path: 'classify.structured_output.summary',
              target_variable: 'final_summary',
              target_label: 'final_summary',
              target_type: OFVarType.String
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
                type: OFVarType.String,
                value_selector: 'assign_final.final_summary'
              },
              {
                variable: 'iteration_result',
                label: 'iteration_result',
                type: OFVarType.Array,
                value_selector: 'iterate_items.result'
              },
              {
                variable: 'loop_counter',
                label: 'loop_counter',
                type: OFVarType.Number,
                value_selector: 'counter_loop.counter'
              }
            ]
          }
        }
      }
    ],
    edges: [
      { from: { node: 'start' }, to: { node: 'classify' } },
      { from: { node: 'classify' }, to: { node: 'branch' } },
      { from: { node: 'branch', handle: 'if_iteration' }, to: { node: 'iterate_items' } },
      { from: { node: 'branch', handle: 'else' }, to: { node: 'counter_loop' } },
      { from: { node: 'iterate_items' }, to: { node: 'assign_final' } },
      { from: { node: 'counter_loop' }, to: { node: 'assign_final' } },
      { from: { node: 'assign_final' }, to: { node: 'end' } }
    ]
  }
}
