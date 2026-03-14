import type {
  OFLoopVariableData,
  OFStructuredOutputConfig,
  OFStructuredJsonSchema,
  OFVariable,
  OFVariableAssignRule
} from './core-types'
import {
  getOFVarTypeFromSchema,
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
              type: item.type || getOFVarTypeFromSchema(item.schema),
              schema: item.schema || null
            }
          : {
              selector: [item.variable],
              path: item.variable,
              label: item.label || item.variable,
              type: item.type || getOFVarTypeFromSchema(item.schema),
              schema: item.schema || null
            })
    }))
  )
}

export const startInputVariableDefinition: OFVariableDefinition<void> = {
  id: 'start-input-template',
  build: () => [],
  notes_zh: [
    '开始节点输入变量必须显式声明 schema；标量也不再裸写 type/default。',
    '默认值统一写在 schema.default 或 schema 子字段的 default 上，不再写变量级 default。',
    'array / object 的结构信息都收口到 schema，自身不再拆出 item_schema。'
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
        description: item.description,
        required: item.required,
        value_ref: {
          selector: [item.variable],
          path: item.variable,
          label: item.label || item.variable,
          type: item.type,
          schema: item.schema || null
        },
        schema: item.schema || null
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
        description: item.description,
        required: item.required,
        value_ref: {
          selector: [`${resolvedNamespace}.${item.variable}`],
          path: `${resolvedNamespace}.${item.variable}`,
          label: item.label || item.variable,
          type: item.type,
          schema: item.schema || null
        },
        schema: item.schema || null
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
        description: rule.description,
        required: true,
        value_ref: {
          selector: [`${resolvedNamespace}.${variable}`],
          path: `${resolvedNamespace}.${variable}`,
          label: String(rule.target_label || variable).trim() || variable,
          type: rule.target_type,
          schema: rule.schema ?? null
        },
        schema: rule.schema ?? null
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
