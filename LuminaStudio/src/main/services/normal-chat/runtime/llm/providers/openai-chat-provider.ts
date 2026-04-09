/**
 * OpenAI Chat 提供商
 *
 * 通过 openai 库调用 OpenAI 兼容的 Chat Completions API。
 * 支持非流式和流式两种调用模式。
 *
 * 特性：
 * - Base URL 自动规范化（确保以 /v1 结尾）
 * - 流式调用通过 AsyncGenerator 逐步产出事件
 * - 首 token 延迟追踪
 * - 错误处理通过 extractProviderError 提取标准化错误
 */
import OpenAI from 'openai'
import type { NormalChatModelStreamEvent } from '../model-adapter.interface'
import type { NormalChatProviderConfig } from './provider-config.types'
import type { NormalChatProviderPromptInput } from './index'
import { extractProviderError } from './provider-error'
import { createProviderRequestCaptureFetch } from './provider-request-capture'

/**
 * 规范化 Base URL
 *
 * 确保 URL 以 /v1 结尾（OpenAI API 标准路径）。
 *
 * @param baseUrl - 原始 Base URL
 * @returns 规范化后的 URL
 */
function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/$/, '')
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`
}

function createClient(
  config: NormalChatProviderConfig,
  streaming: boolean,
  prompt: NormalChatProviderPromptInput
): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl ? normalizeBaseUrl(config.baseUrl) : undefined,
    defaultHeaders: config.defaultHeaders,
    fetch: createProviderRequestCaptureFetch({
      config,
      streaming,
      captureContext: prompt.captureContext,
      onCapture: prompt.onCapture
    })
  })
}

/**
 * 调用 OpenAI Chat Completions API（非流式）
 *
 * @param config - 提供商配置
 * @param prompt - Prompt 输入
 * @returns 模型返回的文本响应
 */
export async function callOpenAIChatProvider(
  config: NormalChatProviderConfig,
  prompt: NormalChatProviderPromptInput
): Promise<string> {
  const client = createClient(config, false, prompt)

  try {
    const response = await client.chat.completions.create({
      model: config.modelId,
      messages: [
        { role: 'system', content: prompt.systemPrompt },
        { role: 'user', content: prompt.roundPrompt }
      ]
    })
    return response.choices[0]?.message?.content ?? ''
  } catch (err) {
    throw new Error(extractProviderError(err))
  }
}

/**
 * 流式调用 OpenAI Chat Completions API
 *
 * 通过 AsyncGenerator 逐步产出流式事件：
 * start → first-token → text-delta × N → done
 *
 * @param config - 提供商配置
 * @param prompt - Prompt 输入
 * @returns 异步生成器，产出流式事件
 */
export async function* streamOpenAIChatProvider(
  config: NormalChatProviderConfig,
  prompt: NormalChatProviderPromptInput
): AsyncGenerator<NormalChatModelStreamEvent, string, void> {
  const client = createClient(config, true, prompt)

  try {
    const startedAt = Date.now()
    const stream = await client.chat.completions.create({
      model: config.modelId,
      stream: true,
      messages: [
        { role: 'system', content: prompt.systemPrompt },
        { role: 'user', content: prompt.roundPrompt }
      ]
    })

    let emittedFirstToken = false
    let buffer = ''
    yield { type: 'start' }

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? ''
      if (!delta) {
        continue
      }
      // 首个非空 token 时发射 first-token 事件
      if (!emittedFirstToken) {
        emittedFirstToken = true
        yield { type: 'first-token', latencyMs: Date.now() - startedAt }
      }
      buffer += delta
      yield { type: 'text-delta', delta }
    }

    yield { type: 'done', fullText: buffer }
    return buffer
  } catch (err) {
    const message = extractProviderError(err)
    yield { type: 'error', message }
    throw new Error(message)
  }
}
