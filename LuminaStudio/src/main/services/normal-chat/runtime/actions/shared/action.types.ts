/**
 * Normal Chat 动作（Action）核心类型定义
 *
 * 本文件定义了 Normal Chat Agent 系统中"动作"相关的所有核心类型，
 * 包括动作描述符、动作定义、动作调用、验证结果、权限结果等。
 *
 * 动作系统是 Agent 与外部工具交互的基础：
 * - Agent 通过 LLM 输出 action 块来调用工具
 * - 每个动作有独立的描述符（descriptor）、输入模式（schema）、执行逻辑
 * - 动作分为 system（系统内置）、functioncall（函数调用）、mcp（MCP 协议）三种类型
 */
import type { NormalChatTaskExecutionSnapshot, PaperRetrievalSearchResult } from '@preload/types'
import type { z } from 'zod'
import type { NormalChatActionSchemaDebugSnapshot } from './action-runtime.types'

/**
 * 动作类型枚举
 * - system：系统内置动作（如获取动作规格、分派子 Agent）
 * - functioncall：函数调用动作（如 PubMed 文献检索）
 * - mcp：通过 MCP 协议注册的外部工具动作
 */
export type NormalChatActionKind = 'system' | 'functioncall' | 'mcp'

/**
 * 动作执行模式
 * - fast：快速模式，适合简单、低延迟的操作
 * - slow：慢速模式，适合复杂、高延迟的操作（如深度检索）
 */
export type NormalChatActionMode = 'fast' | 'slow'

/**
 * 动作描述符
 *
 * 描述一个动作的基本元信息，用于向 LLM 和前端展示。
 */
export interface NormalChatActionDescriptor {
  /** 动作的唯一标识键（如 'system.get_action_spec'） */
  key: string
  /** 动作类型（system / functioncall / mcp） */
  kind: NormalChatActionKind
  /** 动作的显示标题（如 'Get Action Spec'） */
  title: string
  /** 动作的功能描述，用于 prompt 中告知 LLM */
  description: string
  /** 默认执行模式（fast 或 slow） */
  defaultMode: NormalChatActionMode
}

/**
 * 动作输入验证结果
 *
 * 用于 validateInput 回调的返回值：
 * - ok: true → 验证通过，可选返回归一化后的输入
 * - ok: false → 验证失败，需指定错误类型（schema/business）、错误消息、是否可重试
 */
export type NormalChatActionValidationResult =
  | { ok: true; normalizedInput?: unknown }
  | { ok: false; kind: 'schema' | 'business'; message: string; retryable: boolean }

/**
 * 动作权限检查结果
 *
 * 用于 checkPermissions 回调的返回值：
 * - allow → 允许执行，可选返回更新后的输入
 * - deny → 拒绝执行，需指定拒绝消息和是否可重试
 */
export type NormalChatActionPermissionResult =
  | { behavior: 'allow'; updatedInput?: unknown }
  | { behavior: 'deny'; message: string; retryable: boolean }

/**
 * 动作运行时上下文
 *
 * 在动作执行时注入的上下文信息，包含任务 ID、请求 ID、
 * 轮次索引、Agent 深度和执行快照等。
 */
export interface NormalChatActionRuntimeContext {
  /** 任务唯一标识 */
  taskId: string
  /** 请求唯一标识 */
  requestId: string
  /** 当前对话轮次索引 */
  roundIndex: number
  /** Agent 嵌套深度（子 Agent 递归调用时递增） */
  agentDepth: number
  /** 任务执行快照，包含当前任务的完整状态 */
  executionSnapshot: NormalChatTaskExecutionSnapshot
}

/**
 * 动作定义
 *
 * 一个动作的完整定义，包含描述符、JSON Schema、Prompt 文本、
 * 输入验证、权限检查等所有信息。
 *
 * 这是动作注册表中存储的核心数据结构。
 */
export interface NormalChatActionDefinition {
  /** 动作描述符（元信息） */
  descriptor: NormalChatActionDescriptor
  /** 面向 LLM 的 JSON Schema（公开 schema，用于 prompt 中展示） */
  schema: Record<string, unknown>
  /** 动作的 Prompt 描述文本，用于指导 LLM 如何调用此动作 */
  prompt: string
  /** 可选的 Zod 输入验证模式（运行时 schema，用于实际校验） */
  inputSchema?: z.ZodType<Record<string, unknown>>
  /** Schema 调试快照，用于开发调试时对比运行时 schema 与公开 schema */
  debugSchemaSnapshot?: NormalChatActionSchemaDebugSnapshot
  /** 是否始终加载（即使未在 agent 配置中显式启用） */
  alwaysLoaded?: boolean
  /** 判断给定输入是否为只读操作（不产生副作用） */
  isReadOnly?(input: Record<string, unknown>): boolean
  /** 判断给定输入是否支持并发执行（与其他动作并行安全） */
  isConcurrencySafe?(input: Record<string, unknown>): boolean
  /** 自定义输入验证回调，用于业务级别的输入校验 */
  validateInput?(
    input: Record<string, unknown>,
    context: NormalChatActionRuntimeContext
  ): Promise<NormalChatActionValidationResult>
  /** 权限检查回调，用于在执行前进行权限控制 */
  checkPermissions?(
    input: Record<string, unknown>,
    context: NormalChatActionRuntimeContext
  ): Promise<NormalChatActionPermissionResult>
}

/**
 * 动作调用
 *
 * 表示 LLM 输出的一个动作调用请求，包含动作键和输入参数。
 * 这是从 LLM 响应中解析出来的原始动作调用结构。
 */
export interface NormalChatActionCall {
  /** 动作标识键（如 'functioncall.pubmed_search'） */
  actionKey: string
  /** 动作的输入参数（键值对对象） */
  input: Record<string, unknown>
}

/**
 * 获取动作规格的输出
 *
 * system.get_action_spec 动作的执行结果，
 * 返回指定动作的完整定义信息。
 */
export interface NormalChatGetActionSpecOutput {
  /** 查询的动作键 */
  actionKey: string
  /** 该动作的完整定义 */
  definition: NormalChatActionDefinition
}

/**
 * 分派子 Agent 的输出
 *
 * system.dispatch_sub_agent 动作的执行结果，
 * 包含子 Agent 的运行 ID、摘要和最终回答。
 */
export interface NormalChatDispatchSubAgentOutput {
  /** 子 Agent 运行的唯一标识 */
  childAgentRunId: string
  /** 子 Agent 执行结果的 Markdown 摘要 */
  summaryMarkdown: string
  /** 子 Agent 的最终回答文本 */
  finalAnswer: string
}

/**
 * PubMed 文献检索的输出
 *
 * functioncall.pubmed_search 动作的执行结果，
 * 包含文献检索的搜索结果。
 */
export interface NormalChatPubmedSearchOutput {
  /** PubMed 检索结果 */
  result: PaperRetrievalSearchResult
}

/**
 * 动作执行器输出的联合类型
 *
 * 所有可能的动作执行结果类型的联合。
 * 新增动作类型时需要在此添加对应的输出类型。
 */
export type NormalChatActionExecutorOutput =
  | NormalChatGetActionSpecOutput
  | NormalChatDispatchSubAgentOutput
  | NormalChatPubmedSearchOutput

/**
 * 已解析的动作
 *
 * 表示一个已经从 agent 配置中解析出来的可用动作，
 * 包含动作的启用状态、执行模式和完整定义。
 */
export interface NormalChatResolvedAction {
  /** 动作标识键 */
  actionKey: string
  /** 动作类型 */
  kind: NormalChatActionKind
  /** 是否已启用 */
  enabled: boolean
  /** 执行模式（fast/slow） */
  mode: NormalChatActionMode
  /** 动作的完整定义 */
  definition: NormalChatActionDefinition
}
