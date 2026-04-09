import type { NormalChatModelStreamEvent } from '../model-adapter.interface'
import type { NormalChatProviderConfig } from './provider-config.types'
import { callOpenAIChatProvider, streamOpenAIChatProvider } from './openai-chat-provider'
import {
  callOpenAIResponseProvider,
  streamOpenAIResponseProvider
} from './openai-response-provider'
import { callClaudeProvider, streamClaudeProvider } from './claude-provider'

export type { NormalChatProviderConfig } from './provider-config.types'
export { extractProviderError } from './provider-error'
export {
  createProviderRequestCaptureFetch
} from './provider-request-capture'
export type { NormalChatCapturedProviderRequest } from './provider-request-capture'

export interface NormalChatProviderPromptInput {
  systemPrompt: string
  roundPrompt: string
  captureContext: {
    requestId: string
    modelCallId: string
  }
  onCapture?: (snapshot: import('./provider-request-capture').NormalChatCapturedProviderRequest) => void
}

export async function callProvider(
  config: NormalChatProviderConfig,
  prompt: NormalChatProviderPromptInput
): Promise<string> {
  const { protocol } = config

  if (protocol === 'openai' || protocol === 'openai-completion') {
    return callOpenAIChatProvider(config, prompt)
  }

  if (protocol === 'openai-response') {
    return callOpenAIResponseProvider(config, prompt)
  }

  if (protocol === 'claude') {
    return callClaudeProvider(config, prompt)
  }

  throw new Error(
    `Protocol "${protocol}" is not supported in normal-chat LLM client. Supported: openai, openai-completion, openai-response, claude.`
  )
}

export async function* streamProvider(
  config: NormalChatProviderConfig,
  prompt: NormalChatProviderPromptInput
): AsyncGenerator<NormalChatModelStreamEvent, string, void> {
  const { protocol } = config

  if (protocol === 'openai' || protocol === 'openai-completion') {
    return yield* streamOpenAIChatProvider(config, prompt)
  }

  if (protocol === 'openai-response') {
    return yield* streamOpenAIResponseProvider(config, prompt)
  }

  if (protocol === 'claude') {
    return yield* streamClaudeProvider(config, prompt)
  }

  throw new Error(
    `Protocol "${protocol}" is not supported in normal-chat streaming client. Supported: openai, openai-completion, openai-response, claude.`
  )
}
