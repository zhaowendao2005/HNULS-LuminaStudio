import { describe, expect, it } from 'vitest'
import {
  OFBlockEnum,
  OFNodeRunningStatus,
  type OFNode,
  type OFWorkflow
} from '@shared/Orchestraflow-types'
import { WorkflowInstanceManager } from '../manager/workflow-instance-manager'
import { GraphExecutor } from './graph-executor'
import { VariableStore } from './variable-store'

function createWorkflow(): OFWorkflow {
  const childStart: OFNode = {
    id: 'child-start',
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      type: OFBlockEnum.IterationStart,
      title: 'Iteration Start',
      desc: ''
    }
  } as OFNode

  const childBranch: OFNode = {
    id: 'child-branch',
    type: 'default',
    position: { x: 100, y: 0 },
    data: {
      type: OFBlockEnum.IfElse,
      title: 'Child Branch',
      desc: '',
      cases: [
        {
          id: 'case-1',
          kind: 'if',
          label: 'gt-zero',
          handleId: 'if',
          conditions: [
            {
              id: 'cond-1',
              variable_selector: ['loop.index'],
              variable_type: 'number',
              operator: 'gt',
              value: 0
            }
          ]
        }
      ],
      elseCase: {
        handleId: 'else',
        label: 'else'
      }
    }
  } as OFNode

  const childEnd: OFNode = {
    id: 'child-end',
    type: 'default',
    position: { x: 220, y: 0 },
    data: {
      type: OFBlockEnum.End,
      title: 'Child End',
      desc: '',
      output: {
        variables: [
          {
            variable: 'result',
            value_ref: {
              selector: ['loop.item'],
              path: 'loop.item'
            }
          }
        ]
      }
    }
  } as OFNode

  const startNode: OFNode = {
    id: 'start',
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      type: OFBlockEnum.Start,
      title: 'Start',
      desc: '',
      input: {
        variables: [
          {
            variable: 'items',
            type: 'array',
            schema: {
              type: 'array',
              items: {
                type: 'string'
              },
              default: ['alpha', 'beta', 'gamma']
            }
          }
        ]
      }
    }
  } as OFNode

  const iterationNode: OFNode = {
    id: 'iter1',
    type: 'default',
    position: { x: 100, y: 0 },
    data: {
      type: OFBlockEnum.Iteration,
      title: 'Loop',
      desc: '',
      iterator_selector: ['items'],
      output_selector: ['loop.item'],
      start_node_id: 'child-start',
      subgraph: {
        nodes: [childStart, childBranch, childEnd],
        edges: [
          {
            id: 'child-edge-1',
            source: 'child-start',
            target: 'child-branch'
          },
          {
            id: 'child-edge-2-if',
            source: 'child-branch',
            sourceHandle: 'if',
            target: 'child-end'
          },
          {
            id: 'child-edge-2-else',
            source: 'child-branch',
            sourceHandle: 'else',
            target: 'child-end'
          }
        ]
      },
      parallel_mode: 'parallel',
      parallel_nums: 2,
      error_handle_mode: 'terminated',
      flatten_output: false
    }
  } as OFNode

  const endNode: OFNode = {
    id: 'end',
    type: 'default',
    position: { x: 200, y: 0 },
    data: {
      type: OFBlockEnum.End,
      title: 'End',
      desc: '',
      output: {
        variables: [
          {
            variable: 'result',
            value_ref: {
              selector: ['iter1.result'],
              path: 'iter1.result'
            }
          }
        ]
      }
    }
  } as OFNode

  return {
    id: 'wf-1',
    name: 'workflow',
    author: 'tester',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'draft',
    graph: {
      nodes: [startNode, iterationNode, endNode],
      edges: [
        { id: 'edge-1', source: 'start', target: 'iter1' },
        { id: 'edge-2', source: 'iter1', target: 'end' }
      ]
    }
  }
}

function createLoopWorkflow(): OFWorkflow {
  const loopStart: OFNode = {
    id: 'loop-child-start',
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      type: OFBlockEnum.LoopStart,
      title: 'Loop Start',
      desc: ''
    }
  } as OFNode

  const loopEnd: OFNode = {
    id: 'loop-child-end',
    type: 'default',
    position: { x: 120, y: 0 },
    data: {
      type: OFBlockEnum.End,
      title: 'Loop Child End',
      desc: '',
      output: {
        variables: [
          {
            variable: 'counter',
            value_ref: {
              selector: ['counter'],
              path: 'counter'
            }
          }
        ]
      }
    }
  } as OFNode

  const startNode: OFNode = {
    id: 'start',
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      type: OFBlockEnum.Start,
      title: 'Start',
      desc: '',
      input: {
        variables: [
          {
            variable: 'seed',
            type: 'number',
            schema: {
              type: 'number',
              default: 1
            }
          }
        ]
      }
    }
  } as OFNode

  const loopNode: OFNode = {
    id: 'loop1',
    type: 'default',
    position: { x: 120, y: 0 },
    data: {
      type: OFBlockEnum.Loop,
      title: 'Loop',
      desc: '',
      loop_count: 2,
      loop_variables: [
        {
          variable: 'counter',
          type: 'number',
          value_type: 'variable',
          value_source: {
            mode: 'variable',
            ref: {
              selector: ['seed'],
              path: 'seed'
            }
          }
        }
      ],
      break_conditions: [],
      logical_operator: 'and',
      start_node_id: 'loop-child-start',
      subgraph: {
        nodes: [loopStart, loopEnd],
        edges: [
          {
            id: 'loop-edge-1',
            source: 'loop-child-start',
            target: 'loop-child-end'
          }
        ]
      },
      output: {
        variables: []
      }
    }
  } as OFNode

  const endNode: OFNode = {
    id: 'end',
    type: 'default',
    position: { x: 240, y: 0 },
    data: {
      type: OFBlockEnum.End,
      title: 'End',
      desc: '',
      output: {
        variables: [
          {
            variable: 'result',
            value_ref: {
              selector: ['loop1.result'],
              path: 'loop1.result'
            }
          }
        ]
      }
    }
  } as OFNode

  return {
    id: 'wf-loop',
    name: 'loop-workflow',
    author: 'tester',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'draft',
    graph: {
      nodes: [startNode, loopNode, endNode],
      edges: [
        { id: 'edge-1', source: 'start', target: 'loop1' },
        { id: 'edge-2', source: 'loop1', target: 'end' }
      ]
    }
  }
}

function createVariableAssignDebugWorkflow(): OFWorkflow {
  const startNode: OFNode = {
    id: 'start',
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      type: OFBlockEnum.Start,
      title: 'Start',
      desc: '',
      input: {
        variables: [
          {
            variable: 'profile',
            type: 'object',
            schema: {
              type: 'object',
              properties: {
                stats: {
                  type: 'object',
                  properties: {
                    score: {
                      type: 'number',
                      default: 12
                    }
                  },
                  required: ['score'],
                  additionalProperties: false
                }
              },
              required: ['stats'],
              additionalProperties: false
            }
          }
        ]
      }
    }
  } as OFNode

  const assignNode: OFNode = {
    id: 'assign-node',
    type: 'variable-assign',
    position: { x: 120, y: 0 },
    data: {
      type: OFBlockEnum.VariableAssign,
      title: 'assign',
      desc: '',
      rules: [
        {
          id: 'rule-1',
          source: {
            mode: 'variable',
            ref: {
              selector: ['profile', 'stats', 'score'],
              path: 'profile.stats.score'
            }
          },
          source_mode: 'variable',
          target_variable: 'score_text',
          target_type: 'string'
        }
      ],
      output: {
        variables: []
      }
    }
  } as OFNode

  const endNode: OFNode = {
    id: 'end',
    type: 'default',
    position: { x: 240, y: 0 },
    data: {
      type: OFBlockEnum.End,
      title: 'End',
      desc: '',
      output: {
        variables: [
          {
            variable: 'result',
            value_ref: {
              selector: ['assign.score_text'],
              path: 'assign.score_text'
            }
          }
        ]
      }
    }
  } as OFNode

  return {
    id: 'wf-assign',
    name: 'assign-workflow',
    author: 'tester',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'draft',
    graph: {
      nodes: [startNode, assignNode, endNode],
      edges: [
        { id: 'edge-1', source: 'start', target: 'assign-node' },
        { id: 'edge-2', source: 'assign-node', target: 'end' }
      ]
    }
  }
}

describe('GraphExecutor integration', () => {
  it('根图和 Iteration 子图共用执行内核，并产出带 execution_metadata 的 child traces', async () => {
    const workflow = createWorkflow()
    const variableStore = new VariableStore()
    const progress: string[] = []
    const executor = new GraphExecutor({
      runId: 'run-1',
      workflowId: workflow.id,
      providerConfigs: {},
      emitProgress: (trace) => progress.push(`${trace.nodeId}:${trace.status}`),
      isStopped: () => false
    })

    const result = await executor.executeGraph({
      graph: workflow.graph,
      variableStore,
      initialInputs: {},
      scopePath: []
    })

    expect(result.status).toBe('succeeded')
    expect(result.outputs).toEqual({ result: ['alpha', 'beta', 'gamma'] })
    expect(progress.length).toBeGreaterThan(0)

    const tracing = executor.getTracing()
    const childStartTraces = tracing.filter((item) => item.nodeId === 'child-start')
    const childBranchTraces = tracing.filter((item) => item.nodeId === 'child-branch')

    expect(childStartTraces).toHaveLength(3)
    expect(childBranchTraces).toHaveLength(3)
    expect(
      childBranchTraces.every(
        (item) =>
          item.scope_path?.[0] === 'iter1' &&
          item.execution_metadata?.in_iteration_id &&
          item.execution_metadata?.iteration_length === 3
      )
    ).toBe(true)
  })

  it('node debug 传入子图 scopePath 时会成功执行子图节点', async () => {
    const workflow = createWorkflow()
    const manager = new WorkflowInstanceManager(() => undefined)

    const result = await manager.runNodeDebug(
      workflow,
      'child-branch',
      {
        'loop.index': 1
      },
      {},
      ['iter1']
    )

    expect(result.status).toBe(OFNodeRunningStatus.Succeeded)
    expect(result.nodeId).toBe('child-branch')
    expect(result.nodeType).toBe(OFBlockEnum.IfElse)
    expect(result.error).toBeUndefined()
  })

  it('node debug 传入非法 scopePath 时会稳定失败', async () => {
    const workflow = createWorkflow()
    const manager = new WorkflowInstanceManager(() => undefined)

    const result = await manager.runNodeDebug(workflow, 'child-branch', {}, {}, ['missing-scope'])

    expect(result.status).toBe(OFNodeRunningStatus.Failed)
    expect(result.error).toContain('Scope node not found')
  })

  it('node debug 在 scopePath 下找不到目标节点时会稳定失败', async () => {
    const workflow = createWorkflow()
    const manager = new WorkflowInstanceManager(() => undefined)

    const result = await manager.runNodeDebug(workflow, 'missing-node', {}, {}, ['iter1'])

    expect(result.status).toBe(OFNodeRunningStatus.Failed)
    expect(result.error).toContain('Node not found')
  })

  it('node debug 支持执行 VariableAssign 节点并返回转换结果', async () => {
    const workflow = createVariableAssignDebugWorkflow()
    const manager = new WorkflowInstanceManager(() => undefined)

    const result = await manager.runNodeDebug(
      workflow,
      'assign-node',
      {
        profile: {
          stats: {
            score: 27
          }
        }
      },
      {}
    )

    expect(result.status).toBe(OFNodeRunningStatus.Succeeded)
    expect(result.nodeType).toBe(OFBlockEnum.VariableAssign)
    expect(result.outputs).toEqual({ score_text: '27' })
    expect(result.error).toBeUndefined()
  })

  it('根图和 Loop 子图共用执行内核，并产出带 loop metadata 的 child traces', async () => {
    const workflow = createLoopWorkflow()
    const variableStore = new VariableStore()
    const executor = new GraphExecutor({
      runId: 'run-loop',
      workflowId: workflow.id,
      providerConfigs: {},
      emitProgress: () => undefined,
      isStopped: () => false
    })

    const result = await executor.executeGraph({
      graph: workflow.graph,
      variableStore,
      initialInputs: {},
      scopePath: []
    })

    expect(result.status).toBe('succeeded')
    expect(result.outputs).toEqual({ result: { counter: 1 } })

    const tracing = executor.getTracing()
    const childStartTraces = tracing.filter((item) => item.nodeId === 'loop-child-start')
    const childEndTraces = tracing.filter((item) => item.nodeId === 'loop-child-end')

    expect(childStartTraces).toHaveLength(2)
    expect(childEndTraces).toHaveLength(2)
    expect(new Set(childStartTraces.map((item) => item.trace_key)).size).toBe(2)
    expect(
      childEndTraces.every(
        (item) =>
          item.scope_path?.[0] === 'loop1' &&
          item.execution_metadata?.in_loop_id &&
          item.execution_metadata?.loop_count === 2
      )
    ).toBe(true)
  })
})
