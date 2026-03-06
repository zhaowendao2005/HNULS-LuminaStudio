/**
 * OrchestraFlow 统一类型定义
 * 作为此业务的唯一事实来源
 */

import type { XYPosition } from '@vue-flow/core'

// ===== 节点类型枚举 =====
export enum OFBlockEnum {
  Start = 'start',
  LLM = 'llm',
  Iteration = 'iteration',
  IfElse = 'ifelse',
  End = 'end'
}

// ===== 控制模式 =====
export enum OFControlMode {
  Pointer = 'pointer',
  Hand = 'hand'
}

// ===== 节点运行状态 =====
export enum OFNodeRunningStatus {
  NotStarted = 'not-started',
  Running = 'running',
  Succeeded = 'succeeded',
  Failed = 'failed',
  Skipped = 'skipped'
}

// ===== 工作流运行状态 =====
export enum OFWorkflowRunningStatus {
  NotStarted = 'not-started',
  Running = 'running',
  Succeeded = 'succeeded',
  Failed = 'failed',
  Stopped = 'stopped'
}

// ===== 变量类型 =====
export enum OFVarType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Object = 'object',
  Array = 'array'
}

// ===== 结构化输出 / Schema =====
export type OFStructuredFieldType = 'string' | 'number' | 'boolean'

export interface OFJsonSchemaField {
  type: OFStructuredFieldType
  description?: string
}

export interface OFJsonSchemaObject {
  type: 'object'
  properties: Record<string, OFJsonSchemaField>
  required: string[]
  additionalProperties: false
}

export interface OFStructuredOutputConfig {
  enabled: boolean
  schema: OFJsonSchemaObject | null
}

export interface OFVariable {
  variable: string
  label?: string
  type?: OFVarType
  description?: string
  required?: boolean
  default?: string | number | boolean | Record<string, any> | any[] | null
  options?: string[]
  value_selector?: string[]
  schema?: OFJsonSchemaObject | null
}

export type OFInputVar = OFVariable
export type OFOutputVar = OFVariable

export interface OFNodeInput {
  variables: OFVariable[]
}

export interface OFNodeOutput {
  variables: OFVariable[]
}

export type OFIterationMode = 'fixed-count' | 'mock-source'

export interface OFIterationPreviewNode {
  id: string
  type: 'start' | 'llm'
  title: string
  subtitle?: string
}

export interface OFIterationResultItem {
  index: number
  title: string
  input: string
  outputSummary: string
  status: OFNodeRunningStatus
}

export interface OFIterationMockRun {
  iterations: OFIterationResultItem[]
  summary: string
  finalOutput: string
}

export interface OFIterationPreviewSnapshot {
  label: string
  nodes: OFIterationPreviewNode[]
}

export const OF_LLM_TEXT_OUTPUT_NAME = 'llmoutput'
export const OF_LLM_STRUCTURED_OUTPUT_NAME = 'structured_output'

export function normalizeOFVariableNamespace(
  raw: string | null | undefined,
  fallback = 'node'
): string {
  const normalized = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return normalized || fallback
}

export function buildLLMOutputVariables(
  namespace: string,
  structuredOutput?: OFStructuredOutputConfig | null
): OFVariable[] {
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
      type: OFVarType.Object,
      required: true,
      value_selector: [`${normalizedNamespace}.${OF_LLM_STRUCTURED_OUTPUT_NAME}`],
      schema: structuredOutput.schema
    })
  }

  return variables
}

export function buildIterationOutputVariables(
  namespace: string,
  fallback = 'iteration'
): OFVariable[] {
  const normalizedNamespace = normalizeOFVariableNamespace(namespace, fallback)

  return [
    {
      variable: 'summary',
      label: 'summary',
      type: OFVarType.String,
      required: true,
      value_selector: [`${normalizedNamespace}.summary`]
    },
    {
      variable: 'final_output',
      label: 'final_output',
      type: OFVarType.String,
      required: true,
      value_selector: [`${normalizedNamespace}.final_output`]
    },
    {
      variable: 'iterations',
      label: 'iterations',
      type: OFVarType.Array,
      required: true,
      value_selector: [`${normalizedNamespace}.iterations`]
    }
  ]
}

// ===== 条件分支 =====
export type OFIfElseConditionOperator =
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is'
  | 'is_not'
  | 'is_empty'
  | 'is_not_empty'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'

export type OFIfElseLogicalOperator = 'and' | 'or'

export interface OFIfElseCondition {
  id: string
  variable_selector: string[]
  variable_path?: string
  variable_label?: string
  variable_type?: OFVarType
  operator: OFIfElseConditionOperator
  value?: string | number | boolean | null
  value_type?: OFVarType.String | OFVarType.Number | OFVarType.Boolean
  logical_operator?: OFIfElseLogicalOperator
}

export interface OFIfElseCase {
  id: string
  kind: 'if' | 'elif'
  label: string
  handleId: string
  conditions: OFIfElseCondition[]
}

export interface OFIfElseElseCase {
  handleId: string
  label: string
}

// ===== 工作流元数据 =====
export interface OFWorkflowMeta {
  id: string
  name: string
  description?: string
  icon?: string
  iconBackground?: string
  author: string
  createdAt: number
  updatedAt: number
  status: 'draft' | 'published' | 'archived'
  nodeCount: number
  tags?: string[]
}

// ===== 工作流完整数据 =====
export interface OFWorkflow {
  id: string
  name: string
  description?: string
  author: string
  createdAt: number
  updatedAt: number
  status: 'draft' | 'published' | 'archived'
  graph: {
    nodes: OFNode[]
    edges: OFEdge[]
  }
}

// ===== 环境变量 =====
export interface OFEnvironmentVariable {
  id: string
  name: string
  value: any
  value_type: 'string' | 'number' | 'secret'
  description: string
}

// ===== 全局变量 =====
export interface OFGlobalVariable {
  name: string
  value_type: 'string' | 'number' | 'integer'
  description: string
}

// ===== 模型配置 =====
export interface OFModelCompletionParams {
  temperature?: number
  top_p?: number
  top_k?: number
  max_tokens?: number
  presence_penalty?: number
  frequency_penalty?: number
}

export interface OFModelConfig {
  provider: string
  name: string
  mode?: string
  completion_params?: OFModelCompletionParams
}

// ===== Prompt 项 =====
export interface OFPromptItem {
  id: string
  role: 'system' | 'user' | 'assistant'
  text: string
}

// ===== 记忆配置 =====
export interface OFMemory {
  role_prefix?: {
    user?: string
    assistant?: string
  }
  window?: {
    enabled: boolean
    size?: number
  }
}

// ===== 节点基础类型 =====
export interface OFCommonNodeType {
  _connectedSourceHandleIds?: string[]
  _connectedTargetHandleIds?: string[]
  _runningStatus?: OFNodeRunningStatus
  selected?: boolean
  title: string
  desc: string
  type: OFBlockEnum
  width?: number
  height?: number
  position?: XYPosition
}

// ===== 连线基础类型 =====
export interface OFCommonEdgeType {
  _hovering?: boolean
  _connectedNodeIsHovering?: boolean
  _connectedNodeIsSelected?: boolean
  _sourceRunningStatus?: OFNodeRunningStatus
  _targetRunningStatus?: OFNodeRunningStatus
  sourceType: OFBlockEnum
  targetType: OFBlockEnum
}

// ===== Start 节点数据 =====
export type OFStartNodeData = OFCommonNodeType & {
  type: OFBlockEnum.Start
  input: OFNodeInput
}

// ===== LLM 节点数据 =====
export type OFLLMNodeData = OFCommonNodeType & {
  type: OFBlockEnum.LLM
  model: OFModelConfig
  prompt_template?: OFPromptItem[]
  context?: {
    enabled: boolean
    variable_selector?: string[]
  }
  memory?: OFMemory
  vision?: {
    enabled: boolean
  }
  structured_output: OFStructuredOutputConfig
  output: OFNodeOutput
}

// ===== Iteration 节点数据 =====
export type OFIterationNodeData = OFCommonNodeType & {
  type: OFBlockEnum.Iteration
  iterationMode: OFIterationMode
  iterationCount: number
  iterationSource?: string
  mockTemplateId: string
  preview: OFIterationPreviewSnapshot
  mockRun: OFIterationMockRun
  output: OFNodeOutput
}

// ===== IfElse 节点数据 =====
export type OFIfElseNodeData = OFCommonNodeType & {
  type: OFBlockEnum.IfElse
  cases: OFIfElseCase[]
  elseCase: OFIfElseElseCase
}

// ===== End 节点数据 =====
export type OFEndNodeData = OFCommonNodeType & {
  type: OFBlockEnum.End
  output: OFNodeOutput
}

// ===== 节点类型 =====
export type OFNode = {
  id: string
  type: string
  position: XYPosition
  data: OFStartNodeData | OFLLMNodeData | OFIterationNodeData | OFIfElseNodeData | OFEndNodeData
}

// ===== 边类型 =====
export type OFEdge = {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
  data?: OFCommonEdgeType
}

// ===== 节点运行追踪 =====
export interface OFNodeTracing {
  nodeId: string
  nodeType: OFBlockEnum
  status: OFNodeRunningStatus
  elapsed_time?: number
  inputs?: Record<string, any>
  outputs?: Record<string, any>
  error?: string
}

// ===== 工作流运行结果 =====
export interface OFWorkflowRunResult {
  status: OFWorkflowRunningStatus
  elapsed_time?: number
  total_tokens?: number
  tracing: OFNodeTracing[]
  outputs?: Record<string, any>
  error?: string
}

// ===== 节点调试 =====
export interface OFNodeDebugRunParams {
  workflowId: string
  nodeId: string
  inputs?: Record<string, any>
}

export interface OFNodeDebugResult {
  nodeId: string
  nodeType: OFBlockEnum
  status: OFNodeRunningStatus
  elapsed_time?: number
  inputs?: Record<string, any>
  outputs?: Record<string, any>
  error?: string
}

// ===== 节点配置类型（用于 Store）=====
export interface OFStartNodeConfig {
  nodeId: string
  title: string
  desc: string
  input: OFNodeInput
}

export interface OFLLMNodeConfig {
  nodeId: string
  title: string
  desc: string
  model: OFModelConfig
  prompt_template: OFPromptItem[]
  structured_output: OFStructuredOutputConfig
  output: OFNodeOutput
}

export interface OFIterationNodeConfig {
  nodeId: string
  title: string
  desc: string
  iterationMode: OFIterationMode
  iterationCount: number
  iterationSource?: string
  mockTemplateId: string
  preview: OFIterationPreviewSnapshot
  mockRun: OFIterationMockRun
  output: OFNodeOutput
}

export interface OFIfElseNodeConfig {
  nodeId: string
  title: string
  desc: string
  cases: OFIfElseCase[]
  elseCase: OFIfElseElseCase
}

export interface OFEndNodeConfig {
  nodeId: string
  title: string
  desc: string
  output: OFNodeOutput
}
