/**
 * 真实模型适配器
 *
 * 实现 NormalChatModelAdapter 接口，通过 ModelConfigService 获取提供商配置，
 * 并调用对应的 LLM 提供商（OpenAI、Claude 等）。
 *
 * 这是 Normal Chat Agent 实际使用的模型适配器实现。
 * 职责：
 * 1. 从 ModelConfigService 中解析提供商配置（API Key、Base URL、协议类型等）
 * 2. 校验提供商和模型是否存在且已启用
 * 3. 将 Prompt 传递给对应的提供商实现（callProvider / streamProvider）
 *
 * 支持的方法：
 * - invokeRound：非流式调用
 * - streamRound：流式调用（仅 OpenAI Chat 支持真正的流式）
 * - smokeTest：冒烟测试（用于检测提供商连通性）
 */
import type { ModelConfigService } from '@main/services/model-config'
import type {
  NormalChatModelAdapter,
  NormalChatModelStreamEvent,
  NormalChatScriptRoundInput
} from './model-adapter.interface'
import type { NormalChatProviderConfig } from './providers/provider-config.types'
import { callProvider, streamProvider } from './providers'

/**
 * 真实模型适配器类
 *
 * 通过 ModelConfigService 动态解析提供商配置，实现 LLM 调用。
 */
export class NormalChatRealModelAdapter implements NormalChatModelAdapter {
  /**
   * @param modelConfigService - 模型配置服务（依赖注入），用于获取提供商配置
   */
  constructor(private readonly modelConfigService: ModelConfigService) {}

  /**
   * 非流式调用 LLM 进行一轮对话
   *
   * @param input - 单轮调用输入参数
   * @returns LLM 返回的完整文本响应
   */
  async invokeRound(input: NormalChatScriptRoundInput): Promise<string> {
    return this.callProviderForModel(input)
  }

  /**
   * 流式调用 LLM 进行一轮对话
   *
   * 通过 AsyncGenerator 逐步产出流式事件。
   * 仅 OpenAI Chat 协议支持真正的流式，其他协议降级为模拟流式。
   *
   * @param input - 单轮调用输入参数
   * @returns 异步生成器，产出流式事件
   */
  async *streamRound(
    input: NormalChatScriptRoundInput
  ): AsyncGenerator<NormalChatModelStreamEvent, string, void> {
    const providerConfig = await this.resolveProviderConfig(
      input.executionSnapshot.request.providerId,
      input.executionSnapshot.request.modelId
    )

    return yield* streamProvider(providerConfig, {
      systemPrompt: input.promptBundle.compiledSystemPrompt,
      roundPrompt: input.promptBundle.compiledRoundPrompt,
      captureContext: {
        requestId: input.requestId,
        modelCallId: input.modelCallId
      },
      onCapture: input.onCaptureProviderRequest
    })
  }

  /**
   * 冒烟测试
   *
   * 用于检测指定提供商和模型的连通性。
   *
   * @param providerId - 提供商 ID
   * @param modelId - 模型 ID
   * @param prompt - 测试 Prompt
   * @returns 模型返回的文本响应
   */
  async smokeTest(providerId: string, modelId: string, prompt: string): Promise<string> {
    const providerConfig = await this.resolveProviderConfig(providerId, modelId)
    return callProvider(providerConfig, {
      systemPrompt: '',
      roundPrompt: prompt,
      captureContext: {
        requestId: 'smoke-test',
        modelCallId: 'smoke-test'
      }
    })
  }

  /**
   * 调用提供商进行非流式对话
   *
   * @param input - 单轮调用输入参数
   * @returns 模型返回的文本响应
   */
  private async callProviderForModel(input: NormalChatScriptRoundInput): Promise<string> {
    const providerConfig = await this.resolveProviderConfig(
      input.executionSnapshot.request.providerId,
      input.executionSnapshot.request.modelId
    )

    return callProvider(providerConfig, {
      systemPrompt: input.promptBundle.compiledSystemPrompt,
      roundPrompt: input.promptBundle.compiledRoundPrompt,
      captureContext: {
        requestId: input.requestId,
        modelCallId: input.modelCallId
      },
      onCapture: input.onCaptureProviderRequest
    })
  }

  /**
   * 解析提供商配置
   *
   * 从 ModelConfigService 中查找指定的提供商和模型，
   * 并构建标准化的提供商配置对象。
   *
   * @param providerId - 提供商 ID
   * @param modelId - 模型 ID
   * @returns 标准化的提供商配置
   * @throws 当提供商不存在/未启用或模型不在提供商的模型列表中时抛出错误
   */
  private async resolveProviderConfig(
    providerId: string,
    modelId: string
  ): Promise<NormalChatProviderConfig> {
    const config = await this.modelConfigService.getConfig()
    const provider = config.providers.find((item) => item.id === providerId && item.enabled)

    if (!provider) {
      throw new Error(`Provider not found or disabled for task snapshot: ${providerId}`)
    }

    const hasModel = provider.models.some((item) => item.id === modelId)
    if (!hasModel) {
      throw new Error(`Model not found on provider ${providerId}: ${modelId}`)
    }

    return {
      providerId: provider.id,
      modelId,
      protocol: provider.protocol,
      apiKey: provider.apiKey,
      baseUrl: provider.baseUrl,
      defaultHeaders: provider.defaultHeaders
    }
  }
}
