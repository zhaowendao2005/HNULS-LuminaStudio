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

export interface OFNodeAuthoringDefinition {
  contract: OFNodeAuthoringContract
  warnings_zh?: string[]
  defaults?: OFAuthoringDefaultRecommendation[]
  examples?: Array<{
    label: string
    summary: string
    value?: string | number | boolean | Record<string, unknown> | unknown[] | null
  }>
  system_managed_fields?: string[]
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
