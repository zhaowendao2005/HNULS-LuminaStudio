/**
 * LLMNode - LLM 节点
 *
 * 调用 LLM，使用 langchain（复用现有能力）
 */
import { BaseNode } from './base-node'
import { OFBlockEnum, OFVarType, type OFLLMNodeData } from '@shared/Orchestraflow-types'
import type { ExecutionContext, NodeResult } from './types'
import { VariableStore } from '../services/variable-store'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'

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
      // 验证模型配置
      if (!nodeData.model) {
        throw new Error('未配置 LLM 模型，请先在节点设置中选择模型')
      }
      if (!nodeData.model.provider) {
        throw new Error('未配置模型 Provider，请先在节点设置中选择模型')
      }
      if (!nodeData.model.name) {
        throw new Error('未配置模型名称，请先在节点设置中选择模型')
      }

      // 从 providerConfigs 获取实际配置
      const providerConfig = this.getProviderConfig(nodeData.model.provider)
      const baseUrl = providerConfig?.baseUrl || 'https://api.openai.com/v1'
      const apiKey = providerConfig?.apiKey || ''

      // 如果没有 API key，发出警告
      if (!apiKey) {
        console.warn('[OF LLMNode] API key 未配置，将使用空密钥')
      }

      // 构建模型配置
      const modelOptions: Record<string, any> = {
        model: nodeData.model.name,
        temperature: nodeData.model.completion_params?.temperature,
        top_p: nodeData.model.completion_params?.top_p,
        top_k: nodeData.model.completion_params?.top_k,
        max_tokens: nodeData.model.completion_params?.max_tokens,
        presence_penalty: nodeData.model.completion_params?.presence_penalty,
        frequency_penalty: nodeData.model.completion_params?.frequency_penalty
      }

      // 移除 undefined 值
      Object.keys(modelOptions).forEach((key) => {
        if (modelOptions[key] === undefined) {
          delete modelOptions[key]
        }
      })

      // 创建 ChatOpenAI 实例
      const normalizedBaseUrl = baseUrl.replace(/\/$/, '')
      this.model = new ChatOpenAI({
        ...modelOptions,
        apiKey,
        configuration: {
          baseURL: normalizedBaseUrl
        }
      })

      // 构建 messages
      const messages: any[] = []

      // 添加 system prompt
      if (nodeData.prompt_template) {
        for (const item of nodeData.prompt_template) {
          if (item.role === 'system') {
            messages.push(new SystemMessage(item.text))
          } else if (item.role === 'user') {
            // 替换变量占位符
            const text = this.replaceVariables(item.text)
            messages.push(new HumanMessage(text))
          }
        }
      }

      // 如果没有配置 prompt_template，直接用输入作为 user message
      if (messages.length === 0 || messages.every((m) => m._type === 'system')) {
        // 获取第一个输入值作为 user message
        const inputKeys = Object.keys(context.inputs)
        if (inputKeys.length > 0) {
          const firstInput = context.inputs[inputKeys[0]]
          messages.push(new HumanMessage(String(firstInput || '')))
        }
      }

      // 调用 LLM
      const response = await this.model.invoke(messages)

      // 提取文本内容
      const content =
        typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

      // 根据用户配置的 output.variables 存储变量
      const outputConfig = nodeData.output
      const outputVars = outputConfig?.variables?.length
        ? outputConfig.variables
        : [{ variable: 'response', type: OFVarType.String }]

      for (const output of outputVars) {
        const varName = output.variable
        if (!varName) continue

        // 根据类型处理输出
        let value: any
        switch (output.type) {
          case OFVarType.Object:
            // TODO: 对象类型需要根据用户配置提取响应中的特定字段
            value = content
            break
          case OFVarType.Array:
            // TODO: 数组类型需要解析响应
            value = content
            break
          case OFVarType.String:
          default:
            // 字符串类型：直接输出文本内容
            value = content
            break
        }

        this.setOutput(varName, value)
        outputs[varName] = value
      }

      // 保留 raw 用于调试监控（不参与数据传输）
      outputs.raw = response

      return { outputs }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        outputs,
        error: errorMessage
      }
    }
  }

  /**
   * 替换文本中的变量占位符
   * 格式: {{variable_name}}
   */
  private replaceVariables(text: string): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      const value = this.variableStore.get(varName)
      return value !== undefined ? String(value) : match
    })
  }
}
