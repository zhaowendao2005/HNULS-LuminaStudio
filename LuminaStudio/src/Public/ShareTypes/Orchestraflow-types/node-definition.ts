import type { OFBlueprintNode } from './blueprint'
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
export type OFNodeAuthoringToken = 'start' | 'llm' | 'if' | 'iter' | 'loop' | 'set' | 'end'

export interface OFNodeAuthoringExample {
  label: string
  summary: string
  value?: string | number | boolean | Record<string, unknown> | unknown[] | null
}

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
  compileTemplateValue(
    value: string | number | boolean | Record<string, unknown> | unknown[] | null | undefined
  ): string | number | boolean | Record<string, unknown> | unknown[] | null | undefined
  compileContainerSubgraph(
    node: OFBlueprintNode,
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
  node: OFBlueprintNode
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

export interface OFNodeRuntimeInvariant {
  id: string
  level: 'error'
  scope: 'workflow' | 'node' | 'subgraph' | 'edge' | 'selector' | 'variable'
  summary: string
}

export interface OFNodeDslDefinition {
  // dsl 是作者态真相层：
  // 这里只描述 OFT/1 作者应该怎么写，不能倒灌 runtime/editor 的内部字段。
  authoringToken: OFNodeAuthoringToken
  title: string
  summary: string
  sectionForm: '[node.<id>]'
  subgraphSectionForm?: '[subgraph.<container>]'
  allowedKeys: string[]
  requiredKeys: string[]
  legacyTokens?: string[]
  legacyKeyReplacements?: Record<string, string>
  examples?: OFNodeAuthoringExample[]
  warnings_zh?: string[]
}

export interface OFNodeLlmSpec {
  // llmSpec 是给 LLM 的安全暴露层：
  // 它可以转述 dsl/rules，但不能把 runtime 内部字段原样暴露给模型。
  exposed: boolean
  authoringToken: OFNodeAuthoringToken
  title: string
  summary: string
  capability_summary: string
  boundaries_zh: string[]
  input_dependencies: string[]
  output_artifacts: string[]
  composition_hints: string[]
  section_template: string
  required_fields: string[]
  optional_fields: string[]
  examples?: OFNodeAuthoringExample[]
  warnings_zh?: string[]
  selector_policies?: string[]
  output_policies?: string[]
  omit_rules?: string[]
  authoring_hints?: string[]
  notes?: string[]
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

export interface OFNodeRuntimeDefinition {
  // runtime 是固定执行契约：
  // 运行 type、ports、system-managed 字段、变量派生都在这一层收口。
  type: OFBlockEnum
  title: string
  summary: string
  category: OFNodeDefinitionCategory
  kind: OFNodeDefinitionKind
  vueFlowType: string
  internal?: boolean
  ports: OFPortSpec[]
  system_managed_fields?: string[]
  side_effects?: OFNodeSideEffectSpec[]
  output_namespace: OFOutputNamespaceSpec
  container?: OFContainerSpec
  runtime_invariants?: OFNodeRuntimeInvariant[]
  buildRuntimeOutputVariables?(params: OFNodeVariableBuildParams): OFVariable[]
  buildRuntimeInputVariables?(params: OFNodeVariableBuildParams): OFVariable[]
  getSelectableVariables(node: OFNode): OFVariable[]
}

export interface OFStandardNodeDefinition<TData extends OFNode['data'] = OFNode['data']> {
  dsl: OFNodeDslDefinition
  llmSpec: OFNodeLlmSpec
  runtime: OFNodeRuntimeDefinition & { kind: 'standard' }
  // editor / compiler 属于固定实现层：
  // editor 负责默认值和归一化，compiler 负责把作者态编译成 runnable data。
  editor: {
    createDefaultData(params: OFNodeEditorCreateParams): TData
    normalizeData(params: OFNodeEditorNormalizeParams): TData
  }
  compiler: {
    compileData(params: OFNodeCompilerParams): TData
  }
}

export interface OFContainerNodeDefinition<TData extends OFNode['data'] = OFNode['data']> {
  dsl: OFNodeDslDefinition
  llmSpec: OFNodeLlmSpec
  runtime: OFNodeRuntimeDefinition & { kind: 'container' }
  editor: {
    createDefaultData(params: OFNodeEditorCreateParams): TData
    normalizeData(params: OFNodeEditorNormalizeParams): TData
  }
  compiler: {
    compileData(params: OFNodeCompilerParams): TData
  }
}

export interface OFInternalStartNodeDefinition<TData extends OFNode['data'] = OFNode['data']> {
  runtime: OFNodeRuntimeDefinition & { kind: 'internal-start'; internal: true }
  editor: {
    normalizeData(params: OFNodeEditorNormalizeParams): TData
  }
}

export type OFAuthoringNodeDefinition = OFStandardNodeDefinition | OFContainerNodeDefinition

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

export function isOFAuthoringNodeDefinition(
  definition: OFNodeDefinition
): definition is OFAuthoringNodeDefinition {
  return 'dsl' in definition && 'llmSpec' in definition
}

export function createOFPortSpec(port: OFPortSpec): OFPortSpec {
  return port
}

export function resolveOFNodeOutputNamespace(
  definition: Pick<OFNodeDefinition, 'runtime'>,
  params: {
    current?: string
    nodeId?: string
    title?: string
    fallback: string
  }
): string | undefined {
  if (definition.runtime.output_namespace.source === 'none') {
    return undefined
  }
  if (params.current) {
    return normalizeOFVariableNamespace(params.current, params.fallback)
  }
  if (definition.runtime.output_namespace.source === 'system-stable') {
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
