/**
 * OrchestraFlow 统一类型定义
 * 作为此业务的唯一事实来源
 */

import type { XYPosition } from '@vue-flow/core'
import type {
  OFKnowledgePermissionTree,
  OFKnowledgeRetrievalSelectionState
} from '../knowledge-retrieval.types'

// ===== 节点类型枚举 =====
export enum OFBlockEnum {
  Start = 'start',
  LLM = 'llm',
  IfElse = 'ifelse',
  Iteration = 'iteration',
  IterationStart = 'iteration-start',
  Loop = 'loop',
  LoopStart = 'loop-start',
  VariableAssign = 'variable-assign',
  KnowledgeRetrieval = 'knowledge-retrieval',
  PaperRetrieval = 'paper-retrieval',
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
// 这里是变量声明与结构化输出共用的唯一 schema 真相层。
// object / array / 标量都必须通过同一棵 schema tree 表达，避免 type / item_schema 多头语义。
export type OFStructuredFieldType = 'string' | 'number' | 'boolean'
export type OFStructuredSchemaNodeType = OFStructuredFieldType | 'object' | 'array'

export interface OFJsonSchemaField {
  type: OFStructuredFieldType
  description?: string
  default?: string | number | boolean | null
}

export interface OFJsonSchemaArray {
  type: 'array'
  items: OFJsonSchemaProperty
  description?: string
  default?: unknown[] | null
}

export interface OFJsonSchemaObject {
  type: 'object'
  properties: Record<string, OFJsonSchemaProperty>
  required: string[]
  additionalProperties: false
  description?: string
  default?: Record<string, unknown> | null
}

export type OFJsonSchemaProperty = OFJsonSchemaField | OFJsonSchemaArray | OFJsonSchemaObject
export type OFStructuredJsonSchema = OFJsonSchemaObject

export interface OFStructuredOutputConfig {
  enabled: boolean
  schema: OFStructuredJsonSchema | null
}

export type OFAuthoringValuePayload =
  | string
  | number
  | boolean
  | Record<string, unknown>
  | unknown[]
  | null

export type OFAuthoringVariableSource =
  | {
      mode: 'ref'
      ref: string
    }
  | {
      mode: 'value'
      value: OFAuthoringValuePayload
    }

export interface OFAuthoringVariableSpec {
  variable: string
  label?: string
  description?: string
  required?: boolean
  schema: OFJsonSchemaProperty
  source?: OFAuthoringVariableSource
}

export interface OFVariable {
  variable: string
  label?: string
  type?: OFVarType
  description?: string
  required?: boolean
  options?: string[]
  value_ref?: OFVariableRef
  value_selector?: string[]
  value_template?: string | number | boolean | Record<string, unknown> | unknown[] | null
  schema?: OFJsonSchemaProperty | null
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
export const OF_LOOP_INDEX_VARIABLE_NAME = 'index'
export const OF_LOOP_COUNT_VARIABLE_NAME = 'loop_count'
export const OF_LOOP_RESULT_VARIABLE_NAME = 'result'
export const OF_VARIABLE_ASSIGN_NODE_NAME = 'assign'

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

// 统一从 schema 派生运行时变量类型，避免每层各自复制一套 type 判断。
export function getOFVarTypeFromSchema(
  schema: OFJsonSchemaProperty | null | undefined
): OFVarType | undefined {
  switch (schema?.type) {
    case 'string':
      return OFVarType.String
    case 'number':
      return OFVarType.Number
    case 'boolean':
      return OFVarType.Boolean
    case 'array':
      return OFVarType.Array
    case 'object':
      return OFVarType.Object
    default:
      return undefined
  }
}

export function getOFNodeOutputNamespace(
  node: {
    output_namespace?: string
    title?: string
    type?: OFBlockEnum
  },
  fallback = 'node'
): string {
  // 统一从这里读取节点输出命名空间：
  // 1. 新结构优先读 output_namespace
  // 2. 老数据没有时，临时回退到 title，保证旧工作流还能被安全迁移
  return normalizeOFVariableNamespace(node.output_namespace || node.title, fallback)
}

// ===== 条件分支 =====
export type OFVariableAssignSourceMode = 'variable' | 'constant'

export interface OFSelectorRef {
  selector: string[]
  path?: string
}

export interface OFVariableRef extends OFSelectorRef {
  label?: string
  type?: OFVarType
  schema?: OFJsonSchemaProperty | null
}

export type OFValueSource =
  | {
      mode: 'constant'
      constant_value?: string | number | boolean | Record<string, unknown> | unknown[] | null
    }
  | {
      mode: 'variable'
      ref: OFVariableRef
    }

export interface OFVariableAssignRule {
  id: string
  source?: OFValueSource
  source_mode: OFVariableAssignSourceMode
  source_selector?: string[]
  source_path?: string
  source_label?: string
  source_type?: OFVarType
  constant_value?: string | number | boolean | Record<string, unknown> | unknown[] | null
  target_variable: string
  target_label?: string
  target_type: OFVarType
  schema?: OFJsonSchemaProperty | null
  description?: string
}

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
  | 'length_is'
  | 'length_gt'
  | 'length_gte'
  | 'length_lt'
  | 'length_lte'
  | 'all_true'
  | 'any_true'
  | 'all_false'
  | 'any_false'

export type OFIfElseLogicalOperator = 'and' | 'or'
export type OFIfElseCompareSourceMode = 'constant' | 'variable'

export interface OFIfElseCondition {
  id: string
  variable_ref?: OFVariableRef
  variable_selector?: string[]
  variable_path?: string
  variable_label?: string
  variable_type?: OFVarType
  operator: OFIfElseConditionOperator
  value?: string | number | boolean | null
  value_type?: OFVarType.String | OFVarType.Number | OFVarType.Boolean
  compare_source_mode?: OFIfElseCompareSourceMode
  compare_ref?: OFVariableRef
  compare_selector?: string[]
  compare_path?: string
  compare_label?: string
  compare_type?: OFVarType
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
  value: string | number
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

export type OFModelRequestMode = 'chat-completions' | 'responses'

export interface OFModelConfig {
  provider: string
  name: string
  mode?: OFModelRequestMode
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
  output_namespace?: string
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
  iterator_ref?: OFVariableRef
  iterator_selector: string[]
  output_ref?: OFVariableRef
  output_selector: string[]
  branch_output_refs?: OFIterationBranchOutputRef[]
  branch_output_selectors?: OFIterationBranchOutputSelector[]
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
  id?: string
  variable: string
  label?: string
  type?: OFVarType
  description?: string
  required?: boolean
  value_source?: OFValueSource
  value_type: OFLoopVariableValueType
  value?: string | number | boolean | Record<string, unknown> | unknown[] | null
  value_selector?: string[]
  schema?: OFJsonSchemaProperty | null
}

export type OFLoopNodeData = OFCommonNodeType & {
  type: OFBlockEnum.Loop
  loop_count: number
  loop_count_ref?: OFVariableRef
  loop_count_selector?: string[]
  loop_variables: OFLoopVariableData[]
  break_conditions?: OFIfElseCondition[]
  logical_operator?: OFIfElseLogicalOperator
  start_node_id: string
  subgraph: OFSubWorkflowGraph
  output: OFNodeOutput
}

export type OFLoopStartNodeData = OFCommonNodeType & {
  type: OFBlockEnum.LoopStart
  input?: OFNodeInput
}

// ===== End 节点数据 =====
export type OFVariableAssignNodeData = OFCommonNodeType & {
  type: OFBlockEnum.VariableAssign
  rules: OFVariableAssignRule[]
  output: OFNodeOutput
}

export type OFPaperRetrievalSortBy = 'relevance' | 'date_desc' | 'date_asc'

export type OFKnowledgeRetrievalNodeData = OFCommonNodeType & {
  type: OFBlockEnum.KnowledgeRetrieval
  query_template: OFPromptItem[]
  // 兼容旧单 knowledgeBaseId / providers 树，同时支持新多知识库规则结构。
  permission_tree: OFKnowledgePermissionTree
  knowledge_base_ids: OFKnowledgeRetrievalSelectionState['knowledgeBaseIds']
  selected_knowledge_base_ids: OFKnowledgeRetrievalSelectionState['selectedKnowledgeBaseIds']
  selected_document_file_keys_by_knowledge_base: OFKnowledgeRetrievalSelectionState['selectedDocumentFileKeysByKnowledgeBase']
  top_k: number
  ef: number | null
  rerank_enabled: boolean
  rerank_model_id: string | null
  rerank_top_n: number | null
  output_namespace: string
  output: OFNodeOutput
}

export type OFPaperRetrievalNodeData = OFCommonNodeType & {
  type: OFBlockEnum.PaperRetrieval
  query_template: OFPromptItem[]
  provider_id: string
  api_key_ref_id: string | null
  top_k: number
  sort_by: OFPaperRetrievalSortBy
  date_from: string | null
  date_to: string | null
  provider_options: Record<string, string | number | boolean | null>
  output_namespace: string
  output: OFNodeOutput
}

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
    | OFVariableAssignNodeData
    | OFKnowledgeRetrievalNodeData
    | OFPaperRetrievalNodeData
    | OFEndNodeData
}

// ===== 边类型 =====
export type OFEdge = {
  id: string
  source: string
  target: string
  source_port_id?: string | null
  target_port_id?: string | null
  sourceHandle?: string | null
  targetHandle?: string | null
  class?: string
  zIndex?: number
  data?: OFCommonEdgeType
}

export function getOFEdgeSourcePortId(
  edge: Pick<OFEdge, 'source_port_id' | 'sourceHandle'>
): string {
  return edge.source_port_id || edge.sourceHandle || 'source'
}

export function getOFEdgeTargetPortId(
  edge: Pick<OFEdge, 'target_port_id' | 'targetHandle'>
): string {
  return edge.target_port_id || edge.targetHandle || 'target'
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
  inputs?: Record<string, unknown>
  outputs?: Record<string, unknown>
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
  outputs?: Record<string, unknown>
  error?: string
}

// ===== 节点调试 =====
export interface OFNodeDebugRunParams {
  workflowId: string
  nodeId: string
  inputs?: Record<string, unknown>
  scopePath?: string[]
}

export interface OFNodeDebugResult {
  nodeId: string
  nodeType: OFBlockEnum
  status: OFNodeRunningStatus
  elapsed_time?: number
  inputs?: Record<string, unknown>
  outputs?: Record<string, unknown>
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
  branch_output_selectors?: OFIterationBranchOutputSelector[]
  start_node_id: string
  subgraph: OFSubWorkflowGraph
  parallel_mode?: OFIterationParallelMode
  parallel_nums?: number
  error_handle_mode?: OFIterationErrorHandleMode
  flatten_output?: boolean
  output: OFNodeOutput
}

export interface OFIterationBranchOutputSelector {
  source_node_id: string
  source_handle_id: string
  output_selector?: string[]
  output_ref?: OFVariableRef
}

export interface OFIterationBranchOutputRef {
  source_node_id: string
  source_handle_id: string
  output_ref: OFVariableRef
  output_selector?: string[]
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
  subgraph: OFSubWorkflowGraph
  output: OFNodeOutput
}

export interface OFLoopStartNodeConfig {
  nodeId: string
  title: string
  desc: string
  input?: OFNodeInput
}

export interface OFVariableAssignNodeConfig {
  nodeId: string
  title: string
  desc: string
  rules: OFVariableAssignRule[]
  output: OFNodeOutput
}

export interface OFKnowledgeRetrievalNodeConfig {
  nodeId: string
  title: string
  desc: string
  query_template: OFPromptItem[]
  // 与节点运行时保持同一 permission_tree 契约，避免 editor/runtime 分叉。
  permission_tree: OFKnowledgePermissionTree
  knowledge_base_ids: OFKnowledgeRetrievalSelectionState['knowledgeBaseIds']
  selected_knowledge_base_ids: OFKnowledgeRetrievalSelectionState['selectedKnowledgeBaseIds']
  selected_document_file_keys_by_knowledge_base: OFKnowledgeRetrievalSelectionState['selectedDocumentFileKeysByKnowledgeBase']
  top_k: number
  ef: number | null
  rerank_enabled: boolean
  rerank_model_id: string | null
  rerank_top_n: number | null
  output_namespace: string
  output: OFNodeOutput
}

export interface OFPaperRetrievalNodeConfig {
  nodeId: string
  title: string
  desc: string
  query_template: OFPromptItem[]
  provider_id: string
  api_key_ref_id: string | null
  top_k: number
  sort_by: OFPaperRetrievalSortBy
  date_from: string | null
  date_to: string | null
  provider_options: Record<string, string | number | boolean | null>
  output_namespace: string
  output: OFNodeOutput
}

export interface OFEndNodeConfig {
  nodeId: string
  title: string
  desc: string
  output: OFNodeOutput
}
