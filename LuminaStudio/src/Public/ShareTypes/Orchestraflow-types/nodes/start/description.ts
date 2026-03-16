import type { OFNodeAuthoringDescription } from '../../node-definition'

export const startNodeDescription: OFNodeAuthoringDescription = {
  summary: '定义工作流运行入口的输入变量。',
  capabilitySummary: '负责声明输入 schema，并把入口变量发布到整个工作流上下文。',
  boundariesZh: ['不调用模型。', '不负责业务处理。', '不创建独立输出命名空间。'],
  inputDependencies: ['inputs 中声明的变量 schema'],
  outputArtifacts: ['输入变量本身'],
  compositionHints: ['通常作为第一个节点。', '下游节点通过变量引用直接消费 start 输入。'],
  notes: ['对象默认值要写在 schema.default。']
}
