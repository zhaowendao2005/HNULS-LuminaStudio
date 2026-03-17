import { listOFAuthoringNodeDefinitions } from '../node-definition-registry'
import { ofEdgeSuggestionSpecs } from './foundation/edge-suggestions'
import { ofTopologySuggestionSpecs } from './foundation/topology-suggestions'
import { ofVariableSuggestionSpecs } from './foundation/variable-suggestions'
import type { CheckDiagnostic } from './checker-types'
import type { TomlDiagnosticSuggestionSpec } from './spec-types'

/**
 * 收集全部“建议 spec”。
 * - 节点私域：来自 nodeDefinition.authoring.toml.suggestions（可选）
 * - 基座私域：foundation/*-suggestions.ts
 */
export function listAllTomlSuggestionSpecs(): TomlDiagnosticSuggestionSpec[] {
  const fromNodes = listOFAuthoringNodeDefinitions()
    .map((d) => d.authoring.toml.suggestions || [])
    .flat()

  return [
    ...fromNodes,
    ...ofEdgeSuggestionSpecs,
    ...ofTopologySuggestionSpecs,
    ...ofVariableSuggestionSpecs
  ]
}

/**
 * 为某条 diagnostic 解析建议文案。
 * 注意：A 方案只返回“文本建议”，不做自动修复/替换。
 */
export function resolveDiagnosticSuggestions(diagnostic: Pick<CheckDiagnostic, 'code'>): string[] {
  const all = listAllTomlSuggestionSpecs()
  return all.filter((s) => s.code === diagnostic.code).map((s) => s.message)
}
