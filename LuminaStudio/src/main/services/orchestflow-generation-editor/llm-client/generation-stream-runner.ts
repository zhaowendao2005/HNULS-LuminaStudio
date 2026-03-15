import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenAI } from '@google/genai'
import type { WebContents } from 'electron'
import { logger } from '../../logger'
import type {
  GenerationChannelKey,
  GenerationSdkVendor,
  ModelProviderProtocol
} from '@preload/types'
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
  providerName?: string
  modelId: string
  vendor: GenerationSdkVendor
  protocol: ModelProviderProtocol
  apiKey: string
  baseUrl?: string
  defaultHeaders?: Record<string, string>
  requestContent?: string
  persistRawLlmData: boolean
  messages: GenerationStreamChatMessage[]
}

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
  let hasLoggedFirstDelta = false

  try {
    emitStreamStart(state)

    const result = await streamChatByProtocol({
      protocol: params.protocol,
      vendor: params.vendor,
      modelId: params.modelId,
      apiKey: params.apiKey,
      baseUrl: params.baseUrl,
      defaultHeaders: params.defaultHeaders,
      messages: params.messages,
      signal: state.abortController.signal,
      onTextDelta: (delta) => {
        if (!hasLoggedFirstDelta) {
          hasLoggedFirstDelta = true
          log.info('Stream receiving started', {
            requestId: state.requestId,
            sessionId: state.sessionId,
            channelKey: state.channelKey,
            providerId: params.providerId,
            providerName: params.providerName,
            protocol: params.protocol,
            sdkVendor: params.vendor,
            baseUrl: params.baseUrl,
            modelId: params.modelId
          })
        }
        handleTextDelta(state, params.repository, delta)
      }
    })

    handleFinish(state, params.repository, params.activeStreams, 'stop', result.usage, {
      providerId: params.providerId,
      providerName: params.providerName,
      protocol: params.protocol,
      sdkVendor: params.vendor,
      baseUrl: params.baseUrl,
      modelId: params.modelId,
      requestContent: params.requestContent,
      hasReceivedDelta: hasLoggedFirstDelta,
      persistRawLlmData: params.persistRawLlmData,
      rawResponseText: state.answerText,
      rawTrace: result.rawTrace
    })
  } catch (error) {
    const err = error as { name?: string; message?: string }
    if (err?.name === 'AbortError') {
      handleAbortDiscard(
        state,
        params.repository,
        params.activeStreams,
        '已停止，本次生成内容已丢弃，可重试。'
      )
      return
    }

    log.error('Generate editor stream failed', error, {
      requestId: state.requestId,
      sessionId: state.sessionId,
      channelKey: state.channelKey,
      providerId: params.providerId,
      providerName: params.providerName,
      protocol: params.protocol,
      sdkVendor: params.vendor,
      baseUrl: params.baseUrl,
      modelId: params.modelId
    })

    handleError(state, params.repository, err?.message ?? 'Unknown utility error')
    handleFinish(state, params.repository, params.activeStreams, 'error', undefined, {
      providerId: params.providerId,
      providerName: params.providerName,
      protocol: params.protocol,
      sdkVendor: params.vendor,
      baseUrl: params.baseUrl,
      modelId: params.modelId,
      requestContent: params.requestContent,
      hasReceivedDelta: hasLoggedFirstDelta,
      persistRawLlmData: params.persistRawLlmData,
      rawResponseText: state.answerText,
      rawTrace: []
    })
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
  usage?: Record<string, unknown>,
  logContext?: {
    providerId: string
    providerName?: string
    protocol: ModelProviderProtocol
    sdkVendor: GenerationSdkVendor
    baseUrl?: string
    modelId: string
    requestContent?: string
    hasReceivedDelta: boolean
    persistRawLlmData: boolean
    rawResponseText: string
    rawTrace: unknown[]
  }
): void {
  if (state.terminalStateHandled) {
    activeStreams.delete(state.requestId)
    return
  }
  state.terminalStateHandled = true

  const status =
    finishReason === 'stop' ? 'final' : finishReason === 'aborted' ? 'aborted' : 'error'

  repository.finishMessage({
    messageId: state.messageId,
    content: state.answerText,
    status,
    usage,
    rawResponseText: logContext?.persistRawLlmData
      ? (logContext?.rawResponseText ?? state.answerText)
      : null,
    rawTrace: logContext?.persistRawLlmData ? (logContext?.rawTrace ?? []) : null
  })

  if (logContext) {
    log.info('Stream receiving finished', {
      requestId: state.requestId,
      sessionId: state.sessionId,
      channelKey: state.channelKey,
      providerId: logContext.providerId,
      providerName: logContext.providerName,
      protocol: logContext.protocol,
      sdkVendor: logContext.sdkVendor,
      baseUrl: logContext.baseUrl,
      modelId: logContext.modelId,
      finishReason,
      hasReceivedDelta: logContext.hasReceivedDelta,
      outputChars: state.answerText.length,
      requestContentPreview: buildContentPreview(logContext.requestContent || '')
    })
  }

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

function handleAbortDiscard(
  state: ActiveGenerationStream,
  repository: GenerationEditorRepository,
  activeStreams: Map<string, ActiveGenerationStream>,
  errorMessage: string
): void {
  if (state.terminalStateHandled) {
    activeStreams.delete(state.requestId)
    return
  }
  state.terminalStateHandled = true
  state.answerText = ''

  repository.discardMessageAsFailed(state.messageId, errorMessage)
  repository.touchSession(state.sessionId)

  state.sender.send('orchestflowGenerationEditor:stream', {
    type: 'content-replace',
    requestId: state.requestId,
    sessionId: state.sessionId,
    channelKey: state.channelKey,
    messageId: state.messageId,
    content: ''
  })
  state.sender.send('orchestflowGenerationEditor:stream', {
    type: 'error',
    requestId: state.requestId,
    sessionId: state.sessionId,
    channelKey: state.channelKey,
    messageId: state.messageId,
    message: errorMessage
  })
  state.sender.send('orchestflowGenerationEditor:stream', {
    type: 'finish',
    requestId: state.requestId,
    sessionId: state.sessionId,
    channelKey: state.channelKey,
    messageId: state.messageId,
    finishReason: 'error',
    usageJson: null
  })

  activeStreams.delete(state.requestId)
}

export async function streamChatByProtocol(
  params: StreamChatParams & { protocol: ModelProviderProtocol }
): Promise<StreamChatResult> {
  if (params.protocol === 'claude') {
    return streamAnthropicChat(params)
  }
  if (params.protocol === 'gemini') {
    return streamGoogleChat(params)
  }
  if (params.protocol === 'openai-response') {
    return streamOpenAIResponses(params)
  }
  return streamOpenAIChatCompletions(params)
}

async function streamOpenAIChatCompletions(params: StreamChatParams): Promise<StreamChatResult> {
  const client = new OpenAI({
    apiKey: params.apiKey,
    baseURL: normalizeOpenAICompatibleBaseUrl(params.baseUrl),
    defaultHeaders: params.defaultHeaders
  })

  const rawTrace: unknown[] = []
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
    pushRawTraceEvent(rawTrace, chunk)
    const delta = chunk.choices[0]?.delta?.content ?? ''
    if (delta) {
      params.onTextDelta(delta)
    }
    if (chunk.usage) {
      usage = chunk.usage as unknown as Record<string, unknown>
    }
  }

  return { usage, rawTrace }
}

async function streamOpenAIResponses(params: StreamChatParams): Promise<StreamChatResult> {
  const client = new OpenAI({
    apiKey: params.apiKey,
    baseURL: normalizeOpenAICompatibleBaseUrl(params.baseUrl),
    defaultHeaders: params.defaultHeaders
  })

  const rawTrace: unknown[] = []
  const responseStream = await client.responses.create(
    {
      model: params.modelId,
      stream: true,
      input: params.messages.map((message) => ({
        role: message.role,
        content: [{ type: 'input_text', text: message.content }]
      }))
    },
    {
      signal: params.signal
    }
  )

  let usage: Record<string, unknown> | undefined
  for await (const event of responseStream) {
    pushRawTraceEvent(rawTrace, event)
    if (event.type === 'response.output_text.delta' && event.delta) {
      params.onTextDelta(event.delta)
    }
    if (event.type === 'response.completed' && event.response?.usage) {
      usage = event.response.usage as unknown as Record<string, unknown>
    }
  }

  return { usage, rawTrace }
}

async function streamAnthropicChat(params: StreamChatParams): Promise<StreamChatResult> {
  const client = new Anthropic({
    apiKey: params.apiKey,
    baseURL: params.baseUrl
  })

  const systemMessages = params.messages.filter((message) => message.role === 'system')
  const messages = params.messages
    .filter(
      (message): message is { role: 'user' | 'assistant'; content: string } =>
        message.role === 'user' || message.role === 'assistant'
    )
    .map((message) => ({
      role: message.role,
      content: message.content
    }))

  const rawTrace: unknown[] = []
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
    pushRawTraceEvent(rawTrace, event)
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      params.onTextDelta(event.delta.text)
    }
    if (event.type === 'message_delta' && event.usage) {
      usage = event.usage as unknown as Record<string, unknown>
    }
  }

  return { usage, rawTrace }
}

async function streamGoogleChat(params: StreamChatParams): Promise<StreamChatResult> {
  const client = new GoogleGenAI({
    apiKey: params.apiKey
  })

  const prompt = params.messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join('\n\n')

  const rawTrace: unknown[] = []
  const stream = await client.models.generateContentStream({
    model: params.modelId,
    contents: prompt,
    config: {
      httpOptions: params.baseUrl ? { baseUrl: params.baseUrl } : undefined
    }
  })

  let usage: Record<string, unknown> | undefined
  for await (const chunk of stream) {
    pushRawTraceEvent(rawTrace, chunk)
    const text = typeof chunk.text === 'string' ? chunk.text : ''
    if (text) {
      params.onTextDelta(text)
    }
    if ('usageMetadata' in chunk && chunk.usageMetadata) {
      usage = chunk.usageMetadata as Record<string, unknown>
    }
  }

  return { usage, rawTrace }
}

function pushRawTraceEvent(target: unknown[], event: unknown): void {
  const serialized = safeSerializeRawEvent(event)
  if (serialized !== undefined) {
    target.push(serialized)
  }
}

function safeSerializeRawEvent(event: unknown): unknown {
  if (event === undefined) {
    return undefined
  }

  try {
    return JSON.parse(JSON.stringify(event)) as unknown
  } catch {
    if (event instanceof Error) {
      return {
        name: event.name,
        message: event.message,
        stack: event.stack
      }
    }
    return String(event)
  }
}

function normalizeOpenAICompatibleBaseUrl(baseUrl?: string): string | undefined {
  // 和 NormalChat 保持一致：聚合 API 常常只填 host，不带 /v1，
  // 这里统一补齐，避免 Generate 链路请求到错误端点。
  if (!baseUrl) {
    return undefined
  }

  const normalized = baseUrl.trim().replace(/\/$/, '')
  if (!normalized) {
    return undefined
  }

  return normalized.endsWith('/v1') ? normalized : `${normalized}/v1`
}

function buildContentPreview(content: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return ''
  }
  if (normalized.length <= 200) {
    return normalized
  }
  return `${normalized.slice(0, 200)}...`
}
