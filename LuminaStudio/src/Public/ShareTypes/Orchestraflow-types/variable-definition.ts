import type {
  OFJsonSchemaObject,
  OFLoopVariableData,
  OFStructuredOutputConfig,
  OFStructuredJsonSchema,
  OFVariable,
  OFVariableAssignRule
} from './core-types'
import {
  normalizeOFVariableNamespace,
  OF_LLM_STRUCTURED_OUTPUT_NAME,
  OF_LLM_TEXT_OUTPUT_NAME,
  OF_ITERATION_INDEX_VARIABLE_NAME,
  OF_ITERATION_ITEM_VARIABLE_NAME,
  OF_ITERATION_LENGTH_VARIABLE_NAME,
  OF_ITERATION_RESULT_VARIABLE_NAME,
  OF_LOOP_COUNT_VARIABLE_NAME,
  OF_LOOP_INDEX_VARIABLE_NAME,
  OF_LOOP_RESULT_VARIABLE_NAME,
  OFVarType
} from './core-types'

export interface OFVariableDefinition<TParams> {
  id: string
  build(params: TParams): OFVariable[]
  notes_zh?: string[]
}

export function cloneOFValue<T>(value: T): T {
  if (value === undefined || value === null) {
    return value
  }

  try {
    return structuredClone(value)
  } catch {
    return JSON.parse(JSON.stringify(value)) as T
  }
}

export function cloneOFVariables(variables: OFVariable[]): OFVariable[] {
  return variables.map((item) => cloneOFValue(item))
}

export function ensureOFSelectableVariables(variables: OFVariable[]): OFVariable[] {
  return cloneOFVariables(
    variables.map((item) => ({
      ...item,
      value_ref:
        item.value_ref ||
        (item.value_selector?.length
          ? {
              selector: item.value_selector,
              path: item.value_selector.join('.'),
              label: item.label || item.variable,
              type: item.type,
              schema: item.schema || null,
              item_schema: item.item_schema || null
            }
          : {
              selector: [item.variable],
              path: item.variable,
              label: item.label || item.variable,
              type: item.type,
              schema: item.schema || null,
              item_schema: item.item_schema || null
            })
    }))
  )
}

export const startInputVariableDefinition: OFVariableDefinition<void> = {
  id: 'start-input-template',
  build: () => [],
  notes_zh: [
    '开始节点输入变量如果需要开箱即跑，应补安全的 default 预填值。',
    'object 类型默认值应写在 schema 内部字段，不要直接写变量级 default。',
    'array 类型默认值直接写真实 JSON 数组，不再维护数组 schema。'
  ]
}

export const llmOutputVariableDefinition: OFVariableDefinition<{
  namespace: string
  structuredOutput?: OFStructuredOutputConfig | null
}> = {
  id: 'llm-output',
  build: ({ namespace, structuredOutput }) => {
    const normalizedNamespace = normalizeOFVariableNamespace(namespace, 'llm')
    const variables: OFVariable[] = [
      {
        variable: OF_LLM_TEXT_OUTPUT_NAME,
        label: OF_LLM_TEXT_OUTPUT_NAME,
        type: OFVarType.String,
        required: true,
        value_ref: {
          selector: [`${normalizedNamespace}.${OF_LLM_TEXT_OUTPUT_NAME}`],
          path: `${normalizedNamespace}.${OF_LLM_TEXT_OUTPUT_NAME}`,
          label: OF_LLM_TEXT_OUTPUT_NAME,
          type: OFVarType.String
        }
      }
    ]

    if (structuredOutput?.enabled && structuredOutput.schema) {
      variables.push({
        variable: OF_LLM_STRUCTURED_OUTPUT_NAME,
        label: OF_LLM_STRUCTURED_OUTPUT_NAME,
        type: OFVarType.Object,
        required: true,
        value_ref: {
          selector: [`${normalizedNamespace}.${OF_LLM_STRUCTURED_OUTPUT_NAME}`],
          path: `${normalizedNamespace}.${OF_LLM_STRUCTURED_OUTPUT_NAME}`,
          label: OF_LLM_STRUCTURED_OUTPUT_NAME,
          type: OFVarType.Object,
          schema: structuredOutput.schema
        },
        schema: structuredOutput.schema
      })
    }

    return variables
  }
}

export const iterationInnerStartVariableDefinition: OFVariableDefinition<{
  namespace: string
  fallbackNodeId?: string
}> = {
  id: 'iteration-inner-start',
  build: ({ namespace, fallbackNodeId }) => {
    const resolvedNamespace = normalizeOFVariableNamespace(namespace, fallbackNodeId || 'iteration')
    return [
      {
        variable: OF_ITERATION_ITEM_VARIABLE_NAME,
        label: OF_ITERATION_ITEM_VARIABLE_NAME,
        type: OFVarType.Array,
        required: true,
        value_ref: {
          selector: [`${resolvedNamespace}.${OF_ITERATION_ITEM_VARIABLE_NAME}`],
          path: `${resolvedNamespace}.${OF_ITERATION_ITEM_VARIABLE_NAME}`,
          label: OF_ITERATION_ITEM_VARIABLE_NAME,
          type: OFVarType.Array
        }
      },
      {
        variable: OF_ITERATION_INDEX_VARIABLE_NAME,
        label: OF_ITERATION_INDEX_VARIABLE_NAME,
        type: OFVarType.Number,
        required: true,
        value_ref: {
          selector: [`${resolvedNamespace}.${OF_ITERATION_INDEX_VARIABLE_NAME}`],
          path: `${resolvedNamespace}.${OF_ITERATION_INDEX_VARIABLE_NAME}`,
          label: OF_ITERATION_INDEX_VARIABLE_NAME,
          type: OFVarType.Number
        }
      },
      {
        variable: OF_ITERATION_LENGTH_VARIABLE_NAME,
        label: OF_ITERATION_LENGTH_VARIABLE_NAME,
        type: OFVarType.Number,
        required: true,
        value_ref: {
          selector: [`${resolvedNamespace}.${OF_ITERATION_LENGTH_VARIABLE_NAME}`],
          path: `${resolvedNamespace}.${OF_ITERATION_LENGTH_VARIABLE_NAME}`,
          label: OF_ITERATION_LENGTH_VARIABLE_NAME,
          type: OFVarType.Number
        }
      }
    ]
  }
}

export const iterationOutputVariableDefinition: OFVariableDefinition<{
  namespace: string
  fallbackNodeId?: string
}> = {
  id: 'iteration-output',
  build: ({ namespace, fallbackNodeId }) => {
    const resolvedNamespace = normalizeOFVariableNamespace(namespace, fallbackNodeId || 'iteration')
    return [
      {
        variable: OF_ITERATION_RESULT_VARIABLE_NAME,
        label: OF_ITERATION_RESULT_VARIABLE_NAME,
        type: OFVarType.Array,
        required: true,
        value_ref: {
          selector: [`${resolvedNamespace}.${OF_ITERATION_RESULT_VARIABLE_NAME}`],
          path: `${resolvedNamespace}.${OF_ITERATION_RESULT_VARIABLE_NAME}`,
          label: OF_ITERATION_RESULT_VARIABLE_NAME,
          type: OFVarType.Array
        }
      }
    ]
  }
}

export const loopInnerStartVariableDefinition: OFVariableDefinition<{
  namespace: string
  loopVariables: OFLoopVariableData[]
  fallbackNodeId?: string
}> = {
  id: 'loop-inner-start',
  build: ({ namespace, loopVariables, fallbackNodeId }) => {
    const resolvedNamespace = normalizeOFVariableNamespace(namespace, fallbackNodeId || 'loop')
    return [
      ...loopVariables.map((item) => ({
        variable: item.variable,
        label: item.label || item.variable,
        type: item.type,
        item_type: item.item_type,
        description: item.description,
        required: item.required,
        value_ref: {
          selector: [item.variable],
          path: item.variable,
          label: item.label || item.variable,
          type: item.type,
          schema: item.schema || null,
          item_schema: item.item_schema || null
        },
        schema: item.schema || null,
        item_schema: item.item_schema || null
      })),
      {
        variable: OF_LOOP_INDEX_VARIABLE_NAME,
        label: OF_LOOP_INDEX_VARIABLE_NAME,
        type: OFVarType.Number,
        required: true,
        value_ref: {
          selector: [`${resolvedNamespace}.${OF_LOOP_INDEX_VARIABLE_NAME}`],
          path: `${resolvedNamespace}.${OF_LOOP_INDEX_VARIABLE_NAME}`,
          label: OF_LOOP_INDEX_VARIABLE_NAME,
          type: OFVarType.Number
        }
      },
      {
        variable: OF_LOOP_COUNT_VARIABLE_NAME,
        label: OF_LOOP_COUNT_VARIABLE_NAME,
        type: OFVarType.Number,
        required: true,
        value_ref: {
          selector: [`${resolvedNamespace}.${OF_LOOP_COUNT_VARIABLE_NAME}`],
          path: `${resolvedNamespace}.${OF_LOOP_COUNT_VARIABLE_NAME}`,
          label: OF_LOOP_COUNT_VARIABLE_NAME,
          type: OFVarType.Number
        }
      }
    ]
  }
}

export const loopOutputVariableDefinition: OFVariableDefinition<{
  namespace: string
  loopVariables: OFLoopVariableData[]
  fallbackNodeId?: string
}> = {
  id: 'loop-output',
  build: ({ namespace, loopVariables, fallbackNodeId }) => {
    const resolvedNamespace = normalizeOFVariableNamespace(namespace, fallbackNodeId || 'loop')
    return [
      {
        variable: OF_LOOP_RESULT_VARIABLE_NAME,
        label: OF_LOOP_RESULT_VARIABLE_NAME,
        type: OFVarType.Object,
        required: true,
        value_ref: {
          selector: [`${resolvedNamespace}.${OF_LOOP_RESULT_VARIABLE_NAME}`],
          path: `${resolvedNamespace}.${OF_LOOP_RESULT_VARIABLE_NAME}`,
          label: OF_LOOP_RESULT_VARIABLE_NAME,
          type: OFVarType.Object
        }
      },
      ...loopVariables.map((item) => ({
        variable: item.variable,
        label: item.label || item.variable,
        type: item.type,
        item_type: item.item_type,
        description: item.description,
        required: item.required,
        value_ref: {
          selector: [`${resolvedNamespace}.${item.variable}`],
          path: `${resolvedNamespace}.${item.variable}`,
          label: item.label || item.variable,
          type: item.type,
          schema: item.schema || null,
          item_schema: item.item_schema || null
        },
        schema: item.schema || null,
        item_schema: item.item_schema || null
      }))
    ]
  }
}

export const variableAssignOutputVariableDefinition: OFVariableDefinition<{
  namespace: string
  rules: OFVariableAssignRule[]
  fallbackNodeId?: string
}> = {
  id: 'variable-assign-output',
  build: ({ namespace, rules, fallbackNodeId }) => {
    const resolvedNamespace = normalizeOFVariableNamespace(namespace, fallbackNodeId || 'assign')
    const outputMap = new Map<string, OFVariable>()

    rules.forEach((rule) => {
      const variable = String(rule.target_variable || '').trim()
      if (!variable) return

      outputMap.set(variable, {
        variable,
        label: String(rule.target_label || variable).trim() || variable,
        type: rule.target_type,
        item_type: rule.item_type,
        description: rule.description,
        required: true,
        value_ref: {
          selector: [`${resolvedNamespace}.${variable}`],
          path: `${resolvedNamespace}.${variable}`,
          label: String(rule.target_label || variable).trim() || variable,
          type: rule.target_type,
          schema: rule.schema ?? null,
          item_schema: rule.item_schema ?? null
        },
        schema: rule.schema ?? null,
        item_schema: rule.item_schema ?? null
      })
    })

    return Array.from(outputMap.values())
  }
}

export function createStructuredSchemaObject(
  schema: OFStructuredJsonSchema | undefined | null
): OFStructuredJsonSchema | null {
  return schema ? cloneOFValue(schema) : null
}

export function createItemSchemaObject(
  schema: OFJsonSchemaObject | undefined | null
): OFJsonSchemaObject | null {
  return schema ? cloneOFValue(schema) : null
}
