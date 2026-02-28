/**
 * OrchestraFlow (OF) 跨进程类型定义
 * 工作流系统的核心类型
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
export enum OFVarType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Object = 'object',
  Array = 'array'
}

// ===== 输入变量类型 =====
export enum OFInputVarType {
  TextInput = 'text-input',
  Paragraph = 'paragraph',
  Select = 'select',
  Number = 'number',
  Boolean = 'boolean'
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

// ===== 变量定义 =====
export interface OFVariable {
  variable: string
  label?: string | {
    nodeType: OFBlockEnum
    nodeName: string
    variable: string
  }
  value_selector: string[] // [nodeId, key]
  value_type?: OFVarType
  value?: string
  options?: string[]
  required?: boolean
  isParagraph?: boolean
}

// ===== 输入变量 =====
export interface OFInputVar {
  variable: string
  label: string
  type: OFInputVarType
  required: boolean
  options?: string[]
  default?: string | number | boolean
  description?: string
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
export interface OFCommonNodeType<T = {}> {
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
} & T

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
export interface OFStartNodeData extends OFCommonNodeType {
  type: OFBlockEnum.Start
  inputs: OFInputVar[]
}

// ===== LLM 节点数据 =====
export interface OFLLMNodeData extends OFCommonNodeType {
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
}

// ===== End 节点数据 =====
export interface OFEndNodeData extends OFCommonNodeType {
  type: OFBlockEnum.End
  outputs: {
    variable: string
    value_selector: string[]
  }[]
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
