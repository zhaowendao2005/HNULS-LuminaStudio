/**
 * OrchestraFlow 统一类型定义
 * 作为此业务的唯一事实来源
 */

import type { XYPosition } from '@vue-flow/core'

// ===== 节点类型枚举 =====
export enum OFBlockEnum {
  Start = 'start',
  LLM = 'llm',
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
/**
 * 统一变量类型枚举
 */
export enum OFVarType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Object = 'object',
  Array = 'array'
}

/**
 * 统一变量定义（用于节点输入/输出配置）
 */
export interface OFVariable {
  /** 变量名（唯一标识，用于数据传递） */
  variable: string
  /** 显示标签 */
  label?: string
  /** 变量类型（用于前端渲染/校验） */
  type?: OFVarType
  /** 描述信息 */
  description?: string
  /** 是否必填 */
  required?: boolean
  /** 默认值 */
  default?: string | number | boolean | object | array
  /** 选项列表（select 类型用） */
  options?: string[]
  /** 值选择器（用于从上游节点获取值） */
  value_selector?: string[]
}

/**
 * 统一节点输入配置
 */
export interface OFNodeInput {
  variables: OFVariable[]
}

/**
 * 统一节点输出配置
 */
export interface OFNodeOutput {
  variables: OFVariable[]
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
export interface OFModelConfig {
  provider: string
  name: string
  mode?: string
  completion_params?: {
    temperature?: number
    top_p?: number
    top_k?: number
    max_tokens?: number
    presence_penalty?: number
    frequency_penalty?: number
  }
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
  output: OFNodeOutput
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
  data: OFStartNodeData | OFLLMNodeData | OFEndNodeData
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
  output: OFNodeOutput
}

export interface OFEndNodeConfig {
  nodeId: string
  title: string
  desc: string
  output: OFNodeOutput
}
