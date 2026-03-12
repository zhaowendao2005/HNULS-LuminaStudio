import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenAI } from '@google/genai'
import type { WebContents } from 'electron'
import { logger } from '../../logger'
import type { GenerationChannelKey, GenerationSdkVendor } from '@preload/types'
import type { GenerationEditorRepository } from '../repositories/generation-editor.repository'
import type { ActiveGenerationStream } from '../types/stream.types'
import type { GenerationStreamChatMessage, StreamChatParams, StreamChatResult } from './types'

const log = logger.scope('OrchestflowGenerationEditorStreamRunner')

export interface StartGenerationStreamParams {
  activeStreams: Map<string, ActiveGenerationStream>
  repository: GenerationEditorRepository
  sender: WebContents
  requestId: string
  sessionId: string
  channelKey: GenerationChannelKey
  messageId: string
  providerId: string
  modelId: string
  vendor: GenerationSdkVendor
  apiKey: string
  baseUrl?: string
  messages: GenerationStreamChatMessage[]
}

/**
 * 这个 runner 专门负责主进程内的流式执行闭环：
 * - 建立 AbortController
 * - 调用最小 LLM client
 * - 增量落库
 * - 向 renderer 推送 stream 事件
 * - 最终清理 activeStreams
 *
 * service 层只需要准备好 request 上下文，然后把执行委托给这里。
 */
export function startGenerationStream(params: StartGenerationStreamParams): void {
  const abortController = new AbortController()
  const streamState: ActiveGenerationStream = {
    requestId: params.requestId,
    sessionId: params.sessionId,
    channelKey: params.channelKey,
    messageId: params.messageId,
    sender: params.sender,
    answerText: '',
    providerId: params.providerId,
    modelId: params.modelId,
    abortController
  }

  params.activeStreams.set(params.requestId, streamState)

  void runStream(streamState, params)
}

export function abortGenerationStream(
  activeStreams: Map<string, ActiveGenerationStream>,
  requestId: string
): void {
  activeStreams.get(requestId)?.abortController.abort()
}

async function runStream(
  state: ActiveGenerationStream,
  params: StartGenerationStreamParams
): Promise<void> {
  try {
    emitStreamStart(state)

    const result = await streamChat({
      vendor: params.vendor,
      modelId: params.modelId,
      apiKey: params.apiKey,
      baseUrl: params.baseUrl,
      messages: params.messages,
      signal: state.abortController.signal,
      onTextDelta: (delta) => {
        handleTextDelta(state, params.repository, delta)
      }
    })

    handleFinish(state, params.repository, params.activeStreams, 'stop', result.usage)
  } catch (error) {
    const err = error as { name?: string; message?: string }
    if (err?.name === 'AbortError') {
      handleFinish(state, params.repository, params.activeStreams, 'aborted')
      return
    }

    log.error('Generate editor stream failed', error, {
      requestId: state.requestId,
      sessionId: state.sessionId,
      channelKey: state.channelKey
    })

    handleError(state, params.repository, err?.message ?? 'Unknown utility error')
    handleFinish(state, params.repository, params.activeStreams, 'error')
  }
}

function emitStreamStart(state: ActiveGenerationStream): void {
  state.sender.send('orchestflowGenerationEditor:stream', {
    type: 'stream-start',
    requestId: state.requestId,
    sessionId: state.sessionId,
    channelKey: state.channelKey,
    messageId: state.messageId
  })
}

function handleTextDelta(
  state: ActiveGenerationStream,
  repository: GenerationEditorRepository,
  delta: string
): void {
  state.answerText += delta
  repository.updateMessageContent(state.messageId, state.answerText)

  state.sender.send('orchestflowGenerationEditor:stream', {
    type: 'text-delta',
    requestId: state.requestId,
    sessionId: state.sessionId,
    channelKey: state.channelKey,
    messageId: state.messageId,
    delta
  })
}

function handleError(
  state: ActiveGenerationStream,
  repository: GenerationEditorRepository,
  message: string
): void {
  repository.markMessageError(state.messageId, message)

  state.sender.send('orchestflowGenerationEditor:stream', {
    type: 'error',
    requestId: state.requestId,
    sessionId: state.sessionId,
    channelKey: state.channelKey,
    messageId: state.messageId,
    message
  })
}

function handleFinish(
  state: ActiveGenerationStream,
  repository: GenerationEditorRepository,
  activeStreams: Map<string, ActiveGenerationStream>,
  finishReason: 'stop' | 'aborted' | 'error',
  usage?: Record<string, unknown>
): void {
  const status =
    finishReason === 'stop' ? 'final' : finishReason === 'aborted' ? 'aborted' : 'error'

  repository.finishMessage({
    messageId: state.messageId,
    content: state.answerText,
    status,
    usage
  })

  state.sender.send('orchestflowGenerationEditor:stream', {
    type: 'finish',
    requestId: state.requestId,
    sessionId: state.sessionId,
    channelKey: state.channelKey,
    messageId: state.messageId,
    finishReason,
    usageJson: usage ? JSON.stringify(usage) : null
  })

  repository.touchSession(state.sessionId)
  activeStreams.delete(state.requestId)
}

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
