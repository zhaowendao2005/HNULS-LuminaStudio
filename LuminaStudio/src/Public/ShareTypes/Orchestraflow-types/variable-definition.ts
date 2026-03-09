import type { OFAuthoringDefaultRecommendation } from './ai-schema'
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
  authoring_defaults?: OFAuthoringDefaultRecommendation[]
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

export function cloneOFAuthoringDefaults(
  defaults: OFAuthoringDefaultRecommendation[]
): OFAuthoringDefaultRecommendation[] {
  return defaults.map((item) => cloneOFValue(item))
}

export function ensureOFSelectableVariables(variables: OFVariable[]): OFVariable[] {
  return cloneOFVariables(
    variables.map((item) => ({
      ...item,
      value_selector: item.value_selector?.length ? item.value_selector : [item.variable]
    }))
  )
}

export const startInputVariableDefinition: OFVariableDefinition<void> = {
  id: 'start-input-authoring-defaults',
  build: () => [],
  authoring_defaults: [
    {
      path: 'graph.nodes[start].data.input.variables[*].default',
      kind: 'recommended',
      value: 'example text',
      summary: '为开始节点输入变量补 default，可让导入后的工作流直接运行，再由用户微调。',
      omit_when: '该输入变量仅应由用户在每次运行前手动输入，且不应预填。'
    },
    {
      path: 'graph.nodes[start].data.input.variables[string].default',
      kind: 'example',
      value: 'batch',
      summary: 'string 输入变量使用非空短字符串作为可运行示例值。'
    },
    {
      path: 'graph.nodes[start].data.input.variables[number].default',
      kind: 'example',
      value: 3,
      summary: 'number 输入变量使用真实数字，避免写成字符串。'
    },
    {
      path: 'graph.nodes[start].data.input.variables[boolean].default',
      kind: 'example',
      value: false,
      summary: 'boolean 输入变量直接写 true/false。'
    },
    {
      path: 'graph.nodes[start].data.input.variables[array].default',
      kind: 'example',
      value: ['sample-item-1', 'sample-item-2'],
      summary: 'array 输入变量写真实 JSON 数组，不要写成字符串化 JSON。'
    },
    {
      path: 'graph.nodes[start].data.input.variables[object].default',
      kind: 'example',
      value: { topic: 'demo', priority: 1 },
      summary: 'object 输入变量写真实 JSON 对象，不要写成字符串化 JSON。'
    }
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
        value_selector: [`${normalizedNamespace}.${OF_LLM_TEXT_OUTPUT_NAME}`]
      }
    ]

    if (structuredOutput?.enabled && structuredOutput.schema) {
      variables.push({
        variable: OF_LLM_STRUCTURED_OUTPUT_NAME,
        label: OF_LLM_STRUCTURED_OUTPUT_NAME,
        type: structuredOutput.schema.type === 'array' ? OFVarType.Array : OFVarType.Object,
        required: true,
        value_selector: [`${normalizedNamespace}.${OF_LLM_STRUCTURED_OUTPUT_NAME}`],
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
        value_selector: [`${resolvedNamespace}.${OF_ITERATION_ITEM_VARIABLE_NAME}`]
      },
      {
        variable: OF_ITERATION_INDEX_VARIABLE_NAME,
        label: OF_ITERATION_INDEX_VARIABLE_NAME,
        type: OFVarType.Number,
        required: true,
        value_selector: [`${resolvedNamespace}.${OF_ITERATION_INDEX_VARIABLE_NAME}`]
      },
      {
        variable: OF_ITERATION_LENGTH_VARIABLE_NAME,
        label: OF_ITERATION_LENGTH_VARIABLE_NAME,
        type: OFVarType.Number,
        required: true,
        value_selector: [`${resolvedNamespace}.${OF_ITERATION_LENGTH_VARIABLE_NAME}`]
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
        value_selector: [`${resolvedNamespace}.${OF_ITERATION_RESULT_VARIABLE_NAME}`]
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
        value_selector: [item.variable],
        schema: item.schema || null,
        item_schema: item.item_schema || null
      })),
      {
        variable: OF_LOOP_INDEX_VARIABLE_NAME,
        label: OF_LOOP_INDEX_VARIABLE_NAME,
        type: OFVarType.Number,
        required: true,
        value_selector: [`${resolvedNamespace}.${OF_LOOP_INDEX_VARIABLE_NAME}`]
      },
      {
        variable: OF_LOOP_COUNT_VARIABLE_NAME,
        label: OF_LOOP_COUNT_VARIABLE_NAME,
        type: OFVarType.Number,
        required: true,
        value_selector: [`${resolvedNamespace}.${OF_LOOP_COUNT_VARIABLE_NAME}`]
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
        value_selector: [`${resolvedNamespace}.${OF_LOOP_RESULT_VARIABLE_NAME}`]
      },
      ...loopVariables.map((item) => ({
        variable: item.variable,
        label: item.label || item.variable,
        type: item.type,
        item_type: item.item_type,
        description: item.description,
        required: item.required,
        value_selector: [`${resolvedNamespace}.${item.variable}`],
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
        value_selector: [`${resolvedNamespace}.${variable}`],
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
