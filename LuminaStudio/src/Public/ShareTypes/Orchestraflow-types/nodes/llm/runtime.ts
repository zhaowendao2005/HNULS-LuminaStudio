import type { OFNodeRuntimeDefinition } from '../../node-definition'
import type { OFLLMNodeData, OFModelConfig, OFStructuredOutputConfig } from '../../core-types'
import { OFBlockEnum } from '../../core-types'
import { createOFPortSpec } from '../../node-definition'
import { ensureOFSelectableVariables, llmOutputVariableDefinition } from '../../variable-definition'

function buildOutputs(
  namespace: string,
  structuredOutput?: OFLLMNodeData['structured_output'] | null
) {
  return llmOutputVariableDefinition.build({
    namespace,
    structuredOutput: structuredOutput ?? undefined
  })
}

export function createDefaultLLMModel(): OFModelConfig {
  return {
    provider: '',
    name: '',
    completion_params: {
      temperature: 1,
      top_p: 1
    }
  }
}

export function createDefaultLLMStructuredOutput(): OFStructuredOutputConfig {
  return {
    enabled: false,
    schema: null
  }
}

export const llmNodeRuntimeDefinition: OFNodeRuntimeDefinition & { kind: 'standard' } = {
  type: OFBlockEnum.LLM,
  title: 'llm',
  summary: '调用模型，支持 prompt_template 和 structured_output。',
  category: 'llm',
  kind: 'standard',
  vueFlowType: 'llm',
  ports: [
    createOFPortSpec({
      id: 'target',
      label: '进入',
      direction: 'input',
      channel: 'control',
      required: true
    }),
    createOFPortSpec({ id: 'source', label: '继续', direction: 'output', channel: 'control' }),
    createOFPortSpec({
      id: 'llmoutput',
      label: '文本输出',
      direction: 'output',
      channel: 'data'
    }),
    createOFPortSpec({
      id: 'structured_output',
      label: '结构化输出',
      direction: 'output',
      channel: 'data'
    })
  ],
  system_managed_fields: ['data.output.variables'],
  side_effects: [{ id: 'invoke-model', summary: '调用模型并把结果写入当前节点输出命名空间。' }],
  output_namespace: {
    source: 'system-stable',
    editable: true,
    summary: 'LLM 输出变量使用稳定命名空间；旧工作流会沿用已有值，新节点默认按 nodeId 生成。'
  },
  buildRuntimeOutputVariables({ title, structuredOutput }) {
    return buildOutputs(title, structuredOutput)
  },
  getSelectableVariables(node) {
    const data = node.data as OFLLMNodeData
    return ensureOFSelectableVariables(data.output?.variables || [])
  }
}
