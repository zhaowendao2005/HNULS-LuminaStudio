import type { ModelConfigService } from '@main/services/model-config'
import type { NormalChatScriptRoundInput, NormalChatModelAdapter } from './model-adapter.interface'
import type { NormalChatProviderConfig } from './providers/provider-config.types'
import { callProvider } from './providers'

export class NormalChatRealModelAdapter implements NormalChatModelAdapter {
  constructor(private readonly modelConfigService: ModelConfigService) {}

  async invokeRound(input: NormalChatScriptRoundInput): Promise<string> {
    const providerConfig = await this.resolveProviderConfig(
      input.executionSnapshot.request.providerId,
      input.executionSnapshot.request.modelId
    )
    return callProvider(providerConfig, input.promptBundle.promptDocument)
  }

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
