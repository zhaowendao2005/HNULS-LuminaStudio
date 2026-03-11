import type { OFAIDslNode, OFAuthoringDefaultRecommendation } from './ai-schema'
import type { OFNodeAuthoringContract } from './contract'
import type {
  OFIfElseCondition,
  OFIterationBranchOutputRef,
  OFIterationNodeData,
  OFLLMNodeData,
  OFLoopVariableData,
  OFNode,
  OFStructuredOutputConfig,
  OFVariable,
  OFVariableAssignRule
} from './core-types'
import { OFBlockEnum, normalizeOFVariableNamespace } from './core-types'

export type OFNodeDefinitionCategory = 'start' | 'llm' | 'logic' | 'end' | 'internal'
export type OFNodeDefinitionKind = 'standard' | 'container' | 'internal-start'

export interface OFNodeVariableBuildParams {
  nodeId?: string
  title: string
  structuredOutput?: OFStructuredOutputConfig | null
  loopVariables?: OFLoopVariableData[]
  rules?: OFVariableAssignRule[]
}

export interface OFNodeCompilerHelpers {
  compileVariables(source: unknown[]): OFVariable[]
  compileLoopVariables(source: unknown[]): OFLoopVariableData[]
  compileConditions(source: unknown[]): OFIfElseCondition[]
  compileIterationBranchOutputSelectors(source: unknown[]): OFIterationBranchOutputRef[]
  compileNodeContext(value: OFLLMNodeData['context']): OFLLMNodeData['context']
  compileSelectorField(value: unknown): string[]
  compileContainerSubgraph(
    node: OFAIDslNode,
    compiledId: string,
    title: string,
    type: OFBlockEnum.Iteration | OFBlockEnum.Loop,
    loopVariables?: OFLoopVariableData[]
  ): {
    graph: OFIterationNodeData['subgraph']
    idMap: Map<string, string>
  }
}

export interface OFNodeCompilerParams {
  node: OFAIDslNode
  compiledId: string
  title: string
  desc: string
  helpers: OFNodeCompilerHelpers
}

export interface OFNodeEditorHelpers {
  normalizeNode(node: OFNode): OFNode
}

export interface OFNodeEditorCreateParams {
  nodeId: string
  title: string
}

export interface OFNodeEditorNormalizeParams {
  node: OFNode
  helpers: OFNodeEditorHelpers
}

export interface OFNodeDefinitionMeta {
  type: OFBlockEnum
  title: string
  summary: string
  category: OFNodeDefinitionCategory
  kind: OFNodeDefinitionKind
  vueFlowType: string
  internal?: boolean
  ai_exposed: boolean
}

export type OFPortDirection = 'input' | 'output'
export type OFPortChannel = 'control' | 'data'

export interface OFPortSpec {
  id: string
  label: string
  direction: OFPortDirection
  channel: OFPortChannel
  required?: boolean
  multi?: boolean
  internal?: boolean
}

export interface OFNodeSideEffectSpec {
  id: string
  summary: string
}

export interface OFOutputNamespaceSpec {
  // 这里先把“当前真实来源”描述清楚，后续再把 title-driven 迁到稳定 namespace。
  source: 'title-derived' | 'system-stable' | 'none'
  editable?: boolean
  summary: string
}

export interface OFContainerSpec {
  internal_start_node_type: OFBlockEnum.IterationStart | OFBlockEnum.LoopStart
  managed_subgraph: true
  default_viewport?: {
    x: number
    y: number
    zoom: number
  }
}

export interface OFNodeSpec {
  // 这是新的结构真相层：以后凡是节点结构、端口、命名空间、容器约束，都先看这里。
  ports: OFPortSpec[]
  system_managed_fields?: string[]
  side_effects?: OFNodeSideEffectSpec[]
  output_namespace: OFOutputNamespaceSpec
  container?: OFContainerSpec
}

export interface OFNodeAuthoringDefinition {
  contract: OFNodeAuthoringContract
  warnings_zh?: string[]
  defaults?: OFAuthoringDefaultRecommendation[]
  examples?: Array<{
    label: string
    summary: string
    value?: string | number | boolean | Record<string, unknown> | unknown[] | null
  }>
  selector_policies?: string[]
  output_policies?: string[]
  omit_rules?: string[]
  residual_notes_zh?: string[]
}

export interface OFNodePromptDefinition {
  sanitizePromptNode?(node: OFNode): OFNode
}

export interface OFNodeVariablesDefinition {
  buildRuntimeOutputVariables?(params: OFNodeVariableBuildParams): OFVariable[]
  buildRuntimeInputVariables?(params: OFNodeVariableBuildParams): OFVariable[]
  getSelectableVariables(node: OFNode): OFVariable[]
}

export interface OFStandardNodeDefinition<TData extends OFNode['data'] = OFNode['data']> {
  meta: OFNodeDefinitionMeta & { kind: 'standard' }
  spec: OFNodeSpec
  authoring: OFNodeAuthoringDefinition
  prompt?: OFNodePromptDefinition
  variables: OFNodeVariablesDefinition
  editor: {
    createDefaultData(params: OFNodeEditorCreateParams): TData
    normalizeData(params: OFNodeEditorNormalizeParams): TData
  }
  compiler: {
    compileData(params: OFNodeCompilerParams): TData
  }
}

export interface OFContainerNodeDefinition<TData extends OFNode['data'] = OFNode['data']> {
  meta: OFNodeDefinitionMeta & { kind: 'container' }
  spec: OFNodeSpec
  authoring: OFNodeAuthoringDefinition
  prompt?: OFNodePromptDefinition
  variables: OFNodeVariablesDefinition
  editor: {
    createDefaultData(params: OFNodeEditorCreateParams): TData
    normalizeData(params: OFNodeEditorNormalizeParams): TData
  }
  compiler: {
    compileData(params: OFNodeCompilerParams): TData
  }
}

export interface OFInternalStartNodeDefinition<TData extends OFNode['data'] = OFNode['data']> {
  meta: OFNodeDefinitionMeta & { kind: 'internal-start'; internal: true; ai_exposed: false }
  spec: OFNodeSpec
  authoring: OFNodeAuthoringDefinition
  prompt?: OFNodePromptDefinition
  variables: OFNodeVariablesDefinition
  editor: {
    normalizeData(params: OFNodeEditorNormalizeParams): TData
  }
}

export type OFNodeDefinition =
  | OFStandardNodeDefinition
  | OFContainerNodeDefinition
  | OFInternalStartNodeDefinition

export function defineStandardOFNodeDefinition<TData extends OFNode['data']>(
  definition: OFStandardNodeDefinition<TData>
): OFStandardNodeDefinition<TData> {
  return definition
}

export function defineContainerOFNodeDefinition<TData extends OFNode['data']>(
  definition: OFContainerNodeDefinition<TData>
): OFContainerNodeDefinition<TData> {
  return definition
}

export function defineInternalStartOFNodeDefinition<TData extends OFNode['data']>(
  definition: OFInternalStartNodeDefinition<TData>
): OFInternalStartNodeDefinition<TData> {
  return definition
}

export function createOFPortSpec(port: OFPortSpec): OFPortSpec {
  return port
}

export function resolveOFNodeOutputNamespace(
  definition: Pick<OFNodeDefinition, 'spec'>,
  params: {
    current?: string
    nodeId?: string
    title?: string
    fallback: string
  }
): string | undefined {
  // 这里统一节点输出命名空间的生成策略：
  // - none: 该节点不产生独立输出命名空间
  // - current: 已有值时优先保留，避免改造时把旧引用打断
  // - system-stable: 新节点默认基于 nodeId/fallback 生成稳定命名空间
  // - title-derived: 仅对仍未迁移的旧兼容节点保留
  if (definition.spec.output_namespace.source === 'none') {
    return undefined
  }
  if (params.current) {
    return normalizeOFVariableNamespace(params.current, params.fallback)
  }
  if (definition.spec.output_namespace.source === 'system-stable') {
    return normalizeOFVariableNamespace(params.nodeId, params.fallback)
  }
  return normalizeOFVariableNamespace(params.title, params.fallback)
}

export function getOFDefaultNodeTitle(type: OFBlockEnum): string {
  switch (type) {
    case OFBlockEnum.LLM:
      return 'llm'
    case OFBlockEnum.Iteration:
      return '迭代'
    case OFBlockEnum.IterationStart:
      return '迭代开始'
    case OFBlockEnum.IfElse:
      return '条件分支'
    case OFBlockEnum.Start:
      return '开始'
    case OFBlockEnum.Loop:
      return '循环'
    case OFBlockEnum.LoopStart:
      return '循环开始'
    case OFBlockEnum.VariableAssign:
      return '变量赋值'
    case OFBlockEnum.End:
      return '结束'
    default:
      return 'node'
  }
}

export function normalizeOFNodeTitle(type: OFBlockEnum, raw: string | undefined): string {
  const trimmed = String(raw || '').trim()
  if (type === OFBlockEnum.LLM) {
    return normalizeOFVariableNamespace(trimmed, 'llm')
  }
  if (type === OFBlockEnum.Loop) {
    return trimmed || '循环'
  }
  if (type === OFBlockEnum.LoopStart) {
    return trimmed || '循环开始'
  }
  return trimmed || getOFDefaultNodeTitle(type)
}

export function buildOFCommonNodeShape<
  T extends { title?: string; desc?: string; width?: number; height?: number }
>(raw: T, title: string, fallbackDesc = '') {
  return {
    title,
    desc: raw.desc || fallbackDesc,
    width: raw.width,
    height: raw.height
  }
}
