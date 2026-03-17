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
export function resolveDiagnosticSuggestions(
  diagnostic: Pick<CheckDiagnostic, 'code' | 'nodeId'> & { context?: Record<string, unknown> }
): string[] {
  const all = listAllTomlSuggestionSpecs()

  // 说明：
  // - 基座建议：只匹配 code
  // - 节点私域建议：同时要求 nodeType 匹配（通过 diagnostic.context.nodeType）
  const nodeType = String(diagnostic.context?.nodeType || '')

  return all
    .filter((s) => {
      if (s.code !== diagnostic.code) {
        return false
      }
      if (!s.nodeType) {
        return true
      }
      return Boolean(nodeType) && s.nodeType === nodeType
    })
    .map((s) => s.message)
}
