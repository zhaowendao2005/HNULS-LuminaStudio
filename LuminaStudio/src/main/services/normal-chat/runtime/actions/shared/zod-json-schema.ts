/**
 * Zod Schema 转 JSON Schema 工具
 *
 * 将 Zod v4 Schema 转换为标准 JSON Schema 格式。
 *
 * 该工具主要用于调试场景（schema-debug.ts），将运行时的 Zod 校验模式
 * 转换为可读的 JSON Schema，便于与面向 LLM 的公开 Schema 进行对比。
 *
 * 注意：这里使用的是 zod/v4 的 toJSONSchema API，
 * 与 zod-to-json-schema 第三方库不同。
 */
import { toJSONSchema, type ZodTypeAny } from 'zod/v4'

/**
 * 将 Zod Schema 转换为 JSON Schema 对象
 *
 * @param schema - Zod Schema 实例
 * @returns JSON Schema 格式的对象
 */
export function zodToJsonSchema(schema: ZodTypeAny): Record<string, unknown> {
  return toJSONSchema(schema) as Record<string, unknown>
}
