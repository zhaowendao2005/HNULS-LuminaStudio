/**
 * LLMNode - LLM 节点
 *
 * 调用 LLM，使用 langchain（复用现有能力）
 */
import { BaseNode } from './base-node'
import type { OFBlockEnum, OFLLMNodeData } from '@shared/Orchestraflow-types'
import type { ExecutionContext, NodeResult } from './types'
import { VariableStore } from '../services/variable-store'
import { buildChatModelFromProvider } from '../../langchain-client/model-factory'
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

      // 如果没有 model，使用默认配置创建一个
      if (!this.model && nodeData.model) {
        this.model = buildChatModelFromProvider(
          {
            baseUrl: nodeData.model.provider || 'https://api.openai.com/v1',
            apiKey: '' // TODO: 从配置获取 API key
          },
          nodeData.model.name || 'gpt-4'
        )
      }

      if (!this.model) {
        throw new Error('No LLM model configured')
      }

      // 调用 LLM
      const response = await this.model.invoke(messages)

      // 提取文本内容
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

      outputs.response = content
      outputs.raw = response

      // 存储到变量库
      this.setOutput('response', content)
      this.setOutput('raw', response)

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
