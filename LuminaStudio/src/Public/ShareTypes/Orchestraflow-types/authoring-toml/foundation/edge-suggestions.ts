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
  },
  {
    code: 'invalid-source-handle',
    message:
      'sourceHandle 必须匹配 source 节点的输出端口 id（runtime.ports）。例如 Start 常用 source，LLM 常用 source/llmoutput/structured_output。'
  },
  {
    code: 'ifelse-source-handle-not-a-branch',
    message:
      'If 节点是多出口节点：sourceHandle 必须等于 cases[].handleId 或 else。推荐 handleId 命名：if / elif-1 / elif-2 ... / else。'
  },
  {
    code: 'invalid-target-handle',
    message:
      'targetHandle 必须匹配 target 节点的输入端口 id（runtime.ports）。例如 LLM/If/Set/End 通常用 target。'
  }
]
