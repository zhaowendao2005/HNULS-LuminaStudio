import type { OFBlueprintNode } from './blueprint'
import type { TomlDiagnosticSuggestionSpec } from './authoring-toml/spec-types'
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
export type OFNodeAuthoringToken =
  | 'start'
  | 'llm'
  | 'if'
  | 'iter'
  | 'loop'
  | 'set'
  | 'knowledge-retrieval'
  | 'paper-retrieval'
  | 'end'

export interface OFNodeAuthoringExample {
  label: string
  summary: string
  value?: string | number | boolean | Record<string, unknown> | unknown[] | null
}

export interface OFNodeAuthoringDescription {
  summary: string
  capabilitySummary: string
  boundariesZh: string[]
  inputDependencies: string[]
  outputArtifacts: string[]
  compositionHints: string[]
  notes?: string[]
}

export interface OFNodeAuthoringTomlFieldDefinition {
  key: string
  required: boolean
  summary: string
  example?: string
  multiline?: boolean
}

export interface OFNodeAuthoringTomlDefinition {
  sectionTemplate: string
  requiredFields: string[]
  optionalFields: string[]
  fields: OFNodeAuthoringTomlFieldDefinition[]
  exampleBlocks: string[]
  /**
   * 建议 spec（节点私域）。
   * 说明：只提供“建议文案”，不提供校验逻辑。
   * 未来如果要增强（条件过滤/上下文匹配），再扩展 spec-types.ts。
   */
  suggestions?: TomlDiagnosticSuggestionSpec[]
}

export interface OFNodeAuthoringDefinition {
  token: OFNodeAuthoringToken
  title: string
  description: OFNodeAuthoringDescription
  mainPrompt: string
  errorGuidance: string[]
  toml: OFNodeAuthoringTomlDefinition
  legacyTokens?: string[]
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
  authoring: OFNodeAuthoringDefinition
  runtime: OFNodeRuntimeDefinition & { kind: 'standard' }
  editor: {
    createDefaultData(params: OFNodeEditorCreateParams): TData
    normalizeData(params: OFNodeEditorNormalizeParams): TData
  }
  compiler: {
    compileData(params: OFNodeCompilerParams): TData
  }
}

export interface OFContainerNodeDefinition<TData extends OFNode['data'] = OFNode['data']> {
  authoring: OFNodeAuthoringDefinition
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
  return 'authoring' in definition
}

export function createOFPortSpec(
  input: Omit<OFPortSpec, 'required' | 'multi' | 'internal'> & Partial<OFPortSpec>
): OFPortSpec {
  return {
    required: true,
    multi: false,
    internal: false,
    ...input
  }
}

export function resolveOFNodeOutputNamespace(
  definition: Pick<OFStandardNodeDefinition | OFContainerNodeDefinition, 'runtime'>,
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
    case OFBlockEnum.KnowledgeRetrieval:
      return '知识检索'
    case OFBlockEnum.PaperRetrieval:
      return '论文检索'
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
  if (type === OFBlockEnum.KnowledgeRetrieval) {
    return normalizeOFVariableNamespace(trimmed, 'knowledge_retrieval')
  }
  if (type === OFBlockEnum.PaperRetrieval) {
    return normalizeOFVariableNamespace(trimmed, 'paper_retrieval')
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
