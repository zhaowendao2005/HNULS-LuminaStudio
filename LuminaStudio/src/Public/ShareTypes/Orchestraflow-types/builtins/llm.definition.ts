import {
  buildOFCommonNodeShape,
  createOFPortSpec,
  defineStandardOFNodeDefinition,
  normalizeOFNodeTitle,
  resolveOFNodeOutputNamespace
} from '../node-definition'
import { ensureOFSelectableVariables, llmOutputVariableDefinition } from '../variable-definition'
import type { OFLLMNodeData, OFModelConfig, OFStructuredOutputConfig } from '../core-types'
import { OFBlockEnum } from '../core-types'
import { omitOFField, omitOFNullSchemaFields } from './helpers'

function buildOutputs(namespace: string, structuredOutput?: OFLLMNodeData['structured_output'] | null) {
  return llmOutputVariableDefinition.build({
    namespace,
    structuredOutput: structuredOutput ?? undefined
  })
}

function createDefaultModel(): OFModelConfig {
  return {
    provider: '',
    name: '',
    completion_params: {
      temperature: 1,
      top_p: 1
    }
  }
}

function createDefaultStructuredOutput(): OFStructuredOutputConfig {
  return {
    enabled: false,
    schema: null
  }
}

export const llmNodeDefinition = defineStandardOFNodeDefinition<OFLLMNodeData>({
  meta: {
    type: OFBlockEnum.LLM,
    title: 'llm',
    summary: '调用模型，支持 prompt_template 和 structured_output。',
    category: 'llm',
    kind: 'standard',
    vueFlowType: 'llm',
    ai_exposed: true
  },
  spec: {
    ports: [
      createOFPortSpec({ id: 'target', label: '进入', direction: 'input', channel: 'control', required: true }),
      createOFPortSpec({ id: 'source', label: '继续', direction: 'output', channel: 'control' }),
      createOFPortSpec({ id: 'llmoutput', label: '文本输出', direction: 'output', channel: 'data' }),
      createOFPortSpec({ id: 'structured_output', label: '结构化输出', direction: 'output', channel: 'data' })
    ],
    system_managed_fields: ['data.output.variables'],
    side_effects: [{ id: 'invoke-model', summary: '调用模型并把结果写入当前节点输出命名空间。' }],
    output_namespace: {
      source: 'system-stable',
      editable: true,
      summary: 'LLM 输出变量使用稳定命名空间；旧工作流会沿用已有值，新节点默认按 nodeId 生成。'
    }
  },
  authoring: {
    contract: {
      type: OFBlockEnum.LLM,
      title: 'llm',
      ai_exposed: true,
      author_required_fields: [
        'data.model.provider',
        'data.model.name',
        'data.structured_output.enabled'
      ],
      compiler_injected_fields: ['data.output.variables'],
      runtime_invariants: [],
      produced_outputs: ['llmoutput', 'structured_output(enabled=true)'],
      notes: ['LLM 节点输出变量由系统按节点命名空间自动派生。']
    },
    warnings_zh: [
      '`structured_output.enabled=false` 时不要写 `structured_output.schema:null`。',
      '`data.model.provider` 和 `data.model.name` 必须同时存在，不能留空对象。'
    ],
    output_policies: ['输出变量按节点命名空间自动派生。'],
    omit_rules: ['`structured_output.enabled=false` 时省略 `structured_output.schema`。']
  },
  prompt: {
    sanitizePromptNode(node) {
      const data = node.data as OFLLMNodeData
      const structuredOutput =
        data.structured_output.enabled === false
          ? omitOFField(data.structured_output, 'schema')
          : data.structured_output
      return {
        ...node,
        data: {
          ...data,
          structured_output: structuredOutput,
          output: {
            ...data.output,
            variables: data.output.variables.map((item) => omitOFNullSchemaFields(item))
          }
        }
      }
    }
  },
  variables: {
    buildRuntimeOutputVariables({ title, structuredOutput }) {
      return buildOutputs(title, structuredOutput)
    },
    getSelectableVariables(node) {
      const data = node.data as OFLLMNodeData
      return ensureOFSelectableVariables(data.output?.variables || [])
    }
  },
  editor: {
    createDefaultData({ nodeId, title }) {
      const structured_output = createDefaultStructuredOutput()
      const outputNamespace =
        resolveOFNodeOutputNamespace(llmNodeDefinition, {
          nodeId,
          fallback: 'llm'
        }) || 'llm'
      return {
        title,
        desc: '',
        type: OFBlockEnum.LLM,
        output_namespace: outputNamespace,
        model: createDefaultModel(),
        prompt_template: [],
        structured_output,
        output: {
          variables: buildOutputs(outputNamespace, structured_output)
        }
      }
    },
    normalizeData({ node }) {
      const data = node.data as Partial<OFLLMNodeData>
      const title = normalizeOFNodeTitle(OFBlockEnum.LLM, data.title)
      const structured_output = data.structured_output || createDefaultStructuredOutput()
      const outputNamespace =
        resolveOFNodeOutputNamespace(llmNodeDefinition, {
          current: data.output_namespace,
          nodeId: node.id,
          title,
          fallback: 'llm'
        }) || 'llm'
      return {
        ...buildOFCommonNodeShape(data, title),
        type: OFBlockEnum.LLM,
        output_namespace: outputNamespace,
        model: data.model || createDefaultModel(),
        prompt_template: data.prompt_template || [],
        context: data.context,
        memory: data.memory,
        vision: data.vision,
        structured_output,
        output: {
          variables: buildOutputs(outputNamespace, structured_output)
        }
      }
    }
  },
  compiler: {
    compileData({ node, compiledId, title, desc, helpers }) {
      const structuredOutput: OFStructuredOutputConfig = {
        enabled: Boolean(node.config.structured_output?.enabled),
        schema:
          (node.config.structured_output?.schema as OFStructuredOutputConfig['schema']) || null
      }
      const outputNamespace =
        resolveOFNodeOutputNamespace(llmNodeDefinition, {
          nodeId: compiledId,
          title,
          fallback: 'llm'
        }) || 'llm'
      return {
        title,
        desc,
        type: OFBlockEnum.LLM,
        output_namespace: outputNamespace,
        model: (node.config.model as OFModelConfig | undefined) || createDefaultModel(),
        prompt_template: (node.config.prompt_template as OFLLMNodeData['prompt_template']) || [],
        context: helpers.compileNodeContext(node.config.context),
        memory: node.config.memory as OFLLMNodeData['memory'],
        vision: node.config.vision as OFLLMNodeData['vision'],
        structured_output: structuredOutput,
        output: {
          variables: buildOutputs(outputNamespace, structuredOutput)
        }
      }
    }
  }
})
