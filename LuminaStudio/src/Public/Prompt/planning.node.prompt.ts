/**
 * Planning 节点提示词（通用工具规划器）
 *
 * 职责：让 LLM 根据可用工具描述，生成工具调用计划
 * 输出格式：{ rationale, toolCalls: [{ toolId, params }] }
 *
 * 替代：
 * - structure-planning/planning.node.ts 内硬编码默认值
 * - Public/ShareTypes/knowledge-qa-default-prompts.ts（旧版格式）
 */

/**
 * Instruction：业务逻辑提示（可安全修改）
 *
 * 控制 LLM 的思考方向和任务理解
 */
export const PLANNING_NODE_INSTRUCTION = `你是一个任务规划助手。根据用户问题和可用工具，制定工具调用计划。

你的任务：
1. 分析用户问题，理解核心需求
2. 从可用工具中选择合适的工具
3. 为每个工具调用确定合适的参数
4. 如果需要多次调用同一工具（如不同检索词），分别列出`

/**
 * Constraint：格式约束提示（谨慎修改，与节点解析逻辑强绑定）
 *
 * 定义 LLM 输出的 JSON schema，修改需同步更新 planning.node.ts 解析逻辑
 *
 * @param maxToolCalls 单轮最大工具调用次数（默认 10）
 */
export function getPlanningNodeConstraint(maxToolCalls: number = 10): string {
  return `请严格按照以下 JSON 格式输出：

{
  "rationale": "你的推理过程（为什么选择这些工具和参数）",
  "toolCalls": [
    {
      "toolId": "工具ID（从可用工具列表中选择）",
      "params": {
        "参数名": "参数值"
      }
    }
  ]
}

约束：
- toolCalls 数组最多 ${maxToolCalls} 个元素
- toolId 必须来自可用工具列表
- params 必须包含工具所需的参数（参考工具的输入说明）`
}
