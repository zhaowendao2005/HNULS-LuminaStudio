/**
 * LLMNode - LLM 节点
 *
 * 调用 LLM，使用 langchain（复用现有能力）
 */
import { z } from 'zod'
import { BaseNode } from './base-node'
import {
  OFBlockEnum,
  OF_LLM_STRUCTURED_OUTPUT_NAME,
  normalizeOFVariableNamespace,
  resolveOFNodeDefinition,
  type OFJsonSchemaProperty,
  type OFLLMNodeData,
  type OFModelCompletionParams,
  type OFModelRequestMode,
  type OFStructuredJsonSchema
} from '@shared/Orchestraflow-types'
import type { ExecutionContext, NodeResult } from './types'
import { VariableStore } from '../services/variable-store'
import { ChatOpenAI } from '@langchain/openai'
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'
import { normalizeOpenAICompatibleBaseUrl } from '@utility/langchain-client/model-factory'

type StructuredResult = {
  raw: AIMessage
  parsed: Record<string, any>
}

type LLMMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type ResponsesApiOutput = {
  raw: Record<string, any>
  content: string
  parsed?: Record<string, any>
  responseMetadata?: Record<string, any>
  usageMetadata?: Record<string, any>
}

export class LLMNode extends BaseNode {
  readonly nodeType: OFBlockEnum.LLM
  private model: ChatOpenAI | null = null

  constructor(node: any, variableStore: VariableStore, model?: ChatOpenAI) {
    super(node, variableStore)
    this.nodeType = OFBlockEnum.LLM
    if (model) {
      this.model = model
    }
  }

  setModel(model: ChatOpenAI): void {
    this.model = model
  }

  async execute(context: ExecutionContext): Promise<NodeResult> {
    this.setContext(context)
    const nodeData = this.getNodeData() as OFLLMNodeData
    const outputs: Record<string, any> = {}

    try {
      if (!nodeData.model) {
        throw new Error('未配置 LLM 模型，请先在节点设置中选择模型')
      }
      if (!nodeData.model.provider) {
        throw new Error('未配置模型 Provider，请先在节点设置中选择模型')
      }
      if (!nodeData.model.name) {
        throw new Error('未配置模型名称，请先在节点设置中选择模型')
      }

      const providerConfig = this.getProviderConfig(nodeData.model.provider)
      const baseUrl = providerConfig?.baseUrl || 'https://api.openai.com'
      const apiKey = providerConfig?.apiKey || ''

      if (!apiKey) {
        console.warn('[OF LLMNode] API key 未配置，将使用空密钥')
      }

      const completionParams = this.normalizeCompletionParams(nodeData.model.completion_params)
      const messages = this.buildMessages(nodeData, context)
      const namespace = normalizeOFVariableNamespace(nodeData.title, 'llm')
      const outputVars =
        resolveOFNodeDefinition(OFBlockEnum.LLM).variables.buildRuntimeOutputVariables?.({
          title: namespace,
          structuredOutput: nodeData.structured_output
        }) || []
      const legacyOutputVars =
        namespace === this.context.node.id
          ? []
          : resolveOFNodeDefinition(OFBlockEnum.LLM).variables.buildRuntimeOutputVariables?.({
              title: this.context.node.id,
              structuredOutput: nodeData.structured_output
            }) || []

      const isStructuredOutputEnabled =
        Boolean(nodeData.structured_output?.enabled) && Boolean(nodeData.structured_output?.schema)
      const requestMode = this.resolveRequestMode(nodeData.model.mode)

      if (requestMode === 'responses') {
        const response = await this.invokeResponsesApi({
          model: nodeData.model.name,
          apiKey,
          baseUrl,
          headers: providerConfig?.defaultHeaders,
          messages,
          completionParams,
          structuredOutput: isStructuredOutputEnabled ? nodeData.structured_output.schema : null
        })

        this.applyOutputs({
          outputVars,
          legacyOutputVars,
          outputs,
          content: response.content,
          structuredValue: response.parsed
        })
        outputs.raw = response.raw
        outputs.response_metadata = response.responseMetadata
        outputs.usage_metadata = response.usageMetadata
        return { outputs }
      }

      this.model = this.createChatModel({
        model: nodeData.model.name,
        apiKey,
        baseUrl,
        headers: providerConfig?.defaultHeaders,
        completionParams
      })

      const langchainMessages = this.toLangchainMessages(messages)

      if (isStructuredOutputEnabled && nodeData.structured_output.schema) {
        const structuredRunner = this.model.withStructuredOutput(
          this.buildZodSchema(nodeData.structured_output.schema),
          {
            name: OF_LLM_STRUCTURED_OUTPUT_NAME,
            includeRaw: true
          }
        )

        const result = (await structuredRunner.invoke(langchainMessages)) as StructuredResult
        const rawContent = this.stringifyMessageContent(result.raw?.content)

        this.applyOutputs({
          outputVars,
          legacyOutputVars,
          outputs,
          content: rawContent,
          structuredValue: result.parsed
        })

        outputs.raw = result.raw
        outputs.response_metadata = (result.raw as any)?.response_metadata
        outputs.usage_metadata = (result.raw as any)?.usage_metadata
        return { outputs }
      }

      const response = await this.model.invoke(langchainMessages)
      const content = this.stringifyMessageContent(response.content)

      this.applyOutputs({
        outputVars,
        legacyOutputVars,
        outputs,
        content
      })

      outputs.raw = response
      outputs.response_metadata = (response as any)?.response_metadata
      outputs.usage_metadata = (response as any)?.usage_metadata
      return { outputs }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        outputs,
        error: errorMessage
      }
    }
  }

  private buildMessages(nodeData: OFLLMNodeData, context: ExecutionContext) {
    const messages: LLMMessage[] = []

    if (nodeData.prompt_template) {
      for (const item of nodeData.prompt_template) {
        const text = item.role === 'user' ? this.replaceVariables(item.text) : item.text
        messages.push({
          role: item.role,
          content: text
        })
      }
    }

    if (messages.length === 0 || messages.every((message) => message.role === 'system')) {
      const inputKeys = Object.keys(context.inputs)
      if (inputKeys.length > 0) {
        const firstInput = context.inputs[inputKeys[0]]
        messages.push({
          role: 'user',
          content: String(firstInput || '')
        })
      }
    }

    return messages
  }

  private toLangchainMessages(messages: LLMMessage[]) {
    return messages.map((message) => {
      if (message.role === 'system') {
        return new SystemMessage(message.content)
      }
      if (message.role === 'assistant') {
        return new AIMessage(message.content)
      }
      return new HumanMessage(message.content)
    })
  }

  /**
   * 替换文本中的变量占位符
   * 格式:
   * - {{input}}
   * - {{sys.workflow_id}}
   * - {{node_xxx.structured_output.reason}}
   */
  private replaceVariables(text: string): string {
    return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, variablePath) => {
      const value = this.variableStore.getByPath(variablePath)
      if (value === undefined) {
        return match
      }
      if (typeof value === 'string') {
        return value
      }
      try {
        return JSON.stringify(value)
      } catch {
        return String(value)
      }
    })
  }

  private stringifyMessageContent(content: unknown): string {
    if (typeof content === 'string') {
      return content
    }
    try {
      return JSON.stringify(content)
    } catch {
      return String(content ?? '')
    }
  }

  private buildZodSchema(schema: OFStructuredJsonSchema) {
    return this.buildSchemaNode(schema)
  }

  private resolveRequestMode(mode?: OFModelRequestMode): OFModelRequestMode {
    return mode === 'responses' ? 'responses' : 'chat-completions'
  }

  private createChatModel(params: {
    model: string
    apiKey: string
    baseUrl: string
    headers?: Record<string, string>
    completionParams: OFModelCompletionParams
  }): ChatOpenAI {
    const modelKwargs: Record<string, any> = {}
    if (params.completionParams.top_k !== undefined) {
      modelKwargs.top_k = params.completionParams.top_k
    }

    const modelOptions: Record<string, any> = {
      model: params.model,
      temperature: params.completionParams.temperature,
      topP: params.completionParams.top_p,
      maxTokens: params.completionParams.max_tokens,
      presencePenalty: params.completionParams.presence_penalty,
      frequencyPenalty: params.completionParams.frequency_penalty,
      modelKwargs: Object.keys(modelKwargs).length > 0 ? modelKwargs : undefined
    }

    Object.keys(modelOptions).forEach((key) => {
      if (modelOptions[key] === undefined) {
        delete modelOptions[key]
      }
    })

    return new ChatOpenAI({
      ...modelOptions,
      apiKey: params.apiKey,
      configuration: {
        baseURL: normalizeOpenAICompatibleBaseUrl(params.baseUrl),
        defaultHeaders: params.headers
      }
    })
  }

  private async invokeResponsesApi(params: {
    model: string
    apiKey: string
    baseUrl: string
    headers?: Record<string, string>
    messages: LLMMessage[]
    completionParams: OFModelCompletionParams
    structuredOutput: OFStructuredJsonSchema | null
  }): Promise<ResponsesApiOutput> {
    const normalizedBaseUrl = normalizeOpenAICompatibleBaseUrl(params.baseUrl)
    const instructions = params.messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content.trim())
      .filter(Boolean)
      .join('\n\n')

    const input = params.messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role,
        content: [
          {
            type: 'input_text',
            text: message.content
          }
        ]
      }))

    const requestBody: Record<string, any> = {
      model: params.model,
      input,
      instructions: instructions || undefined,
      temperature: params.completionParams.temperature,
      top_p: params.completionParams.top_p,
      max_output_tokens: params.completionParams.max_tokens,
      presence_penalty: params.completionParams.presence_penalty,
      frequency_penalty: params.completionParams.frequency_penalty
    }

    if (params.structuredOutput) {
      requestBody.text = {
        format: {
          type: 'json_schema',
          name: OF_LLM_STRUCTURED_OUTPUT_NAME,
          strict: true,
          schema: params.structuredOutput
        }
      }
    }

    Object.keys(requestBody).forEach((key) => {
      if (requestBody[key] === undefined) {
        delete requestBody[key]
      }
    })

    const response = await fetch(`${normalizedBaseUrl}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.apiKey}`,
        ...params.headers
      },
      body: JSON.stringify(requestBody)
    })

    const payload = (await response.json()) as Record<string, any>
    if (!response.ok) {
      const errorMessage =
        (payload.error as { message?: string } | undefined)?.message ||
        `Responses API request failed with status ${response.status}`
      throw new Error(errorMessage)
    }

    const content = this.extractResponsesOutputText(payload)
    const parsed = params.structuredOutput
      ? this.parseStructuredResponsesOutput(content, params.structuredOutput)
      : undefined

    return {
      raw: payload,
      content,
      parsed,
      responseMetadata: {
        id: payload.id,
        model: payload.model,
        status: payload.status,
        incomplete_details: payload.incomplete_details,
        output_count: Array.isArray(payload.output) ? payload.output.length : 0
      },
      usageMetadata: payload.usage
    }
  }

  private extractResponsesOutputText(payload: Record<string, any>): string {
    if (typeof payload.output_text === 'string' && payload.output_text.length > 0) {
      return payload.output_text
    }

    const messageTexts: string[] = []
    const outputs = Array.isArray(payload.output) ? payload.output : []
    for (const item of outputs) {
      if (item?.type !== 'message' || !Array.isArray(item.content)) {
        continue
      }
      for (const contentItem of item.content) {
        if (typeof contentItem?.text === 'string' && contentItem.text.length > 0) {
          messageTexts.push(contentItem.text)
        }
      }
    }

    return messageTexts.join('\n').trim()
  }

  private parseStructuredResponsesOutput(
    content: string,
    schema: OFStructuredJsonSchema
  ): Record<string, any> {
    const parsed = JSON.parse(content) as Record<string, any>
    return this.buildZodSchema(schema).parse(parsed) as Record<string, any>
  }

  private applyOutputs(params: {
    outputVars: Array<{ variable: string; value_selector?: string[] }>
    legacyOutputVars: Array<{ variable: string; value_selector?: string[] }>
    outputs: Record<string, any>
    content: string
    structuredValue?: Record<string, any>
  }) {
    for (const output of params.outputVars) {
      const storeKey = output.value_selector?.[0] || output.variable
      const value =
        output.variable === OF_LLM_STRUCTURED_OUTPUT_NAME
          ? (params.structuredValue ?? null)
          : params.content
      this.setOutput(storeKey, value)
      params.outputs[output.variable] = value
    }
    for (const output of params.legacyOutputVars) {
      const storeKey = output.value_selector?.[0] || output.variable
      const value =
        output.variable === OF_LLM_STRUCTURED_OUTPUT_NAME
          ? (params.structuredValue ?? null)
          : params.content
      this.setOutput(storeKey, value)
    }
  }

  private buildSchemaNode(schema: OFJsonSchemaProperty): z.ZodTypeAny {
    switch (schema.type) {
      case 'boolean': {
        const result = z.boolean()
        return schema.description ? result.describe(schema.description) : result
      }
      case 'number': {
        const result = z.number()
        return schema.description ? result.describe(schema.description) : result
      }
      case 'object': {
        const shape: Record<string, z.ZodTypeAny> = {}
        const requiredSet = new Set(schema.required || [])

        Object.entries(schema.properties || {}).forEach(([key, value]) => {
          const base = this.buildSchemaNode(value)
          shape[key] = requiredSet.has(key) ? base : base.optional()
        })

        const result = z.object(shape).strict()
        return schema.description ? result.describe(schema.description) : result
      }
      case 'string':
      default: {
        const result = z.string()
        return schema.description ? result.describe(schema.description) : result
      }
    }
  }

  private normalizeNumber(value: unknown): number | undefined {
    if (typeof value !== 'number') return undefined
    if (!Number.isFinite(value)) return undefined
    return value
  }

  private normalizeCompletionParams(params?: OFModelCompletionParams): OFModelCompletionParams {
    if (!params) return {}

    const temperatureRaw = this.normalizeNumber(params.temperature)
    const topPRaw = this.normalizeNumber(params.top_p)
    const maxTokensRaw = this.normalizeNumber(params.max_tokens)
    const topKRaw = this.normalizeNumber(params.top_k)
    const presencePenaltyRaw = this.normalizeNumber(params.presence_penalty)
    const frequencyPenaltyRaw = this.normalizeNumber(params.frequency_penalty)

    return {
      temperature:
        temperatureRaw !== undefined ? Math.min(Math.max(temperatureRaw, 0), 2) : undefined,
      top_p: topPRaw !== undefined ? Math.min(Math.max(topPRaw, 0), 1) : undefined,
      max_tokens: maxTokensRaw !== undefined ? Math.max(1, Math.floor(maxTokensRaw)) : undefined,
      top_k: topKRaw !== undefined ? Math.max(1, Math.floor(topKRaw)) : undefined,
      presence_penalty:
        presencePenaltyRaw !== undefined
          ? Math.min(Math.max(presencePenaltyRaw, -2), 2)
          : undefined,
      frequency_penalty:
        frequencyPenaltyRaw !== undefined
          ? Math.min(Math.max(frequencyPenaltyRaw, -2), 2)
          : undefined
    }
  }
}
