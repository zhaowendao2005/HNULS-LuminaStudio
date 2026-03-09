import { afterAll, afterEach, beforeAll, beforeEach, describe, it } from 'vitest'
import { RuleTester } from 'eslint'
import tsParser from '@typescript-eslint/parser'
import plugin from './orchestraflow-plugin.mjs'

RuleTester.describe = describe
RuleTester.it = it
RuleTester.afterAll = afterAll
RuleTester.afterEach = afterEach
RuleTester.beforeAll = beforeAll
RuleTester.beforeEach = beforeEach

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 'latest',
    sourceType: 'module'
  }
})

tester.run('orchestraflow/no-legacy-entrypoints', plugin.rules['no-legacy-entrypoints'], {
  valid: [
    {
      filename: '/repo/LuminaStudio/src/utility/orchestraflow/ai-schema/compiler.ts',
      code: `import { resolveOFNodeDefinition } from '@shared/Orchestraflow-types'; resolveOFNodeDefinition(type)`
    }
  ],
  invalid: [
    {
      filename: '/repo/LuminaStudio/src/utility/orchestraflow/nodes/llm-node.ts',
      code: `import { buildLLMOutputVariables } from '@shared/Orchestraflow-types'; buildLLMOutputVariables('llm')`,
      errors: [{ messageId: 'forbidden' }, { messageId: 'forbidden' }]
    },
    {
      filename: '/repo/LuminaStudio/src/utility/orchestraflow/ai-schema/builder.ts',
      code: `getOFRuntimeNodeDescriptors()`,
      errors: [{ messageId: 'forbidden' }]
    }
  ]
})

tester.run('orchestraflow/prefer-shared-barrel-api', plugin.rules['prefer-shared-barrel-api'], {
  valid: [
    {
      filename: '/repo/LuminaStudio/src/utility/orchestraflow/ai-schema/compiler.ts',
      code: `import { resolveOFNodeDefinition } from '@shared/Orchestraflow-types'`
    },
    {
      filename: '/repo/LuminaStudio/src/Public/ShareTypes/Orchestraflow-types/node-definition.ts',
      code: `import { OFBlockEnum } from './core-types'`
    }
  ],
  invalid: [
    {
      filename: '/repo/LuminaStudio/src/utility/orchestraflow/ai-schema/compiler.ts',
      code: `import { resolveOFNodeDefinition } from '@shared/Orchestraflow-types/node-definition-registry'`,
      errors: [{ messageId: 'barrel' }]
    },
    {
      filename:
        '/repo/LuminaStudio/src/renderer/src/stores/orchestraflow/workflow-editor/workflow-editor.store.ts',
      code: `export { getOFDefaultNodeTitle } from '@shared/Orchestraflow-types/node-definition'`,
      errors: [{ messageId: 'barrel' }]
    }
  ]
})

tester.run(
  'orchestraflow/no-business-branch-outside-definitions',
  plugin.rules['no-business-branch-outside-definitions'],
  {
    valid: [
      {
        filename:
          '/repo/LuminaStudio/src/Public/ShareTypes/Orchestraflow-types/builtins/llm.definition.ts',
        code: `function compile(type) { if (type === OFBlockEnum.LLM) return 1 }`
      },
      {
        filename:
          '/repo/LuminaStudio/src/renderer/src/stores/orchestraflow/workflow-editor/workflow-editor.store.ts',
        code: `function syncNodeNamespaceReferences(node) { if (node.data.type === OFBlockEnum.LLM) return node }`
      }
    ],
    invalid: [
      {
        filename:
          '/repo/LuminaStudio/src/renderer/src/stores/orchestraflow/workflow-editor/workflow-editor.store.ts',
        code: `function bad(type) { if (type === OFBlockEnum.LLM) return 1 }`,
        errors: [{ messageId: 'branch' }]
      },
      {
        filename: '/repo/LuminaStudio/src/utility/orchestraflow/ai-schema/builder.ts',
        code: `const result = nodeType === OFBlockEnum.Loop ? 'loop' : 'other'`,
        errors: [{ messageId: 'branch' }]
      }
    ]
  }
)

tester.run(
  'orchestraflow/no-manual-derived-node-fields',
  plugin.rules['no-manual-derived-node-fields'],
  {
    valid: [
      {
        filename:
          '/repo/LuminaStudio/src/Public/ShareTypes/Orchestraflow-types/builtins/iteration.definition.ts',
        code: `const node = { start_node_id: 'x', type: 'iteration-start' }`
      },
      {
        filename: '/repo/LuminaStudio/src/utility/orchestraflow/ai-schema/compiler.ts',
        code: `const node = { start_node_id: 'x', type: 'loop-start' }`
      },
      {
        filename: '/repo/LuminaStudio/src/utility/orchestraflow/ai-schema/builder.ts',
        code: `const node = { output: { variables: [] } }`
      }
    ],
    invalid: [
      {
        filename:
          '/repo/LuminaStudio/src/renderer/src/stores/orchestraflow/workflow-editor/workflow-editor.store.ts',
        code: `const node = { start_node_id: 'child-start' }`,
        errors: [{ messageId: 'derived' }]
      },
      {
        filename:
          '/repo/LuminaStudio/src/renderer/src/stores/orchestraflow/workflow-editor/workflow-editor.store.ts',
        code: `const node = { type: 'iteration-start' }`,
        errors: [{ messageId: 'derived' }]
      }
    ]
  }
)
