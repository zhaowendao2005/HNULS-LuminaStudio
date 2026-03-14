import type { OFNodeCompilerParams } from '../../node-definition'
import type { OFStartNodeData } from '../../core-types'
import { OFBlockEnum } from '../../core-types'

export const startNodeCompiler = {
  compileData({ node, title, desc, helpers }: OFNodeCompilerParams): OFStartNodeData {
    const config = node.config as { input?: { variables?: unknown[] } }
    return {
      title,
      desc,
      type: OFBlockEnum.Start,
      input: {
        variables: helpers.compileVariables(config.input?.variables || [])
      }
    }
  }
}
