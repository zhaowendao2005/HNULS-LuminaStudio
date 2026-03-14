import type { OFNodeCompilerParams } from '../../node-definition'
import type { OFIfElseElseCase, OFIfElseNodeData } from '../../core-types'
import { OFBlockEnum } from '../../core-types'

export const ifNodeCompiler = {
  compileData({ node, title, desc, helpers }: OFNodeCompilerParams): OFIfElseNodeData {
    const config = node.config as {
      cases?: OFIfElseNodeData['cases']
      elseCase?: OFIfElseElseCase
    }
    return {
      title,
      desc,
      type: OFBlockEnum.IfElse,
      cases: (config.cases || []).map((item: OFIfElseNodeData['cases'][number]) => ({
        ...item,
        conditions: helpers.compileConditions(item.conditions || [])
      })),
      elseCase: config.elseCase || {
        handleId: 'else',
        label: 'ELSE'
      }
    }
  }
}
