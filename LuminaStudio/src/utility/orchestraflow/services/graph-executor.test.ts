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
            default: ['alpha', 'beta', 'gamma']
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
        nodes: [childStart, childBranch],
        edges: [
          {
            id: 'child-edge-1',
            source: 'child-start',
            target: 'child-branch'
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
            value_selector: ['iter1.result']
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

  it('node debug 传入子图 scopePath 时会返回 v1 not supported', async () => {
    const workflow = createWorkflow()
    const manager = new WorkflowInstanceManager(() => undefined)

    const result = await manager.runNodeDebug(workflow, 'child-branch', {}, {}, ['iter1'])

    expect(result.status).toBe(OFNodeRunningStatus.Failed)
    expect(result.error).toContain('not supported')
  })
})
