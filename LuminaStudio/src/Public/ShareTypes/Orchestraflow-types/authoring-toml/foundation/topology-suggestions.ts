import type { TomlDiagnosticSuggestionSpec } from '../spec-types'

/**
 * 工作流基座（拓扑）相关的建议 spec。
 * 说明：这里只放“建议文案”，不放校验逻辑。
 */
export const ofTopologySuggestionSpecs: TomlDiagnosticSuggestionSpec[] = [
  {
    code: 'start-node-count-invalid',
    message: '工作流必须且只能有一个 start 节点；请删除多余的 start，或补上缺失的 start。'
  },
  {
    code: 'end-node-missing',
    message: '工作流至少需要一个 end 节点；请在末尾增加 end 节点并连线到它。'
  },
  {
    code: 'subgraph-required',
    nodeType: 'iter',
    message:
      'Iter 节点必须提供 subgraph。可以先写一个最小子图：subgraph = { nodes = [...], edges = [...] }。'
  },
  {
    code: 'subgraph-required',
    nodeType: 'loop',
    message:
      'Loop 节点必须提供 subgraph。可以先写一个最小子图：subgraph = { nodes = [...], edges = [...] }。'
  }
]
