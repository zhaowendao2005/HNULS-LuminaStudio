/**
 * @file LangGraph 模型注册中心（规范文档 + 导出入口）
 *
 * ╔════════════════════════════════════════════════════════════════╗
 * ║  一、模型定义的本质                                            ║
 * ╚════════════════════════════════════════════════════════════════╝
 *
 * 模型定义 = 「提示词 + LangGraph 状态机」
 * - prompt.ts 说明模型“是谁、应该如何回答”
 * - graph.ts 说明模型“如何执行、如何决策、何时调用节点”
 *
 * 目标：打开某个模型的 graph.ts，就能读懂它的完整状态机流程。
 *
 *
 * ╔════════════════════════════════════════════════════════════════╗
 * ║  二、graph.ts 必须包含的要素                                  ║
 * ╚════════════════════════════════════════════════════════════════╝
 *
 * 1) 状态定义（State）
 *    - input: 用户输入
 *    - history: 历史消息
 *    - retrieval: 检索快照（scopes）
 *    - requestId: 贯通事件
 *    - abortSignal: 支持中断
 *    - fullText: 输出文本
 *
 * 2) 节点（Node）
 *    - 每个 node 只做一件事（单一职责）
 *    - 必须清晰注释“为什么要有这个 node”
 *
 * 3) 边（Edge）
 *    - 必须清晰注释“为什么这样转移”
 *    - 必须解释回退路径（失败/空结果时如何处理）
 *
 *
 * ╔════════════════════════════════════════════════════════════════╗
 * ║  三、事件输出规范                                              ║
 * ╚════════════════════════════════════════════════════════════════╝
 *
 * graph 内部必须发出事件（由 ctx.emit）
 * 事件分为三类：
 *
 * 1) 文本流式事件：
 *    - invoke:text-delta
 *
 * 2) Tool 事件（外部工具执行）：
 *    - invoke:tool-start / invoke:tool-result
 *
 * 3) Node 事件（语义节点）：
 *    - invoke:node-start / invoke:node-result / invoke:node-error
 *
 * UI 只看 nodeKind / uiHint，不再依赖 toolName hack。
 *
 *
 * ╔════════════════════════════════════════════════════════════════╗
 * ║  四、提示词规范（prompt.ts）                                   ║
 * ╚════════════════════════════════════════════════════════════════╝
 *
 * 提示词必须分段注释，说明每一段的意图：
 * - 角色声明（Role Anchoring）
 * - 行为规则（条件句）
 * - 回退策略（防幻觉）
 *
 *
 * ╔════════════════════════════════════════════════════════════════╗
 * ║  五、模型注册                                                 ║
 * ╚════════════════════════════════════════════════════════════════╝
 *
 * 所有模型必须在本文件注册：
 * - registerModel(...)
 * - DEFAULT_MODEL_ID 指向当前默认模型
 */

import type { AgentModelDefinition } from './types'
import { knowledgeQaModel } from './knowledge-qa'

export type { AgentModelDefinition, AgentModelGraphContext } from './types'

const MODEL_REGISTRY = new Map<string, AgentModelDefinition>()

function registerModel(model: AgentModelDefinition): void {
  if (MODEL_REGISTRY.has(model.id)) {
    throw new Error(`[models] 模型 ID 冲突: ${model.id}`)
  }
  MODEL_REGISTRY.set(model.id, model)
}

registerModel(knowledgeQaModel)

export const DEFAULT_MODEL_ID = 'knowledge-qa'

export function resolveModelDefinition(id?: string): AgentModelDefinition {
  const modelId = id ?? DEFAULT_MODEL_ID
  const def = MODEL_REGISTRY.get(modelId)
  if (!def) {
    const available = Array.from(MODEL_REGISTRY.keys()).join(', ')
    throw new Error(`[models] 未知模型: ${modelId}. 可用: [${available}]`)
  }
  return def
}

export function listModelDefinitions(): AgentModelDefinition[] {
  return Array.from(MODEL_REGISTRY.values())
}
