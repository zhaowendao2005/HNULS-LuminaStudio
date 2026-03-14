import { describe, expect, it } from 'vitest'
import { OFBlockEnum, OFVarType, type OFNode } from '@shared/Orchestraflow-types'
import { StartNode } from './start-node'
import { VariableStore } from '../services/variable-store'

describe('StartNode', () => {
  it('falls back to shared schema defaults when inputs are omitted', async () => {
    const node: OFNode = {
      id: 'start',
      type: 'start',
      position: { x: 0, y: 0 },
      data: {
        type: OFBlockEnum.Start,
        title: '开始',
        desc: '',
        input: {
          variables: [
            {
              variable: 'task_list',
              label: '任务列表',
              type: OFVarType.Array,
              required: true,
              schema: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    task_name: {
                      type: 'string'
                    },
                    params: {
                      type: 'object',
                      properties: {
                        retry: {
                          type: 'boolean'
                        }
                      },
                      required: ['retry'],
                      additionalProperties: false
                    }
                  },
                  required: ['task_name', 'params'],
                  additionalProperties: false
                },
                default: [
                  {
                    task_name: '初始化任务',
                    params: {
                      retry: true
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    }

    const variableStore = new VariableStore()
    const startNode = new StartNode(node, variableStore)

    const result = await startNode.execute({
      runId: 'run-1',
      node,
      graph: { nodes: [node], edges: [] },
      inputs: {},
      variables: {},
      scopePath: [],
      traceKey: 'trace-1',
      providerConfigs: {},
      executeGraph: async () => ({ status: 'failed', error: 'not-used' }),
      isStopped: () => false
    })

    expect(result.outputs).toEqual({
      task_list: [
        {
          task_name: '初始化任务',
          params: {
            retry: true
          }
        }
      ]
    })
    expect(variableStore.get('task_list')).toEqual([
      {
        task_name: '初始化任务',
        params: {
          retry: true
        }
      }
    ])
  })
})
