import type { OFInputVar, OFJsonSchemaProperty } from './core-types'
import { OFVarType } from './core-types'

export function cloneOFDefaultValue<T>(value: T): T {
  if (value === null || value === undefined) return value

  try {
    return structuredClone(value)
  } catch {
    return JSON.parse(JSON.stringify(value)) as T
  }
}

export function buildOFDefaultValueFromSchemaProperty(schema: OFJsonSchemaProperty): unknown {
  if ('default' in schema && schema.default !== undefined) {
    return cloneOFDefaultValue(schema.default)
  }

  if (schema.type === 'array') {
    return []
  }

  if (schema.type === 'object') {
    const nextValue: Record<string, unknown> = {}
    Object.entries(schema.properties || {}).forEach(([key, childSchema]) => {
      const childDefault = buildOFDefaultValueFromSchemaProperty(childSchema)
      if (childDefault !== undefined) {
        nextValue[key] = childDefault
      }
    })
    return nextValue
  }

  return undefined
}

export function buildOFInputDefaultValue(inputVar: OFInputVar): unknown {
  if (inputVar.schema) {
    return buildOFDefaultValueFromSchemaProperty(inputVar.schema)
  }

  if (inputVar.type === OFVarType.Array) return []
  if (inputVar.type === OFVarType.Object) return {}

  return undefined
}
