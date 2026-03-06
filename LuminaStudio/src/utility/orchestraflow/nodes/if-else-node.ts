import { BaseNode } from './base-node'
import {
  OFBlockEnum,
  type OFIfElseNodeData
} from '@shared/Orchestraflow-types'
import type { ExecutionContext, NodeResult } from './types'
import { VariableStore } from '../services/variable-store'
import { evaluateIfElseCase } from './condition-evaluator'

export class IfElseNode extends BaseNode {
  readonly nodeType: OFBlockEnum.IfElse

  constructor(node: any, variableStore: VariableStore) {
    super(node, variableStore)
    this.nodeType = OFBlockEnum.IfElse
  }

  async execute(context: ExecutionContext): Promise<NodeResult> {
    this.setContext(context)
    const nodeData = this.getNodeData() as OFIfElseNodeData

    let matchedHandleId = nodeData.elseCase.handleId
    let matchedLabel = nodeData.elseCase.label
    const caseEvaluations = nodeData.cases.map((item) => {
      const passed = evaluateIfElseCase(this.variableStore, item)
      if (passed && matchedHandleId === nodeData.elseCase.handleId) {
        matchedHandleId = item.handleId
        matchedLabel = item.label
      }
      return {
        caseId: item.id,
        handleId: item.handleId,
        label: item.label,
        passed
      }
    })

    return {
      outputs: {
        matchedHandleId,
        matchedLabel,
        caseEvaluations
      },
      control: {
        selectedSourceHandleIds: [matchedHandleId]
      }
    }
  }
}
