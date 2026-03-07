/**
 * LLMNode - LLM 节点
 *
 * 调用 LLM，使用 langchain（复用现有能力）
 */
import { z } from 'zod'
import { BaseNode } from './base-node'
import {
  OFBlockEnum,
  buildLLMOutputVariables,
  OF_LLM_STRUCTURED_OUTPUT_NAME,
  normalizeOFVariableNamespace,
  type OFLLMNodeData,
  type OFModelCompletionParams,
  type OFStructuredJsonSchema
} from '@shared/Orchestraflow-types'
import type { ExecutionContext, NodeResult } from './types'
import { VariableStore } from '../services/variable-store'
import { ChatOpenAI } from '@langchain/openai'
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'

type StructuredResult = {
  raw: AIMessage
  parsed: Record<string, any>
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
      const baseUrl = providerConfig?.baseUrl || 'https://api.openai.com/v1'
      const apiKey = providerConfig?.apiKey || ''

      if (!apiKey) {
        console.warn('[OF LLMNode] API key 未配置，将使用空密钥')
      }

      const completionParams = this.normalizeCompletionParams(nodeData.model.completion_params)
      const modelKwargs: Record<string, any> = {}
      if (completionParams.top_k !== undefined) {
        modelKwargs.top_k = completionParams.top_k
      }

      const modelOptions: Record<string, any> = {
        model: nodeData.model.name,
        temperature: completionParams.temperature,
        topP: completionParams.top_p,
        maxTokens: completionParams.max_tokens,
        presencePenalty: completionParams.presence_penalty,
        frequencyPenalty: completionParams.frequency_penalty,
        modelKwargs: Object.keys(modelKwargs).length > 0 ? modelKwargs : undefined
      }

      Object.keys(modelOptions).forEach((key) => {
        if (modelOptions[key] === undefined) {
          delete modelOptions[key]
        }
      })

      const normalizedBaseUrl = baseUrl.replace(/\/$/, '')
      this.model = new ChatOpenAI({
        ...modelOptions,
        apiKey,
        configuration: {
          baseURL: normalizedBaseUrl
        }
      })

      const messages = this.buildMessages(nodeData, context)
      const namespace = normalizeOFVariableNamespace(nodeData.title, 'llm')
      const outputVars = buildLLMOutputVariables(namespace, nodeData.structured_output)
      const legacyOutputVars =
        namespace === this.context.node.id
          ? []
          : buildLLMOutputVariables(this.context.node.id, nodeData.structured_output)

      if (nodeData.structured_output?.enabled && nodeData.structured_output.schema) {
        const structuredRunner = this.model.withStructuredOutput(
          this.buildZodSchema(nodeData.structured_output.schema),
          {
            name: OF_LLM_STRUCTURED_OUTPUT_NAME,
            includeRaw: true
          }
        )

        const result = (await structuredRunner.invoke(messages)) as StructuredResult
        const rawContent = this.stringifyMessageContent(result.raw?.content)

        for (const output of outputVars) {
          const storeKey = output.value_selector?.[0] || output.variable
          const value =
            output.variable === OF_LLM_STRUCTURED_OUTPUT_NAME ? result.parsed : rawContent
          this.setOutput(storeKey, value)
          outputs[output.variable] = value
        }
        for (const output of legacyOutputVars) {
          const storeKey = output.value_selector?.[0] || output.variable
          const value =
            output.variable === OF_LLM_STRUCTURED_OUTPUT_NAME ? result.parsed : rawContent
          this.setOutput(storeKey, value)
        }

        outputs.raw = result.raw
        outputs.response_metadata = (result.raw as any)?.response_metadata
        outputs.usage_metadata = (result.raw as any)?.usage_metadata
        return { outputs }
      }

      const response = await this.model.invoke(messages)
      const content = this.stringifyMessageContent(response.content)

      for (const output of outputVars) {
        const storeKey = output.value_selector?.[0] || output.variable
        this.setOutput(storeKey, content)
        outputs[output.variable] = content
      }
      for (const output of legacyOutputVars) {
        const storeKey = output.value_selector?.[0] || output.variable
        this.setOutput(storeKey, content)
      }

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
    const messages: Array<SystemMessage | HumanMessage | AIMessage> = []

    if (nodeData.prompt_template) {
      for (const item of nodeData.prompt_template) {
        if (item.role === 'system') {
          messages.push(new SystemMessage(item.text))
        } else if (item.role === 'assistant') {
          messages.push(new AIMessage(item.text))
        } else {
          messages.push(new HumanMessage(this.replaceVariables(item.text)))
        }
      }
    }

    if (messages.length === 0 || messages.every((message) => message._getType() === 'system')) {
      const inputKeys = Object.keys(context.inputs)
      if (inputKeys.length > 0) {
        const firstInput = context.inputs[inputKeys[0]]
        messages.push(new HumanMessage(String(firstInput || '')))
      }
    }

    return messages
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
    const objectSchema = schema.type === 'array' ? schema.items : schema
    const shape: Record<string, z.ZodTypeAny> = {}
    const requiredSet = new Set(objectSchema.required || [])

    Object.entries(objectSchema.properties || {}).forEach(([key, value]) => {
      let base: z.ZodTypeAny
      switch (value.type) {
        case 'boolean':
          base = z.boolean()
          break
        case 'number':
          base = z.number()
          break
        case 'string':
        default:
          base = z.string()
          break
      }

      if (value.description) {
        base = base.describe(value.description)
      }

      shape[key] = requiredSet.has(key) ? base : base.optional()
    })

    const objectResult = z.object(shape).strict()
    return schema.type === 'array' ? z.array(objectResult) : objectResult
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
