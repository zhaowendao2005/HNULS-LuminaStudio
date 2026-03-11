import type {
  OFAgentContextPack,
  OFAgentContextSection,
  OFBuildBlueprintContextPackParams,
  OFBuildEditContextPackParams,
  OFBuildRequirementContextPackParams,
  OFRequirementDocument
} from './contracts'
import type { OFNodeDefinition } from '../node-definition'
import type { OFMechanismDefinition } from '../mechanisms'
import { buildOFWorkflowAuthoringContract } from '../contract'
import { listOFMechanismDefinitions } from '../mechanisms'
import { listOFNodeDefinitions } from '../node-definition-registry'
import {
  GENERATED_BLUEPRINT_WORKFLOW_SCHEMA,
  GENERATED_RUNNABLE_WORKFLOW_SCHEMA
} from '../blueprint/schemas'

function createPackBase(
  kind: OFAgentContextPack['manifest']['kind'],
  title: string,
  sections: OFAgentContextSection[],
  payload: Record<string, unknown>
): OFAgentContextPack {
  return {
    manifest: {
      id: `of-${kind}-context-pack`,
      kind,
      version: '1.0',
      title,
      generated_at: new Date().toISOString()
    },
    sections,
    payload
  }
}

function buildNodeCatalog(definitions: OFNodeDefinition[]) {
  return definitions.map((definition) => ({
    type: definition.meta.type,
    title: definition.meta.title,
    summary: definition.meta.summary,
    category: definition.meta.category,
    agent: definition.agent || null,
    authoring: definition.authoring.contract,
    ports: definition.spec.ports,
    system_managed_fields: definition.spec.system_managed_fields || []
  }))
}

function buildMechanismCatalog(definitions: OFMechanismDefinition[]) {
  return definitions.map((definition) => ({
    id: definition.id,
    theme: definition.theme,
    title: definition.title,
    summary: definition.summary,
    hard_rules: definition.hard_rules,
    examples: definition.examples,
    failure_modes: definition.failure_modes,
    agent_render_hints: definition.agent_render_hints,
    helper_refs: definition.helper_refs
  }))
}

function buildSharedSections(): OFAgentContextSection[] {
  return [
    {
      id: 'manifest',
      title: 'Pack Manifest',
      summary: '用于渐进式读取的总索引。',
      dependencies: [],
      render_kind: 'markdown'
    },
    {
      id: 'mechanisms',
      title: 'Mechanisms',
      summary: '公共机制真相层。',
      dependencies: ['manifest'],
      render_kind: 'markdown'
    },
    {
      id: 'nodes',
      title: 'Nodes',
      summary: '节点真相层。',
      dependencies: ['mechanisms'],
      render_kind: 'markdown'
    }
  ]
}

function createDefaultRequirementDocument(): OFRequirementDocument {
  return {
    goals: [],
    success_criteria: [],
    constraints: [],
    candidate_nodes: [],
    prohibitions: [],
    human_confirmation_questions: [],
    input_requirements: [],
    output_requirements: [],
    blueprint_requirements: []
  }
}

export function buildOFRequirementContextPack(
  params: OFBuildRequirementContextPackParams = {}
): OFAgentContextPack {
  const nodeDefinitions = listOFNodeDefinitions()
  const mechanismDefinitions = listOFMechanismDefinitions()
  return createPackBase(
    'requirement',
    'OrchestraFlow Requirement Context Pack',
    [
      ...buildSharedSections(),
      {
        id: 'requirement-document',
        title: 'Requirement Document',
        summary: '需求 agent -> 蓝图 agent 的正式 handoff。',
        dependencies: ['mechanisms', 'nodes'],
        render_kind: 'markdown'
      }
    ],
    {
      contract: buildOFWorkflowAuthoringContract(),
      mechanisms: buildMechanismCatalog(mechanismDefinitions),
      nodes: buildNodeCatalog(nodeDefinitions),
      requirement_document: params.document || createDefaultRequirementDocument(),
      schemas: {
        blueprint: GENERATED_BLUEPRINT_WORKFLOW_SCHEMA,
        runnable: GENERATED_RUNNABLE_WORKFLOW_SCHEMA
      }
    }
  )
}

export function buildOFBlueprintContextPack(
  params: OFBuildBlueprintContextPackParams = {}
): OFAgentContextPack {
  const nodeDefinitions = listOFNodeDefinitions()
  const mechanismDefinitions = listOFMechanismDefinitions()
  return createPackBase(
    'blueprint',
    'OrchestraFlow Blueprint Context Pack',
    [
      ...buildSharedSections(),
      {
        id: 'blueprint-authoring',
        title: 'Blueprint Authoring',
        summary: 'Blueprint DSL、schema 与 compiler/validator 入口。',
        dependencies: ['mechanisms', 'nodes'],
        render_kind: 'markdown'
      }
    ],
    {
      contract: buildOFWorkflowAuthoringContract(),
      mechanisms: buildMechanismCatalog(mechanismDefinitions),
      nodes: buildNodeCatalog(nodeDefinitions),
      blueprint: params.blueprint || null,
      schemas: {
        blueprint: GENERATED_BLUEPRINT_WORKFLOW_SCHEMA,
        runnable: GENERATED_RUNNABLE_WORKFLOW_SCHEMA
      }
    }
  )
}

export function buildOFEditContextPack(
  params: OFBuildEditContextPackParams = {}
): OFAgentContextPack {
  const nodeDefinitions = listOFNodeDefinitions()
  const mechanismDefinitions = listOFMechanismDefinitions()
  return createPackBase(
    'edit',
    'OrchestraFlow Edit Context Pack',
    [
      ...buildSharedSections(),
      {
        id: 'edit-operations',
        title: 'Edit Operations',
        summary: 'Blueprint 编辑协议与 apply helper。',
        dependencies: ['mechanisms', 'nodes'],
        render_kind: 'markdown'
      }
    ],
    {
      contract: buildOFWorkflowAuthoringContract(),
      mechanisms: buildMechanismCatalog(mechanismDefinitions),
      nodes: buildNodeCatalog(nodeDefinitions),
      blueprint: params.blueprint || null,
      operations: params.operations || []
    }
  )
}
