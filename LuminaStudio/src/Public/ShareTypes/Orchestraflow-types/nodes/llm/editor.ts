import type { OFNodeEditorNormalizeParams } from '../../node-definition'
import type { OFLLMNodeData } from '../../core-types'
import { OFBlockEnum } from '../../core-types'
import {
  buildOFCommonNodeShape,
  normalizeOFNodeTitle,
  resolveOFNodeOutputNamespace
} from '../../node-definition'
import {
  llmNodeRuntimeDefinition,
  createDefaultLLMModel,
  createDefaultLLMStructuredOutput
} from './runtime'

export const llmNodeEditor = {
  createDefaultData({ nodeId, title }: { nodeId: string; title: string }): OFLLMNodeData {
    const structured_output = createDefaultLLMStructuredOutput()
    const outputNamespace =
      resolveOFNodeOutputNamespace(
        { runtime: llmNodeRuntimeDefinition },
        {
          nodeId,
          fallback: 'llm'
        }
      ) || 'llm'
    return {
      title,
      desc: '',
      type: OFBlockEnum.LLM,
      output_namespace: outputNamespace,
      model: createDefaultLLMModel(),
      prompt_template: [],
      structured_output,
      output: {
        variables:
          llmNodeRuntimeDefinition.buildRuntimeOutputVariables?.({
            title: outputNamespace,
            structuredOutput: structured_output
          }) || []
      }
    }
  },
  normalizeData({ node }: OFNodeEditorNormalizeParams): OFLLMNodeData {
    const data = node.data as Partial<OFLLMNodeData>
    const title = normalizeOFNodeTitle(OFBlockEnum.LLM, data.title)
    const structured_output = data.structured_output || createDefaultLLMStructuredOutput()
    const outputNamespace =
      resolveOFNodeOutputNamespace(
        { runtime: llmNodeRuntimeDefinition },
        {
          current: data.output_namespace,
          nodeId: node.id,
          title,
          fallback: 'llm'
        }
      ) || 'llm'
    return {
      ...buildOFCommonNodeShape(data, title),
      type: OFBlockEnum.LLM,
      output_namespace: outputNamespace,
      model: data.model || createDefaultLLMModel(),
      prompt_template: data.prompt_template || [],
      context: data.context,
      memory: data.memory,
      vision: data.vision,
      structured_output,
      output: {
        variables:
          llmNodeRuntimeDefinition.buildRuntimeOutputVariables?.({
            title: outputNamespace,
            structuredOutput: structured_output
          }) || []
      }
    }
  }
}
