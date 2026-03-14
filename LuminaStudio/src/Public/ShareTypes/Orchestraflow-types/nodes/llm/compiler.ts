import type { OFNodeCompilerParams } from '../../node-definition'
import type { OFLLMNodeData, OFModelConfig, OFStructuredOutputConfig } from '../../core-types'
import { OFBlockEnum } from '../../core-types'
import { resolveOFNodeOutputNamespace } from '../../node-definition'
import { llmNodeRuntimeDefinition, createDefaultLLMModel } from './runtime'

export const llmNodeCompiler = {
  compileData({ node, compiledId, title, desc, helpers }: OFNodeCompilerParams): OFLLMNodeData {
    const config = node.config as {
      model?: OFModelConfig
      prompt_template?: OFLLMNodeData['prompt_template']
      structured_output?: Partial<OFStructuredOutputConfig>
      context?: OFLLMNodeData['context']
      memory?: OFLLMNodeData['memory']
      vision?: OFLLMNodeData['vision']
    }
    const structuredOutput: OFStructuredOutputConfig = {
      enabled: Boolean(config.structured_output?.enabled),
      schema: config.structured_output?.schema || null
    }
    const outputNamespace =
      resolveOFNodeOutputNamespace(
        { runtime: llmNodeRuntimeDefinition },
        {
          nodeId: compiledId,
          title,
          fallback: 'llm'
        }
      ) || 'llm'
    return {
      title,
      desc,
      type: OFBlockEnum.LLM,
      output_namespace: outputNamespace,
      model: config.model || createDefaultLLMModel(),
      prompt_template: config.prompt_template || [],
      context: helpers.compileNodeContext(config.context),
      memory: config.memory,
      vision: config.vision,
      structured_output: structuredOutput,
      output: {
        variables:
          llmNodeRuntimeDefinition.buildRuntimeOutputVariables?.({
            title: outputNamespace,
            structuredOutput
          }) || []
      }
    }
  }
}
