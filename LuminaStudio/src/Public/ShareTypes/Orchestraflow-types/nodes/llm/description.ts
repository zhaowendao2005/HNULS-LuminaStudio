import type { OFNodeAuthoringDescription } from '../../node-definition'

export const llmNodeDescription: OFNodeAuthoringDescription = {
  summary: '调用模型，支持文本输出和可选结构化输出。',
  capabilitySummary: '根据 prompt 调用模型，并自动发布 llm 文本输出与结构化结果。',
  boundariesZh: ['不负责流程控制。', '不手写 runtime output 字段。', '模型配置必须写成 provider/model。'],
  inputDependencies: ['model', 'prompt', '上游变量引用'],
  outputArtifacts: ['llmoutput', 'structured_output(可选)'],
  compositionHints: ['常与 start / set / end 组合。', '需要结构化结果时补 struct。'],
  notes: ['prompt 推荐写多行字符串。']
}
