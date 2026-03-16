import type { OFIfElseNodeData } from '../../core-types'
import { defineStandardOFNodeDefinition } from '../../node-definition'
import { ifNodeCompiler } from './compiler'
import { ifNodeDescription } from './description'
import { ifNodeEditor } from './editor'
import { ifNodeErrorGuidance } from './error-guidance'
import { ifNodeMainPrompt } from './main-prompt'
import { ifNodeRuntimeDefinition } from './runtime'
import { ifNodeTomlDefinition } from './toml'

export const ifNodeDefinition = defineStandardOFNodeDefinition<OFIfElseNodeData>({
  authoring: {
    token: 'if',
    title: 'if',
    description: ifNodeDescription,
    mainPrompt: ifNodeMainPrompt,
    errorGuidance: ifNodeErrorGuidance,
    toml: ifNodeTomlDefinition,
    legacyTokens: ['ifelse']
  },
  runtime: ifNodeRuntimeDefinition,
  editor: ifNodeEditor,
  compiler: ifNodeCompiler
})
