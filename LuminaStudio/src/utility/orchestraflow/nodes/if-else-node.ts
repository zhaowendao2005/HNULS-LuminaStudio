import { BaseNode } from './base-node'
import {
  OFBlockEnum,
  OFVarType,
  type OFIfElseCase,
  type OFIfElseCondition,
  type OFIfElseNodeData
} from '@shared/Orchestraflow-types'
import type { ExecutionContext, NodeResult } from './types'
import { VariableStore } from '../services/variable-store'

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
      const passed = this.evaluateCase(item)
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

  private evaluateCase(item: OFIfElseCase): boolean {
    if (!item.conditions.length) {
      return false
    }

    let result = this.evaluateCondition(item.conditions[0])
    for (let i = 1; i < item.conditions.length; i += 1) {
      const current = item.conditions[i]
      const currentResult = this.evaluateCondition(current)
      if (current.logical_operator === 'or') {
        result = result || currentResult
      } else {
        result = result && currentResult
      }
    }

    return result
  }

  private evaluateCondition(condition: OFIfElseCondition): boolean {
    const actual = this.variableStore.getBySelector(condition.variable_selector || [])
    const expected = condition.value

    switch (condition.operator) {
      case 'contains':
        if (Array.isArray(actual)) return actual.includes(expected)
        return String(actual ?? '').includes(String(expected ?? ''))
      case 'not_contains':
        if (Array.isArray(actual)) return !actual.includes(expected)
        return !String(actual ?? '').includes(String(expected ?? ''))
      case 'starts_with':
        return String(actual ?? '').startsWith(String(expected ?? ''))
      case 'ends_with':
        return String(actual ?? '').endsWith(String(expected ?? ''))
      case 'is':
        return this.compareEqual(actual, expected, condition.variable_type)
      case 'is_not':
        return !this.compareEqual(actual, expected, condition.variable_type)
      case 'is_empty':
        return this.isEmptyValue(actual)
      case 'is_not_empty':
        return !this.isEmptyValue(actual)
      case 'gt':
        return Number(actual) > Number(expected)
      case 'gte':
        return Number(actual) >= Number(expected)
      case 'lt':
        return Number(actual) < Number(expected)
      case 'lte':
        return Number(actual) <= Number(expected)
      default:
        return false
    }
  }

  private compareEqual(actual: unknown, expected: unknown, type?: OFVarType): boolean {
    if (type === OFVarType.Number) {
      return Number(actual) === Number(expected)
    }
    if (type === OFVarType.Boolean) {
      return Boolean(actual) === Boolean(expected)
    }
    return String(actual ?? '') === String(expected ?? '')
  }

  private isEmptyValue(value: unknown): boolean {
    if (value === undefined || value === null) return true
    if (typeof value === 'string') return value.trim().length === 0
    if (Array.isArray(value)) return value.length === 0
    if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length === 0
    return false
  }
}
