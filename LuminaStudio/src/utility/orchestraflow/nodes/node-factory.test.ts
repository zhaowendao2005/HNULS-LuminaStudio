import { describe, expect, it } from 'vitest'
import { OFBlockEnum, type OFNode } from '@shared/Orchestraflow-types'
import { IterationNode } from './iteration-node'
import { NodeFactory } from './node-factory'
import { VariableStore } from '../services/variable-store'

describe('NodeFactory', () => {
  it('会为 Iteration 节点实例化真实 IterationNode', () => {
    const node: OFNode = {
      id: 'iter1',
      type: 'default',
      position: { x: 0, y: 0 },
      data: {
        type: OFBlockEnum.Iteration,
        title: 'Loop',
        desc: '',
        iterator_selector: ['items'],
        output_selector: ['loop.item'],
        start_node_id: 'child-start',
        subgraph: {
          nodes: [
            {
              id: 'child-start',
              type: 'default',
              position: { x: 0, y: 0 },
              data: {
                type: OFBlockEnum.IterationStart,
                title: 'Iteration Start',
                desc: ''
              }
            } as OFNode
          ],
          edges: []
        },
        parallel_mode: 'sequential',
        parallel_nums: 1,
        error_handle_mode: 'terminated',
        flatten_output: false,
        output: {
          variables: []
        }
      }
    } as OFNode

    const instance = NodeFactory.createNode(node, new VariableStore())

    expect(instance).toBeInstanceOf(IterationNode)
  })
})
