import type { OFNodeAuthoringDescription } from '../../node-definition'

export const endNodeDescription: OFNodeAuthoringDescription = {
  summary: '声明工作流最终输出。',
  capabilitySummary: '从已有变量中挑选需要返回给工作流调用方的结果。',
  boundariesZh: ['不调用模型。', '只负责输出收口。', '输出必须来自已有变量。'],
  inputDependencies: ['outputs'],
  outputArtifacts: ['工作流最终输出'],
  compositionHints: ['通常作为最后一个节点。', '建议只暴露必要字段。'],
  notes: ['输出数组顺序会影响阅读，但不影响运行。']
}
