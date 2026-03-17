import type { TomlDiagnosticSuggestionSpec } from '../spec-types'

/**
 * 工作流基座（edge/连线）相关的建议 spec。
 * 说明：这里只放“建议文案”，不放校验逻辑。
 */
export const ofEdgeSuggestionSpecs: TomlDiagnosticSuggestionSpec[] = [
  {
    code: 'edge-source-missing',
    message: '请检查 edges[].source 是否写错了节点 id，或对应节点是否已被删除。'
  },
  {
    code: 'edge-target-missing',
    message: '请检查 edges[].target 是否写错了节点 id，或对应节点是否已被删除。'
  }
]
