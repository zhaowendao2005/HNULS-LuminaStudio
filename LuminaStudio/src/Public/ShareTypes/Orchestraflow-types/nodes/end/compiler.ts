import type { OFNodeCompilerParams } from '../../node-definition'
import type { OFEndNodeData } from '../../core-types'
import { OFBlockEnum } from '../../core-types'

export const endNodeCompiler = {
  compileData({ node, title, desc, helpers }: OFNodeCompilerParams): OFEndNodeData {
    const config = node.config as { output?: { variables?: unknown[] } }
    return {
      title,
      desc,
      type: OFBlockEnum.End,
      output: {
        variables: helpers.compileVariables(config.output?.variables || [])
      }
    }
  }
}
