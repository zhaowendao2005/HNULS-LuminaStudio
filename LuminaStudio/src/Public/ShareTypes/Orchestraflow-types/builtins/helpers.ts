import type { OFNode } from '../core-types'

export function omitOFField<T extends Record<string, any>, K extends keyof T>(value: T, key: K): T {
  const { [key]: _omitted, ...rest } = value
  return rest as T
}

export function omitOFEmptySelector<T extends Record<string, any>, K extends keyof T>(
  value: T,
  key: K
): T {
  if (!Array.isArray(value[key]) || value[key].length > 0) {
    return value
  }
  return omitOFField(value, key)
}

export function omitOFNullSchemaFields<T extends Record<string, any>>(value: T): T {
  let nextValue = value
  if ('schema' in nextValue && nextValue.schema === null) {
    nextValue = omitOFField(nextValue, 'schema')
  }
  if ('item_schema' in nextValue && nextValue.item_schema === null) {
    nextValue = omitOFField(nextValue, 'item_schema')
  }
  return nextValue
}

export function cloneOFNodeForPrompt<T extends OFNode>(node: T): T {
  return JSON.parse(JSON.stringify(node)) as T
}
