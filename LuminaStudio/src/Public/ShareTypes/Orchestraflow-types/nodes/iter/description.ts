import type { OFNodeAuthoringDescription } from '../../node-definition'

export const iterationNodeDescription: OFNodeAuthoringDescription = {
  summary: '对数组输入逐项执行子图，并收集结果。',
  capabilitySummary: '负责声明迭代来源、子图和输出汇总策略。',
  boundariesZh: [
    '只处理数组迭代。',
    '子图必须从系统管理的 iteration-start 开始。',
    'start_node_id 由系统管理。'
  ],
  inputDependencies: ['iterator_selector', 'subgraph', 'output_selector'],
  outputArtifacts: ['迭代结果数组'],
  compositionHints: ['适合对一组条目逐个摘要、映射或清洗。', '子图尽量短小，避免深层嵌套。'],
  notes: ['branch_output_selectors 可选，用于汇总子图内分支输出。']
}
