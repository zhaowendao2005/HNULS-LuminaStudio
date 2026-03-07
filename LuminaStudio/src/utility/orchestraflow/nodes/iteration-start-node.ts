import { BaseNode } from './base-node'
import {
  OFBlockEnum,
  OF_ITERATION_INDEX_VARIABLE_NAME,
  OF_ITERATION_ITEM_VARIABLE_NAME,
  OF_ITERATION_LENGTH_VARIABLE_NAME
} from '@shared/Orchestraflow-types'
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
        [OF_ITERATION_ITEM_VARIABLE_NAME]: context.iterationContext.item,
        [OF_ITERATION_INDEX_VARIABLE_NAME]: context.iterationContext.index,
        [OF_ITERATION_LENGTH_VARIABLE_NAME]: context.iterationContext.iterationLength
      }
    }
  }
}
