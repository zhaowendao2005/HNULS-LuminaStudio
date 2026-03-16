import type { OFNodeAuthoringDescription } from '../../node-definition'

export const loopNodeDescription: OFNodeAuthoringDescription = {
  summary: '按固定次数或循环变量执行子图。',
  capabilitySummary: '声明循环次数、局部变量和中断条件，并收集循环结果。',
  boundariesZh: [
    '用于显式循环，不是数组映射。',
    'loop-start 由系统管理。',
    '局部循环变量必须显式声明。'
  ],
  inputDependencies: ['loop_count 或 loop_count_selector', 'loop_variables', 'subgraph'],
  outputArtifacts: ['循环结果数组'],
  compositionHints: ['适合重试、采样、多轮自修复。', '复杂 break 条件要写成明确条件数组。'],
  notes: ['loop_count_ref 会在编译时规范成 selector 字段。']
}
