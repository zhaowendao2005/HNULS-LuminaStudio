import { OFVarType } from '@shared/Orchestraflow-types'

export interface OFValueConversionParams {
  targetType: OFVarType
  targetVariable: string
  sourcePath?: string
}

function buildErrorPrefix(params: OFValueConversionParams): string {
  const target = params.targetVariable || 'variable'
  const source = params.sourcePath ? ` from "${params.sourcePath}"` : ''
  return `Failed to convert${source} to ${target} (${params.targetType})`
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toBooleanFromString(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  if (!normalized || ['0', 'false', 'no', 'off', 'null', 'undefined'].includes(normalized)) {
    return false
  }
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true
  }
  return true
}

function parseJsonValue(value: string, params: OFValueConversionParams): unknown {
  try {
    return JSON.parse(value)
  } catch {
    throw new Error(`${buildErrorPrefix(params)}: invalid JSON`)
  }
}

export function convertValue(value: unknown, params: OFValueConversionParams): unknown {
  switch (params.targetType) {
    case OFVarType.String:
      if (Array.isArray(value) || isPlainObject(value)) {
        try {
          return JSON.stringify(value)
        } catch {
          throw new Error(`${buildErrorPrefix(params)}: value is not JSON serializable`)
        }
      }
      return String(value)

    case OFVarType.Number: {
      if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
          throw new Error(`${buildErrorPrefix(params)}: number is not finite`)
        }
        return value
      }
      if (typeof value === 'boolean') {
        return value ? 1 : 0
      }
      if (typeof value === 'string') {
        const parsed = Number(value.trim())
        if (!Number.isFinite(parsed)) {
          throw new Error(`${buildErrorPrefix(params)}: string is not a finite number`)
        }
        return parsed
      }
      throw new Error(`${buildErrorPrefix(params)}: only string/number/boolean are supported`)
    }

    case OFVarType.Boolean:
      if (typeof value === 'boolean') {
        return value
      }
      if (typeof value === 'number') {
        if (Number.isNaN(value)) return false
        return value !== 0
      }
      if (typeof value === 'string') {
        return toBooleanFromString(value)
      }
      throw new Error(`${buildErrorPrefix(params)}: only string/number/boolean are supported`)

    case OFVarType.Object: {
      if (isPlainObject(value)) {
        return value
      }
      if (typeof value === 'string') {
        const parsed = parseJsonValue(value, params)
        if (!isPlainObject(parsed)) {
          throw new Error(`${buildErrorPrefix(params)}: JSON root must be an object`)
        }
        return parsed
      }
      throw new Error(`${buildErrorPrefix(params)}: only object or JSON string are supported`)
    }

    case OFVarType.Array: {
      if (Array.isArray(value)) {
        return value
      }
      if (typeof value === 'string') {
        const parsed = parseJsonValue(value, params)
        if (!Array.isArray(parsed)) {
          throw new Error(`${buildErrorPrefix(params)}: JSON root must be an array`)
        }
        return parsed
      }
      throw new Error(`${buildErrorPrefix(params)}: only array or JSON string are supported`)
    }

    default:
      return value
  }
}
