import type { OFNodeAuthoringDescription } from '../../node-definition'

export const ifNodeDescription: OFNodeAuthoringDescription = {
  summary: '根据条件把执行流分到 if / elif / else 分支。',
  capabilitySummary: '读取变量并根据条件表达式选择控制流。',
  boundariesZh: ['不直接调用模型。', '条件必须依赖变量或常量比较。', 'handleId 由系统管理。'],
  inputDependencies: ['cases[].conditions', 'else 分支'],
  outputArtifacts: ['控制流选择'],
  compositionHints: ['常位于 start / llm 之后。', '复杂判断尽量拆成多条明确条件。'],
  notes: ['条件数组中的 logical_operator 默认按 and 处理。']
}
