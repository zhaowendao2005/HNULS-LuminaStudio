/**
 * 动作注册表
 *
 * 集中注册和管理所有可用的 Normal Chat 动作定义。
 * 每个动作在此注册其描述符、Zod 输入模式、公开 JSON Schema、
 * Prompt 文本以及可选的验证/权限回调。
 *
 * 当前注册的动作：
 * - system.get_action_spec：获取指定动作的完整定义
 * - system.dispatch_sub_agent：分派子 Agent 执行任务
 * - functioncall.pubmed_search：PubMed 文献检索
 *
 * 新增动作时，需要在此文件中：
 * 1. 导入对应的 descriptor、prompt、schema 模块
 * 2. 定义 Zod 输入验证模式
 * 3. 创建 NormalChatActionDefinition 对象
 * 4. 将其添加到 ACTION_DEFINITIONS Map 中
 */
import { z } from 'zod'
import { getActionSpecActionDescriptor } from '../system/get-action-spec/descriptor'
import { getActionSpecActionPrompt } from '../system/get-action-spec/prompt'
import { getActionSpecActionSchema } from '../system/get-action-spec/schema'
import { dispatchSubAgentActionDescriptor } from '../system/dispatch-sub-agent/descriptor'
import { dispatchSubAgentActionPrompt } from '../system/dispatch-sub-agent/prompt'
import { dispatchSubAgentActionSchema } from '../system/dispatch-sub-agent/schema'
import { pubmedSearchActionDescriptor } from '../functioncall/pubmed-search/descriptor'
import { pubmedSearchActionPrompt } from '../functioncall/pubmed-search/prompt'
import { pubmedSearchActionSchema } from '../functioncall/pubmed-search/schema'
import { createActionSchemaDebugSnapshot } from './schema-debug'
import type { NormalChatActionDefinition } from './action.types'

// ── get_action_spec 动作的 Zod 输入验证模式 ──
// 仅要求一个非空的 action_key 字符串
const getActionSpecInputSchema = z
  .object({
    action_key: z.string().min(1)
  })
  .strict()

// ── dispatch_sub_agent 动作的 Zod 输入验证模式 ──
// goal：必填的目标描述
// enabled_action_keys：可选的启用动作键列表（默认空数组）
// pubmed_mode：PubMed 模式（fast/slow，默认 fast）
// max_react_steps：最大 ReAct 步数（1-8，默认 2）
const dispatchSubAgentInputSchema = z
  .object({
    goal: z.string().min(1),
    enabled_action_keys: z.array(z.string()).default([]),
    pubmed_mode: z.enum(['fast', 'slow']).default('fast'),
    max_react_steps: z.number().int().min(1).max(8).default(2)
  })
  .strict()

// ── pubmed_search 动作的 Zod 输入验证模式 ──
// query：必填的检索关键词（1-300 字符）
// top_k：返回结果数量（1-20，默认 5）
// sort：排序方式（relevance/pub_date，默认 relevance）
// date_from / date_to：日期范围过滤（可为 null）
// api_key_ref_id：API 密钥引用 ID（可为 null）
const pubmedSearchInputSchema = z
  .object({
    query: z.string().trim().min(1).max(300),
    top_k: z.number().int().min(1).max(20).optional().default(5),
    sort: z.enum(['relevance', 'pub_date']).optional().default('relevance'),
    date_from: z.preprocess(
      (value) => (typeof value === 'string' && !value.trim() ? null : value),
      z.string().date().nullable().optional().default(null)
    ),
    date_to: z.preprocess(
      (value) => (typeof value === 'string' && !value.trim() ? null : value),
      z.string().date().nullable().optional().default(null)
    ),
    api_key_ref_id: z.preprocess(
      (value) => (typeof value === 'string' && !value.trim() ? null : value),
      z.string().nullable().optional().default(null)
    )
  })
  .strict()

// ── get_action_spec 动作定义 ──
// 始终加载、只读、支持并发执行
const getActionSpecActionDefinition: NormalChatActionDefinition = {
  descriptor: getActionSpecActionDescriptor,
  schema: getActionSpecActionSchema,
  prompt: getActionSpecActionPrompt,
  inputSchema: getActionSpecInputSchema,
  debugSchemaSnapshot: createActionSchemaDebugSnapshot({
    actionKey: getActionSpecActionDescriptor.key,
    runtimeSchema: getActionSpecInputSchema,
    publicSchema: getActionSpecActionSchema
  }),
  alwaysLoaded: true,
  isReadOnly: () => true,
  isConcurrencySafe: () => true
}

// ── dispatch_sub_agent 动作定义 ──
// 始终加载、非只读（会产生副作用）、不支持并发
// 包含自定义的 goal 非空验证
const dispatchSubAgentActionDefinition: NormalChatActionDefinition = {
  descriptor: dispatchSubAgentActionDescriptor,
  schema: dispatchSubAgentActionSchema,
  prompt: dispatchSubAgentActionPrompt,
  inputSchema: dispatchSubAgentInputSchema,
  debugSchemaSnapshot: createActionSchemaDebugSnapshot({
    actionKey: dispatchSubAgentActionDescriptor.key,
    runtimeSchema: dispatchSubAgentInputSchema,
    publicSchema: dispatchSubAgentActionSchema
  }),
  alwaysLoaded: true,
  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  async validateInput(input) {
    const goal = String(input.goal ?? '').trim()
    if (!goal) {
      return {
        ok: false,
        kind: 'business',
        message: 'Subagent goal 不能为空。',
        retryable: true
      }
    }
    return { ok: true }
  }
}

// ── pubmed_search 动作定义 ──
// 非始终加载（需在 agent 配置中显式启用）、只读、支持并发执行
const pubmedSearchActionDefinition: NormalChatActionDefinition = {
  descriptor: pubmedSearchActionDescriptor,
  schema: pubmedSearchActionSchema,
  prompt: pubmedSearchActionPrompt,
  inputSchema: pubmedSearchInputSchema,
  debugSchemaSnapshot: createActionSchemaDebugSnapshot({
    actionKey: pubmedSearchActionDescriptor.key,
    runtimeSchema: pubmedSearchInputSchema,
    publicSchema: pubmedSearchActionSchema
  }),
  isReadOnly: () => true,
  isConcurrencySafe: () => true
}

// ── 动作定义注册表 ──
// 使用 Map 以 actionKey 为键存储所有动作定义
const ACTION_DEFINITIONS = new Map<string, NormalChatActionDefinition>([
  [getActionSpecActionDefinition.descriptor.key, getActionSpecActionDefinition],
  [dispatchSubAgentActionDefinition.descriptor.key, dispatchSubAgentActionDefinition],
  [pubmedSearchActionDefinition.descriptor.key, pubmedSearchActionDefinition]
])

/**
 * 列出所有已注册的动作定义
 * @returns 所有动作定义的数组
 */
export function listNormalChatActionDefinitions(): NormalChatActionDefinition[] {
  return Array.from(ACTION_DEFINITIONS.values())
}

/**
 * 根据动作键获取动作定义
 * @param actionKey - 动作标识键
 * @returns 动作定义，未找到时返回 null
 */
export function getNormalChatActionDefinition(
  actionKey: string
): NormalChatActionDefinition | null {
  return ACTION_DEFINITIONS.get(actionKey) ?? null
}
