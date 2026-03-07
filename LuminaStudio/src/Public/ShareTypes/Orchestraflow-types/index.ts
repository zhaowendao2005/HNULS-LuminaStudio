/**
 * OrchestraFlow 统一类型定义
 * 作为此业务的唯一事实来源
 */

import type { XYPosition } from '@vue-flow/core'

// ===== 节点类型枚举 =====
export enum OFBlockEnum {
  Start = 'start',
  LLM = 'llm',
  IfElse = 'ifelse',
  Iteration = 'iteration',
  IterationStart = 'iteration-start',
  Loop = 'loop',
  LoopStart = 'loop-start',
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
  item_type?: OFVarType
  description?: string
  required?: boolean
  default?: string | number | boolean | Record<string, any> | any[] | null
  options?: string[]
  value_selector?: string[]
  schema?: OFJsonSchemaObject | null
  item_schema?: OFJsonSchemaObject | null
}

export type OFInputVar = OFVariable
export type OFOutputVar = OFVariable

export interface OFNodeInput {
  variables: OFVariable[]
}

export interface OFNodeOutput {
  variables: OFVariable[]
}

export const OF_LLM_TEXT_OUTPUT_NAME = 'llmoutput'
export const OF_LLM_STRUCTURED_OUTPUT_NAME = 'structured_output'
export const OF_ITERATION_ITEM_VARIABLE_NAME = 'item'
export const OF_ITERATION_INDEX_VARIABLE_NAME = 'index'
export const OF_ITERATION_LENGTH_VARIABLE_NAME = 'length'
export const OF_ITERATION_RESULT_VARIABLE_NAME = 'result'

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

function resolveIterationNamespace(namespace: string, fallbackNodeId?: string): string {
  return normalizeOFVariableNamespace(namespace, fallbackNodeId || 'iteration')
}

export function buildIterationInnerStartVariables(
  namespace: string,
  fallbackNodeId?: string
): OFVariable[] {
  const resolvedNamespace = resolveIterationNamespace(namespace, fallbackNodeId)

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

export function buildIterationOutputVariables(
  namespace: string,
  fallbackNodeId?: string
): OFVariable[] {
  const resolvedNamespace = resolveIterationNamespace(namespace, fallbackNodeId)

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
  graph: OFWorkflowGraph
}

export interface OFWorkflowGraph {
  nodes: OFNode[]
  edges: OFEdge[]
}

export interface OFSubWorkflowGraph extends OFWorkflowGraph {
  viewport?: {
    x: number
    y: number
    zoom: number
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
  isInIteration?: boolean
  iterationId?: string
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

// ===== IfElse 节点数据 =====
export type OFIfElseNodeData = OFCommonNodeType & {
  type: OFBlockEnum.IfElse
  cases: OFIfElseCase[]
  elseCase: OFIfElseElseCase
}

export type OFIterationErrorHandleMode =
  | 'terminated'
  | 'continue-on-error'
  | 'remove-abnormal-output'

export type OFIterationParallelMode = 'sequential' | 'parallel'
export type OFLoopVariableValueType = 'constant' | 'variable'

export type OFIterationNodeData = OFCommonNodeType & {
  type: OFBlockEnum.Iteration
  iterator_selector: string[]
  output_selector: string[]
  start_node_id: string
  subgraph: OFSubWorkflowGraph
  parallel_mode?: OFIterationParallelMode
  parallel_nums?: number
  error_handle_mode?: OFIterationErrorHandleMode
  flatten_output?: boolean
  output: OFNodeOutput
}

export type OFIterationStartNodeData = OFCommonNodeType & {
  type: OFBlockEnum.IterationStart
  input?: OFNodeInput
}

export interface OFLoopVariableData {
  variable: string
  label?: string
  type?: OFVarType
  item_type?: OFVarType
  description?: string
  required?: boolean
  value_type: OFLoopVariableValueType
  value?: string | number | boolean | Record<string, any> | any[] | null
  value_selector?: string[]
  schema?: OFJsonSchemaObject | null
  item_schema?: OFJsonSchemaObject | null
}

export type OFLoopNodeData = OFCommonNodeType & {
  type: OFBlockEnum.Loop
  loop_count: number
  loop_variables: OFLoopVariableData[]
  break_conditions?: OFIfElseCondition[]
  logical_operator?: OFIfElseLogicalOperator
  start_node_id: string
  subgraph: OFWorkflowGraph
}

export type OFLoopStartNodeData = OFCommonNodeType & {
  type: OFBlockEnum.LoopStart
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
  parentNode?: string
  extent?: 'parent'
  data:
    | OFStartNodeData
    | OFLLMNodeData
    | OFIfElseNodeData
    | OFIterationNodeData
    | OFIterationStartNodeData
    | OFLoopNodeData
    | OFLoopStartNodeData
    | OFEndNodeData
}

// ===== 边类型 =====
export type OFEdge = {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
  class?: string
  zIndex?: number
  data?: OFCommonEdgeType
}

export interface OFNodeExecutionMetadata {
  in_iteration_id?: string
  iteration_index?: number
  iteration_length?: number
  in_loop_id?: string
  loop_index?: number
  loop_count?: number
  parallel_run_id?: string
  scope_path?: string[]
}

// ===== 节点运行追踪 =====
export interface OFNodeTracing {
  nodeId: string
  nodeType: OFBlockEnum
  status: OFNodeRunningStatus
  trace_key?: string
  scope_path?: string[]
  execution_metadata?: OFNodeExecutionMetadata
  elapsed_time?: number
  inputs?: Record<string, any>
  outputs?: Record<string, any>
  error?: string
}

export function buildOFNodeTraceKey(params: {
  runId: string
  workflowId: string
  nodeId: string
  scopePath?: string[]
  executionMetadata?: OFNodeExecutionMetadata
}): string {
  const scopePath = params.scopePath || []
  const metadata = params.executionMetadata

  return [
    params.runId,
    params.workflowId,
    scopePath.join('/') || 'root',
    params.nodeId,
    metadata?.in_iteration_id || 'root',
    metadata?.iteration_index ?? 'na',
    metadata?.in_loop_id || 'root',
    metadata?.loop_index ?? 'na'
  ].join('::')
}

export function getOFTraceIdentity(
  trace: Pick<OFNodeTracing, 'trace_key' | 'nodeId' | 'scope_path' | 'execution_metadata'>
): string {
  if (trace.trace_key) {
    return trace.trace_key
  }

  const scopePath = trace.scope_path || trace.execution_metadata?.scope_path || []
  const metadata = trace.execution_metadata

  return [
    trace.nodeId,
    scopePath.join('/') || 'root',
    metadata?.in_iteration_id || 'root',
    metadata?.iteration_index ?? 'na',
    metadata?.in_loop_id || 'root',
    metadata?.loop_index ?? 'na',
    metadata?.parallel_run_id || 'serial'
  ].join('::')
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
  scopePath?: string[]
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

export interface OFIfElseNodeConfig {
  nodeId: string
  title: string
  desc: string
  cases: OFIfElseCase[]
  elseCase: OFIfElseElseCase
}

export interface OFIterationNodeConfig {
  nodeId: string
  title: string
  desc: string
  iterator_selector: string[]
  output_selector: string[]
  start_node_id: string
  subgraph: OFSubWorkflowGraph
  parallel_mode?: OFIterationParallelMode
  parallel_nums?: number
  error_handle_mode?: OFIterationErrorHandleMode
  flatten_output?: boolean
  output: OFNodeOutput
}

export interface OFIterationStartNodeConfig {
  nodeId: string
  title: string
  desc: string
  input?: OFNodeInput
}

export interface OFLoopNodeConfig {
  nodeId: string
  title: string
  desc: string
  loop_count: number
  loop_variables: OFLoopVariableData[]
  break_conditions?: OFIfElseCondition[]
  logical_operator?: OFIfElseLogicalOperator
  start_node_id: string
  subgraph: OFWorkflowGraph
}

export interface OFLoopStartNodeConfig {
  nodeId: string
  title: string
  desc: string
}

export interface OFEndNodeConfig {
  nodeId: string
  title: string
  desc: string
  output: OFNodeOutput
}
