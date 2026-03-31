import type { NormalChatProviderConfig } from './provider-config.types'
import { callOpenAIChatProvider } from './openai-chat-provider'
import { callOpenAIResponseProvider } from './openai-response-provider'
import { callClaudeProvider } from './claude-provider'

export type { NormalChatProviderConfig } from './provider-config.types'
export { extractProviderError } from './provider-error'

/**
 * 统一 provider 路由入口。
 * 根据 config.protocol 选择底层 SDK 并发起请求，返回模型原始文本。
 *
 * 错误：各 provider 内部 catch 后以简洁字符串 rethrow，
 * 调用方无需再次包装，直接将错误向上传播即可。
 */
export async function callProvider(
  config: NormalChatProviderConfig,
  prompt: string
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

  // gemini 及其他暂不支持
  throw new Error(
    `Protocol "${protocol}" is not supported in normal-chat LLM client. Supported: openai, openai-completion, openai-response, claude.`
  )
}
