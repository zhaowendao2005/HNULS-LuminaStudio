import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenAI } from '@google/genai'
import type { GenerationSdkVendor } from '@preload/types'
import type { GenerationUtilityChatMessage } from '../messages.types'

export interface StreamChatParams {
  vendor: GenerationSdkVendor
  modelId: string
  apiKey: string
  baseUrl?: string
  messages: GenerationUtilityChatMessage[]
  onTextDelta: (delta: string) => void
  signal: AbortSignal
}

export interface StreamChatResult {
  usage?: Record<string, unknown>
}

/**
 * 用三方官方 SDK 做最小聊天流式封装。
 *
 * 这一版故意不做上下文裁剪、不做工具调用、也不做复杂 prompt 组装，
 * 只负责把一组 messages 发给指定厂商并把增量文本流回主进程。
 */
export async function streamChat(params: StreamChatParams): Promise<StreamChatResult> {
  if (params.vendor === 'anthropic') {
    return streamAnthropicChat(params)
  }
  if (params.vendor === 'google') {
    return streamGoogleChat(params)
  }
  return streamOpenAIChat(params)
}

async function streamOpenAIChat(params: StreamChatParams): Promise<StreamChatResult> {
  const client = new OpenAI({
    apiKey: params.apiKey,
    baseURL: params.baseUrl
  })

  const stream = await client.chat.completions.create(
    {
      model: params.modelId,
      stream: true,
      messages: params.messages.map((message) => ({
        role: message.role,
        content: message.content
      }))
    },
    {
      signal: params.signal
    }
  )

  let usage: Record<string, unknown> | undefined
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? ''
    if (delta) {
      params.onTextDelta(delta)
    }
    if (chunk.usage) {
      usage = chunk.usage as Record<string, unknown>
    }
  }

  return { usage }
}

async function streamAnthropicChat(params: StreamChatParams): Promise<StreamChatResult> {
  const client = new Anthropic({
    apiKey: params.apiKey,
    baseURL: params.baseUrl
  })

  const systemMessages = params.messages.filter((message) => message.role === 'system')
  const messages = params.messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content
    }))

  const stream = await client.messages.stream(
    {
      model: params.modelId,
      max_tokens: 4096,
      system: systemMessages.map((message) => message.content).join('\n\n') || undefined,
      messages
    },
    {
      signal: params.signal
    }
  )

  let usage: Record<string, unknown> | undefined
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      params.onTextDelta(event.delta.text)
    }
    if (event.type === 'message_delta' && event.usage) {
      usage = event.usage as Record<string, unknown>
    }
  }

  return { usage }
}

async function streamGoogleChat(params: StreamChatParams): Promise<StreamChatResult> {
  const client = new GoogleGenAI({
    apiKey: params.apiKey
  })

  const prompt = params.messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join('\n\n')

  const stream = await client.models.generateContentStream({
    model: params.modelId,
    contents: prompt,
    config: {
      httpOptions: params.baseUrl ? { baseUrl: params.baseUrl } : undefined
    }
  })

  let usage: Record<string, unknown> | undefined
  for await (const chunk of stream) {
    const text = typeof chunk.text === 'string' ? chunk.text : ''
    if (text) {
      params.onTextDelta(text)
    }
    if ('usageMetadata' in chunk && chunk.usageMetadata) {
      usage = chunk.usageMetadata as Record<string, unknown>
    }
  }

  return { usage }
}
