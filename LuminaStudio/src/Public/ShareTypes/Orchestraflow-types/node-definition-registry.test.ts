import { describe, expect, it } from 'vitest'
import {
  OFBlockEnum,
  type OFNode,
  type OFIfElseCondition,
  type OFIterationBranchOutputRef,
  type OFLoopVariableData,
  type OFVariable,
  defineContainerOFNodeDefinition,
  defineInternalStartOFNodeDefinition,
  defineStandardOFNodeDefinition,
  listOFNodeDefinitions,
  resolveOFNodeDefinition,
  type OFNodeDefinition,
  type OFNodeDefinitionRegistry,
  type OFVariableDefinition
} from './index'

const compilerHelpers = {
  compileVariables(source: unknown[]) {
    return source as OFVariable[]
  },
  compileLoopVariables(source: unknown[]) {
    return source as OFLoopVariableData[]
  },
  compileConditions(source: unknown[]) {
    return source as OFIfElseCondition[]
  },
  compileIterationBranchOutputSelectors(source: unknown[]) {
    return source as OFIterationBranchOutputRef[]
  },
  compileNodeContext(value: { enabled: boolean; variable_selector?: string[] } | undefined) {
    return value
  },
  compileSelectorField(value: unknown) {
    return Array.isArray(value) ? value.map(String) : []
  },
  compileTemplateValue(value: unknown) {
    return value as
      | string
      | number
      | boolean
      | Record<string, unknown>
      | unknown[]
      | null
      | undefined
  },
  compileContainerSubgraph() {
    return {
      graph: {
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 }
      },
      idMap: new Map<string, string>()
    }
  }
}

function createNode(type: OFBlockEnum, id = `node-${type}`, title?: string): OFNode {
  const definition = resolveOFNodeDefinition(type)
  const fallbackTitle = title || definition.runtime.title
  const data =
    'createDefaultData' in definition.editor
      ? definition.editor.createDefaultData({ nodeId: id, title: fallbackTitle })
      : definition.editor.normalizeData({
          node: {
            id,
            type: definition.runtime.vueFlowType,
            position: { x: 0, y: 0 },
            parentNode: id,
            extent: 'parent',
            data: {
              title: fallbackTitle,
              desc: fallbackTitle,
              type
            } as OFNode['data']
          },
          helpers: {
            normalizeNode(node) {
              const nestedDefinition = resolveOFNodeDefinition(node.data.type)
              return {
                ...node,
                type: nestedDefinition.runtime.vueFlowType,
                data: nestedDefinition.editor.normalizeData({
                  node,
                  helpers: this
                })
              }
            }
          }
        })

  return {
    id,
    type: definition.runtime.vueFlowType,
    position: { x: 0, y: 0 },
    data
  }
}

function createDslNode(type: OFBlockEnum) {
  switch (type) {
    case OFBlockEnum.Start:
      return { id: 'start', type, config: { input: { variables: [] } } }
    case OFBlockEnum.LLM:
      return {
        id: 'llm',
        type,
        config: {
          model: { provider: 'openai', name: 'gpt-test' },
          prompt_template: [],
          structured_output: { enabled: false }
        }
      }
    case OFBlockEnum.IfElse:
      return {
        id: 'ifelse',
        type,
        config: { cases: [], elseCase: { handleId: 'else', label: 'ELSE' } }
      }
    case OFBlockEnum.Iteration:
      return {
        id: 'iteration',
        type,
        config: { iterator_selector: ['items'], output_selector: ['result'] },
        subgraph: { nodes: [], edges: [] }
      }
    case OFBlockEnum.Loop:
      return {
        id: 'loop',
        type,
        config: { loop_count: 1, loop_variables: [] },
        subgraph: { nodes: [], edges: [] }
      }
    case OFBlockEnum.VariableAssign:
      return { id: 'assign', type, config: { rules: [] } }
    case OFBlockEnum.End:
      return { id: 'end', type, config: { output: { variables: [] } } }
    default:
      return { id: String(type), type, config: {} }
  }
}

describe('OrchestraFlow node definitions', () => {
  it('re-exports definition APIs from the stable barrel', () => {
    expect(defineStandardOFNodeDefinition).toBeTypeOf('function')
    expect(defineContainerOFNodeDefinition).toBeTypeOf('function')
    expect(defineInternalStartOFNodeDefinition).toBeTypeOf('function')

    const registry: OFNodeDefinitionRegistry = {
      resolve: resolveOFNodeDefinition,
      list: listOFNodeDefinitions
    }
    const definition: OFNodeDefinition = registry.resolve(OFBlockEnum.Start)
    expect(definition.runtime.type).toBe(OFBlockEnum.Start)

    const variableDefinition: OFVariableDefinition<void> = {
      id: 'test',
      build: () => []
    }
    expect(variableDefinition.id).toBe('test')
  })

  it('registers all built-in node definitions', () => {
    const definitions = listOFNodeDefinitions()
    expect(definitions).toHaveLength(9)
    expect(definitions.map((item) => item.runtime.type)).toEqual(
      expect.arrayContaining([
        OFBlockEnum.Start,
        OFBlockEnum.LLM,
        OFBlockEnum.IfElse,
        OFBlockEnum.Iteration,
        OFBlockEnum.IterationStart,
        OFBlockEnum.Loop,
        OFBlockEnum.LoopStart,
        OFBlockEnum.VariableAssign,
        OFBlockEnum.End
      ])
    )
    definitions.forEach((definition) => {
      expect(Array.isArray(definition.runtime.ports)).toBe(true)
      expect(definition.runtime.output_namespace).toBeDefined()
    })
  })

  it('keeps editor and variable capabilities available for every definition', () => {
    listOFNodeDefinitions().forEach((definition) => {
      const node = createNode(definition.runtime.type)
      if ('dsl' in definition) {
        expect(definition.llmSpec.authoringToken).toBe(definition.dsl.authoringToken)
      }
      expect(definition.runtime.getSelectableVariables(node)).toBeInstanceOf(Array)
      expect(definition.editor.normalizeData).toBeTypeOf('function')
      if ('createDefaultData' in definition.editor) {
        expect(definition.editor.createDefaultData).toBeTypeOf('function')
      }
      if ('compiler' in definition) {
        const compiled = definition.compiler.compileData({
          node: createDslNode(definition.runtime.type),
          compiledId: `compiled-${definition.runtime.type}`,
          title: definition.runtime.title,
          desc: '',
          helpers: compilerHelpers
        })
        expect(compiled.type).toBe(definition.runtime.type)
      }
    })
  })
})
