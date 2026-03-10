import OpenAI from 'openai'
import type { OFProviderConfig } from '@utility/orchestraflow/messages.types'

export interface GenerationLlmTurnInput {
  systemPrompt: string
  userPrompt: string
  temperature?: number
}

export interface GenerationLlmTurnOutput {
  text: string
}

function resolveApiMode(provider: OFProviderConfig): 'responses' | 'chat-completions' {
  if (provider.apiMode === 'responses' || provider.apiMode === 'chat-completions') {
    return provider.apiMode
  }
  return provider.id.includes('openai') ? 'responses' : 'chat-completions'
}

function createClient(provider: OFProviderConfig): OpenAI {
  return new OpenAI({
    apiKey: provider.apiKey,
    baseURL: provider.baseUrl,
    defaultHeaders: provider.defaultHeaders,
    dangerouslyAllowBrowser: false
  })
}

export async function runGenerationTurn(
  provider: OFProviderConfig,
  model: string,
  input: GenerationLlmTurnInput
): Promise<GenerationLlmTurnOutput> {
  const client = createClient(provider)
  const apiMode = resolveApiMode(provider)

  if (apiMode === 'responses') {
    const response = await client.responses.create({
      model,
      temperature: input.temperature,
      instructions: input.systemPrompt,
      input: input.userPrompt
    })
    return {
      text: response.output_text || ''
    }
  }

  const completion = await client.chat.completions.create({
    model,
    temperature: input.temperature,
    messages: [
      { role: 'system', content: input.systemPrompt },
      { role: 'user', content: input.userPrompt }
    ]
  })

  return {
    text: completion.choices[0]?.message?.content || ''
  }
}
