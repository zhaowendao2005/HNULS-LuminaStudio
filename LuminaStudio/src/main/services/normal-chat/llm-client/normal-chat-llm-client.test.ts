import { describe, expect, it, vi } from 'vitest'
import { ChatOpenAICompletions } from '@langchain/openai'
import { NormalChatLlmClient } from './normal-chat-llm-client'

describe('NormalChatLlmClient', () => {
  it('keeps openai-compatible providers on chat-completions even when modelId looks like claude/gemini', async () => {
    const client = new NormalChatLlmClient({
      getConfig: vi.fn().mockResolvedValue({
        version: 2,
        updatedAt: new Date().toISOString(),
        activeProviderId: 'provider-openai',
        providers: [
          {
            id: 'provider-openai',
            name: 'OpenAI Compatible',
            protocol: 'openai',
            enabled: true,
            baseUrl: 'https://gateway.example.com',
            apiKey: 'test-key',
            defaultHeaders: {
              'X-Test': '1'
            },
            models: [
              {
                id: 'claude-3-5-sonnet',
                displayName: 'Claude 3.5 Sonnet'
              },
              {
                id: 'gemini-2.5-pro',
                displayName: 'Gemini 2.5 Pro'
              }
            ]
          }
        ]
      })
    } as never)

    const claudeLikeModel = await client.createChatModel(
      'provider-openai',
      'claude-3-5-sonnet',
      new AbortController().signal
    )
    const geminiLikeModel = await client.createChatModel(
      'provider-openai',
      'gemini-2.5-pro',
      new AbortController().signal
    )

    expect(claudeLikeModel).toBeInstanceOf(ChatOpenAICompletions)
    expect(geminiLikeModel).toBeInstanceOf(ChatOpenAICompletions)
  })

  it('rejects models that are not registered under the selected provider', async () => {
    const client = new NormalChatLlmClient({
      getConfig: vi.fn().mockResolvedValue({
        version: 2,
        updatedAt: new Date().toISOString(),
        activeProviderId: 'provider-openai',
        providers: [
          {
            id: 'provider-openai',
            name: 'OpenAI Compatible',
            protocol: 'openai',
            enabled: true,
            baseUrl: 'https://gateway.example.com',
            apiKey: 'test-key',
            models: [{ id: 'gpt-4o-mini', displayName: 'GPT-4o Mini' }]
          }
        ]
      })
    } as never)

    await expect(
      client.resolveChatTarget('provider-openai', 'missing-model', new AbortController().signal)
    ).rejects.toThrow('Model not found for provider provider-openai: missing-model')
  })
})
