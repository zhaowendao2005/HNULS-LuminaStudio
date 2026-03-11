const LEGACY_ENTRYPOINTS = new Set([
  'buildLLMOutputVariables',
  'buildIterationInnerStartVariables',
  'buildIterationOutputVariables',
  'buildLoopInnerStartVariables',
  'buildLoopOutputVariables',
  'buildVariableAssignOutputVariables',
  'getOFRuntimeNodeDescriptor',
  'getOFRuntimeNodeDescriptors',
  'createRuntimeNodeByDescriptor'
])

const SHARED_INTERNAL_IMPORTS = new Set([
  '@shared/Orchestraflow-types/core-types',
  '@shared/Orchestraflow-types/node-definition',
  '@shared/Orchestraflow-types/variable-definition',
  '@shared/Orchestraflow-types/node-definition-registry',
  '@shared/Orchestraflow-types/mechanisms',
  '@shared/Orchestraflow-types/blueprint',
  '@shared/Orchestraflow-types/agent-context'
])

const BUSINESS_BRANCH_TARGETS = new Set([
  '/src/renderer/src/stores/orchestraflow/workflow-editor/workflow-editor.store.ts',
  '/src/renderer/src/stores/orchestraflow/workflow-editor/modules/workflow-editor.actions.ts',
  '/src/renderer/src/stores/orchestraflow/workflow-editor/modules/workflow-editor.container.ts',
  '/src/renderer/src/stores/orchestraflow/workflow-editor/modules/workflow-editor.graph.ts',
  '/src/renderer/src/stores/orchestraflow/workflow-editor/variable-selector/variable-selector.store.ts'
])

const BUSINESS_BRANCH_ALLOWED_FUNCTIONS = new Map([
  [
    '/src/renderer/src/stores/orchestraflow/workflow-editor/workflow-editor.store.ts',
    new Set(['syncNodeNamespaceReferences'])
  ],
  [
    '/src/renderer/src/stores/orchestraflow/workflow-editor/modules/workflow-editor.actions.ts',
    new Set(['syncLoopVariableReferences', 'updateNode'])
  ],
  [
    '/src/renderer/src/stores/orchestraflow/workflow-editor/modules/workflow-editor.graph.ts',
    new Set([
      'findParentIterationNodeId',
      'isIterationLocalStart',
      'syncIterationSubgraphSnapshot',
      'syncExpandedSubgraphChildren'
    ])
  ],
  [
    '/src/renderer/src/stores/orchestraflow/workflow-editor/modules/workflow-editor.container.ts',
    new Set(['syncIterationContainerSize', 'updateIterationViewport', 'moveNodeIntoIterationNode'])
  ],
  [
    '/src/renderer/src/stores/orchestraflow/workflow-editor/variable-selector/variable-selector.store.ts',
    new Set(['buildLoopLocalVariableGroup'])
  ]
])

const LEGACY_AI_SCHEMA_IMPORT_PATTERNS = [
  '/src/utility/orchestraflow/ai-schema/',
  '/src/main/services/orchestraflow/orchestraflow-ai-schema-service',
  'orchestraflow:ai-schema-bundle'
]

const AGENT_PROMPT_IDENTIFIERS = new Set(['prompt_markdown', 'bundled_markdown'])

function normalizeFilename(filename) {
  return String(filename || '').replace(/\\/g, '/')
}

function matchesTarget(filename, targets) {
  const normalized = normalizeFilename(filename)
  for (const target of targets) {
    if (normalized.endsWith(target)) {
      return target
    }
  }
  return null
}

function isSharedInternalFile(filename) {
  return normalizeFilename(filename).includes('/src/Public/ShareTypes/Orchestraflow-types/')
}

function isAllowedManualDerivedFile(filename) {
  const normalized = normalizeFilename(filename)
  return (
    normalized.includes('/src/Public/ShareTypes/Orchestraflow-types/builtins/') ||
    normalized.endsWith('/src/Public/ShareTypes/Orchestraflow-types/blueprint/compiler.ts') ||
    normalized.endsWith('/src/utility/orchestraflow/runtime-binding-registry.ts') ||
    normalized.endsWith('.test.ts') ||
    normalized.endsWith('.mock.ts')
  )
}

function isAllowedAgentPromptFile(filename) {
  const normalized = normalizeFilename(filename)
  return normalized.includes('/src/Public/ShareTypes/Orchestraflow-types/agent-context/')
}

function isMechanismDefinitionFile(filename) {
  const normalized = normalizeFilename(filename)
  return normalized.includes('/src/Public/ShareTypes/Orchestraflow-types/mechanisms/')
}

function isContractAggregatorFile(filename) {
  return normalizeFilename(filename).endsWith(
    '/src/Public/ShareTypes/Orchestraflow-types/contract.ts'
  )
}

function getPropertyName(node) {
  if (!node) return null
  if (node.type === 'Identifier') return node.name
  if (node.type === 'Literal') return String(node.value)
  return null
}

function getFunctionName(node) {
  let current = node
  while (current) {
    if (current.type === 'FunctionDeclaration' && current.id?.name) {
      return current.id.name
    }
    if (
      (current.type === 'FunctionExpression' || current.type === 'ArrowFunctionExpression') &&
      current.parent
    ) {
      if (current.parent.type === 'VariableDeclarator' && current.parent.id.type === 'Identifier') {
        return current.parent.id.name
      }
      if (current.parent.type === 'Property' && current.parent.key.type === 'Identifier') {
        return current.parent.key.name
      }
    }
    current = current.parent
  }
  return null
}

function isOfBlockEnumMember(node) {
  return (
    node &&
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.object.type === 'Identifier' &&
    node.object.name === 'OFBlockEnum'
  )
}

function isRestrictedBranchNode(node) {
  if (node.type === 'IfStatement' || node.type === 'ConditionalExpression') {
    const test = node.test
    if (test.type === 'BinaryExpression' && ['===', '=='].includes(test.operator)) {
      const leftIsRestrictedIdentifier =
        test.left.type === 'Identifier' && ['type', 'nodeType'].includes(test.left.name)
      const rightIsRestrictedIdentifier =
        test.right.type === 'Identifier' && ['type', 'nodeType'].includes(test.right.name)
      return (
        (leftIsRestrictedIdentifier && isOfBlockEnumMember(test.right)) ||
        (rightIsRestrictedIdentifier && isOfBlockEnumMember(test.left))
      )
    }
  }

  if (node.type === 'SwitchStatement') {
    return (
      node.discriminant.type === 'Identifier' &&
      ['type', 'nodeType'].includes(node.discriminant.name)
    )
  }

  return false
}

function createNoLegacyEntrypointsRule() {
  return {
    meta: {
      type: 'problem',
      docs: {
        description: 'Disallow legacy OrchestraFlow helper/descriptor entrypoints.'
      },
      schema: [],
      messages: {
        forbidden:
          'Legacy OrchestraFlow entrypoint "{{name}}" is forbidden. Route through definition/registry APIs instead.'
      }
    },
    create(context) {
      return {
        ImportSpecifier(node) {
          if (!LEGACY_ENTRYPOINTS.has(node.imported.name)) return
          context.report({
            node,
            messageId: 'forbidden',
            data: { name: node.imported.name }
          })
        },
        Identifier(node) {
          if (!LEGACY_ENTRYPOINTS.has(node.name)) return
          if (
            !node.parent ||
            node.parent.type !== 'CallExpression' ||
            node.parent.callee !== node
          ) {
            return
          }
          context.report({
            node,
            messageId: 'forbidden',
            data: { name: node.name }
          })
        }
      }
    }
  }
}

function createPreferSharedBarrelApiRule() {
  return {
    meta: {
      type: 'problem',
      docs: {
        description: 'Force external OrchestraFlow consumers to use the shared barrel API.'
      },
      schema: [],
      messages: {
        barrel:
          'Import "{{source}}" is internal to OrchestraFlow shared types. Use "@shared/Orchestraflow-types" instead.'
      }
    },
    create(context) {
      const filename = context.filename
      return {
        ImportDeclaration(node) {
          if (isSharedInternalFile(filename)) return
          if (!SHARED_INTERNAL_IMPORTS.has(node.source.value)) return
          context.report({
            node: node.source,
            messageId: 'barrel',
            data: { source: node.source.value }
          })
        },
        ExportNamedDeclaration(node) {
          if (isSharedInternalFile(filename)) return
          if (!node.source || !SHARED_INTERNAL_IMPORTS.has(node.source.value)) return
          context.report({
            node: node.source,
            messageId: 'barrel',
            data: { source: node.source.value }
          })
        }
      }
    }
  }
}

function createNoBusinessBranchOutsideDefinitionsRule() {
  return {
    meta: {
      type: 'problem',
      docs: {
        description:
          'Disallow new OFBlockEnum dispatch branches in non-definition OrchestraFlow orchestrators.'
      },
      schema: [],
      messages: {
        branch:
          'Business branching on OFBlockEnum should live in built-in definitions, not in this orchestrator file.'
      }
    },
    create(context) {
      const target = matchesTarget(context.filename, BUSINESS_BRANCH_TARGETS)
      if (!target) return {}

      function reportIfNeeded(node) {
        const functionName = getFunctionName(node)
        if (BUSINESS_BRANCH_ALLOWED_FUNCTIONS.get(target)?.has(functionName || '')) return
        if (isRestrictedBranchNode(node)) {
          context.report({ node, messageId: 'branch' })
        }
      }

      return {
        IfStatement: reportIfNeeded,
        SwitchStatement: reportIfNeeded,
        ConditionalExpression: reportIfNeeded
      }
    }
  }
}

function createNoManualDerivedNodeFieldsRule() {
  return {
    meta: {
      type: 'problem',
      docs: {
        description:
          'Disallow manually authored derived OrchestraFlow node fields outside definitions/compiler bindings.'
      },
      schema: [],
      messages: {
        derived:
          'Derived OrchestraFlow field "{{field}}" must be produced by definitions/compiler bindings instead of being hand-authored here.'
      }
    },
    create(context) {
      if (isAllowedManualDerivedFile(context.filename)) return {}

      return {
        Property(node) {
          const keyName = getPropertyName(node.key)
          if (keyName === 'start_node_id') {
            context.report({
              node,
              messageId: 'derived',
              data: { field: 'start_node_id' }
            })
            return
          }

          if (keyName === 'type' && node.value.type === 'Literal') {
            if (node.value.value === 'iteration-start' || node.value.value === 'loop-start') {
              context.report({
                node,
                messageId: 'derived',
                data: { field: String(node.value.value) }
              })
            }
          }
        }
      }
    }
  }
}

function createNoAISchemaProductImportsRule() {
  return {
    meta: {
      type: 'problem',
      docs: {
        description: 'Disallow legacy ai-schema product chain imports or IPC endpoints.'
      },
      schema: [],
      messages: {
        legacy:
          'Legacy ai-schema product chain is removed. Use shared blueprint/mechanism/agent-context APIs instead.'
      }
    },
    create(context) {
      return {
        ImportDeclaration(node) {
          const source = String(node.source.value || '')
          if (
            LEGACY_AI_SCHEMA_IMPORT_PATTERNS.some((pattern) => source.includes(pattern)) ||
            source.includes('ai-schema')
          ) {
            context.report({ node: node.source, messageId: 'legacy' })
          }
        },
        Literal(node) {
          if (typeof node.value !== 'string') return
          if (
            LEGACY_AI_SCHEMA_IMPORT_PATTERNS.some((pattern) => node.value.includes(pattern)) ||
            node.value.includes('ai-schema')
          ) {
            context.report({ node, messageId: 'legacy' })
          }
        }
      }
    }
  }
}

function createNoMechanismContractLiteralsRule() {
  return {
    meta: {
      type: 'problem',
      docs: {
        description:
          'Force selector/edge/container global contract literals to live in mechanism definitions.'
      },
      schema: [],
      messages: {
        mechanism:
          'Selector/edge/container global contract literals must live in mechanism definitions, not in this file.'
      }
    },
    create(context) {
      if (
        isMechanismDefinitionFile(context.filename) ||
        isContractAggregatorFile(context.filename)
      ) {
        return {}
      }
      return {
        Property(node) {
          const keyName = getPropertyName(node.key)
          if (
            ['selector_contract', 'edge_contract', 'global_invariants', 'global_fields'].includes(
              keyName
            )
          ) {
            context.report({ node, messageId: 'mechanism' })
          }
        }
      }
    }
  }
}

function createNoDirectAgentPromptAssemblyRule() {
  return {
    meta: {
      type: 'problem',
      docs: {
        description: 'Disallow direct agent prompt bundle fields outside agent-context renderers.'
      },
      schema: [],
      messages: {
        prompt:
          'Agent prompt text must be rendered from agent-context renderers instead of being assembled here.'
      }
    },
    create(context) {
      if (isAllowedAgentPromptFile(context.filename)) {
        return {}
      }
      return {
        Identifier(node) {
          if (AGENT_PROMPT_IDENTIFIERS.has(node.name)) {
            context.report({ node, messageId: 'prompt' })
          }
        },
        Literal(node) {
          if (typeof node.value !== 'string') return
          if (AGENT_PROMPT_IDENTIFIERS.has(node.value)) {
            context.report({ node, messageId: 'prompt' })
          }
        }
      }
    }
  }
}

export default {
  meta: {
    name: 'orchestraflow'
  },
  rules: {
    'no-legacy-entrypoints': createNoLegacyEntrypointsRule(),
    'prefer-shared-barrel-api': createPreferSharedBarrelApiRule(),
    'no-business-branch-outside-definitions': createNoBusinessBranchOutsideDefinitionsRule(),
    'no-manual-derived-node-fields': createNoManualDerivedNodeFieldsRule(),
    'no-ai-schema-product-imports': createNoAISchemaProductImportsRule(),
    'no-mechanism-contract-literals': createNoMechanismContractLiteralsRule(),
    'no-direct-agent-prompt-assembly': createNoDirectAgentPromptAssemblyRule()
  }
}
