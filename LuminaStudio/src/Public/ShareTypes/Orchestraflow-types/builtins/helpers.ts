import type { OFNode } from '../core-types'

export function omitOFField<T extends object, K extends keyof T>(value: T, key: K): T {
  const { [key]: _omitted, ...rest } = value as T & Record<string, unknown>
  return rest as T
}

export function omitOFEmptySelector<T extends object, K extends keyof T>(value: T, key: K): T {
  const fieldValue = (value as T & Record<string, unknown>)[key as string]
  if (!Array.isArray(fieldValue) || fieldValue.length > 0) {
    return value
  }
  return omitOFField(value, key)
}

export function omitOFNullSchemaFields<T extends object>(value: T): T {
  let nextValue = value
  if (
    'schema' in (nextValue as T & Record<string, unknown>) &&
    (nextValue as T & Record<string, unknown>).schema === null
  ) {
    nextValue = omitOFField(nextValue, 'schema' as keyof T)
  }
  if (
    'item_schema' in (nextValue as T & Record<string, unknown>) &&
    (nextValue as T & Record<string, unknown>).item_schema === null
  ) {
    nextValue = omitOFField(nextValue, 'item_schema' as keyof T)
  }
  return nextValue
}

export function cloneOFNodeForPrompt<T extends OFNode>(node: T): T {
  return JSON.parse(JSON.stringify(node)) as T
}
