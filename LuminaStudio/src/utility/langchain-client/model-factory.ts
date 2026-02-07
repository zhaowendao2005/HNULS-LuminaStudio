/**
 * ======================================================================
 * 模型工厂 - 构建 LLM 实例
 * ======================================================================
 *
 * 🎯 职责:
 * 把前端的配置转换为 LangChain 能使用的 LLM 实例
 * - 接收: 模型 ID + 提供商配置
 * - 输出: ChatOpenAI 对象（不需要是 OpenAI，支持 OpenAI 兼容 API）
 *
 * 💡 为什么有工厂？
 * - 解耦：配置与 Agent 创建分离
 * - 易扩展：未来支持更多类型的模型（比如 Claude, Llama 等）
 * - 易测试：可以 mock 不同的模型配置
 */
import { ChatOpenAI } from '@langchain/openai'
import type {
  LangchainClientAgentCreateConfig,
  LangchainClientProviderConfig
} from '@shared/langchain-client.types'

/**
 * 规范化 OpenAI 兼容 API 的基础 URL
 *
 * 🎯 正规化规则:
 * - 去除前后空白
 * - 移除末尾的 /
 * - 确保以 /v1 结尾
 *
 * 示例:
 * normalizeOpenAICompatibleBaseUrl('https://api.openai.com/')
 *   → 'https://api.openai.com/v1'
 * normalizeOpenAICompatibleBaseUrl('http://localhost:8000/v1')
 *   → 'http://localhost:8000/v1'
 */
export function normalizeOpenAICompatibleBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/$/, '')
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`
}

/**
 * 构建 LLM 实例
 *
 * 🎯 参数:
 * - modelId: 例如 "gpt-4", "claude-3", "llama-2" 等
 * - provider: 流提供商配置 (网址, API key, 自定义头)
 *
 * 🔄 为什么用 ChatOpenAI？
 * - ChatOpenAI 不需要是 OpenAI 的 API
 * - 支持所有 OpenAI 兼容的 API（比如提供商员云等）
 * - 改个 baseURL 就能指向不同的 LLM 服务
 *
 * 📌 例子:
 * - OpenAI: https://api.openai.com
 * - 召外供应商: https://api.together.ai
 * - 本地 Ollama: http://localhost:11434
 */
export function buildChatModel(config: LangchainClientAgentCreateConfig): ChatOpenAI {
  const baseURL = normalizeOpenAICompatibleBaseUrl(config.provider.baseUrl)

  return new ChatOpenAI({
    model: config.modelId,
    apiKey: config.provider.apiKey,
    configuration: {
      baseURL,
      defaultHeaders: config.provider.defaultHeaders
    }
  })
}

/**
 * 使用 provider + modelId 构建 ChatModel
 */
export function buildChatModelFromProvider(
  provider: LangchainClientProviderConfig,
  modelId: string
): ChatOpenAI {
  const baseURL = normalizeOpenAICompatibleBaseUrl(provider.baseUrl)

  return new ChatOpenAI({
    model: modelId,
    apiKey: provider.apiKey,
    configuration: {
      baseURL,
      defaultHeaders: provider.defaultHeaders
    }
  })
}
