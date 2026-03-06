import { BaseNode } from './base-node'
import { OFBlockEnum } from '@shared/Orchestraflow-types'
import type { ExecutionContext, NodeResult } from './types'
import { VariableStore } from '../services/variable-store'

export class IterationStartNode extends BaseNode {
  readonly nodeType: OFBlockEnum.IterationStart

  constructor(node: any, variableStore: VariableStore) {
    super(node, variableStore)
    this.nodeType = OFBlockEnum.IterationStart
  }

  async execute(context: ExecutionContext): Promise<NodeResult> {
    this.setContext(context)

    if (!context.iterationContext) {
      return {
        outputs: {},
        error: 'IterationStart 节点只能在 Iteration 子图中执行'
      }
    }

    return {
      outputs: {
        item: context.iterationContext.item,
        index: context.iterationContext.index
      }
    }
  }
}
