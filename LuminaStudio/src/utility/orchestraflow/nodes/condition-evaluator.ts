import {
  OFVarType,
  type OFIfElseCase,
  type OFIfElseCondition
} from '@shared/Orchestraflow-types'
import type { VariableStore } from '../services/variable-store'

export function evaluateIfElseCase(variableStore: VariableStore, item: OFIfElseCase): boolean {
  return evaluateConditions(variableStore, item.conditions)
}

export function evaluateConditions(
  variableStore: VariableStore,
  conditions: OFIfElseCondition[]
): boolean {
  if (!conditions.length) {
    return false
  }

  let result = evaluateCondition(variableStore, conditions[0])
  for (let i = 1; i < conditions.length; i += 1) {
    const current = conditions[i]
    const currentResult = evaluateCondition(variableStore, current)
    if (current.logical_operator === 'or') {
      result = result || currentResult
    } else {
      result = result && currentResult
    }
  }

  return result
}

export function evaluateCondition(
  variableStore: VariableStore,
  condition: OFIfElseCondition
): boolean {
  const actual = variableStore.getBySelector(condition.variable_selector || [])
  const expected =
    condition.compare_source_mode === 'variable'
      ? variableStore.getBySelector(condition.compare_selector || [])
      : condition.value

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
      return compareEqual(actual, expected, condition.variable_type)
    case 'is_not':
      return !compareEqual(actual, expected, condition.variable_type)
    case 'is_empty':
      return isEmptyValue(actual)
    case 'is_not_empty':
      return !isEmptyValue(actual)
    case 'gt':
      return Number(actual) > Number(expected)
    case 'gte':
      return Number(actual) >= Number(expected)
    case 'lt':
      return Number(actual) < Number(expected)
    case 'lte':
      return Number(actual) <= Number(expected)
    case 'length_is':
      return getArrayLength(actual) === Number(expected)
    case 'length_gt':
      return getArrayLength(actual) > Number(expected)
    case 'length_gte':
      return getArrayLength(actual) >= Number(expected)
    case 'length_lt':
      return getArrayLength(actual) < Number(expected)
    case 'length_lte':
      return getArrayLength(actual) <= Number(expected)
    default:
      return false
  }
}

function compareEqual(actual: unknown, expected: unknown, type?: OFVarType): boolean {
  if (type === OFVarType.Number) {
    return Number(actual) === Number(expected)
  }
  if (type === OFVarType.Boolean) {
    return Boolean(actual) === Boolean(expected)
  }
  return String(actual ?? '') === String(expected ?? '')
}

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length === 0
  return false
}

function getArrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0
}
