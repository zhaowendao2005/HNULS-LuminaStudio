/**
 * Summary 节点提示词（通用证据总结器）
 * 
 * 职责：汇总工具执行结果，判断是否足以回答用户问题
 * 输出格式：{ shouldLoop: boolean, message: string }
 * 
 * 替代：
 * - structure-summary/summary.node.ts 内硬编码默认值
 * - Public/ShareTypes/knowledge-qa-default-prompts.ts
 */

/**
 * Instruction：业务逻辑提示（可安全修改）
 */
export const SUMMARY_NODE_INSTRUCTION = `你是一个证据质量评估助手。根据工具执行结果，判断是否足以回答用户问题。

你的任务：
1. 综合所有工具返回的结果
2. 判断这些结果是否足以完整、准确地回答用户问题
3. 如果足够，生成最终答案
4. 如果不够，说明缺少什么信息（这将作为下一轮检索的指引）`

/**
 * Constraint：格式约束提示（谨慎修改）
 * 
 * @param maxIterations 最大迭代轮次
 */
export function getSummaryNodeConstraint(maxIterations: number = 3): string {
  return `请严格按照以下 JSON 格式输出：

{
  "shouldLoop": true 或 false,
  "message": "你的输出内容"
}

说明：
- 如果 shouldLoop = false：message 是最终答案（给用户）
- 如果 shouldLoop = true：message 说明还缺少什么信息（给规划器）
- 当前最大迭代 ${maxIterations} 轮，达到上限会强制结束`
}
