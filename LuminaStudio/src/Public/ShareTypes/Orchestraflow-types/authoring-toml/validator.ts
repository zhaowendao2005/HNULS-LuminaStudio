import { listOFAuthoringNodeDefinitions } from '../node-definition-registry'
import { createAuthoringTomlDiagnostic } from './diagnostics'
import type {
  OFAuthoringTomlDiagnostic,
  OFAuthoringTomlDocument,
  OFAuthoringTomlValidationReport
} from './types'

function validateFieldPresence(document: OFAuthoringTomlDocument): OFAuthoringTomlDiagnostic[] {
  const diagnostics: OFAuthoringTomlDiagnostic[] = []
  const definitions = new Map(
    listOFAuthoringNodeDefinitions().map((definition) => [definition.authoring.token, definition])
  )

  if (!document.workflow.name.trim()) {
    diagnostics.push(
      createAuthoringTomlDiagnostic({
        category: 'field',
        code: 'workflow-name-missing',
        message: 'workflow.name 不能为空',
        path: 'workflow.name'
      })
    )
  }

  document.nodes.forEach((node, index) => {
    const definition = definitions.get(node.type)
    if (!definition) {
      diagnostics.push(
        createAuthoringTomlDiagnostic({
          category: 'field',
          code: 'unknown-node-type',
          message: `未知节点类型：${String(node.type)}`,
          nodeId: node.id,
          path: `nodes[${index}].type`
        })
      )
      return
    }

    definition.authoring.toml.requiredFields.forEach((field) => {
      const value = node[field]
      const isMissing =
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim().length === 0) ||
        (Array.isArray(value) && value.length === 0)
      if (isMissing) {
        diagnostics.push(
          createAuthoringTomlDiagnostic({
            category: 'field',
            code: 'required-field-missing',
            message: `节点 ${node.id} 缺少必填字段 ${field}`,
            nodeId: node.id,
            path: `nodes[${index}].${field}`
          })
        )
      }
    })
  })

  return diagnostics
}

function validateReferences(document: OFAuthoringTomlDocument): OFAuthoringTomlDiagnostic[] {
  const diagnostics: OFAuthoringTomlDiagnostic[] = []
  const nodeIdSet = new Set(document.nodes.map((node) => node.id))

  document.edges.forEach((edge, index) => {
    if (!nodeIdSet.has(edge.source)) {
      diagnostics.push(
        createAuthoringTomlDiagnostic({
          category: 'reference',
          code: 'edge-source-missing',
          message: `边 ${index + 1} 引用了不存在的 source 节点 ${edge.source}`,
          path: `edges[${index}].source`
        })
      )
    }
    if (!nodeIdSet.has(edge.target)) {
      diagnostics.push(
        createAuthoringTomlDiagnostic({
          category: 'reference',
          code: 'edge-target-missing',
          message: `边 ${index + 1} 引用了不存在的 target 节点 ${edge.target}`,
          path: `edges[${index}].target`
        })
      )
    }
  })

  return diagnostics
}

function validateTopology(document: OFAuthoringTomlDocument): OFAuthoringTomlDiagnostic[] {
  const diagnostics: OFAuthoringTomlDiagnostic[] = []
  const startNodes = document.nodes.filter((node) => node.type === 'start')
  const endNodes = document.nodes.filter((node) => node.type === 'end')

  if (startNodes.length !== 1) {
    diagnostics.push(
      createAuthoringTomlDiagnostic({
        category: 'topology',
        code: 'start-node-count-invalid',
        message: '工作流必须且只能有一个 start 节点'
      })
    )
  }

  if (endNodes.length < 1) {
    diagnostics.push(
      createAuthoringTomlDiagnostic({
        category: 'topology',
        code: 'end-node-missing',
        message: '工作流至少需要一个 end 节点'
      })
    )
  }

  return diagnostics
}

function validateSemantic(document: OFAuthoringTomlDocument): OFAuthoringTomlDiagnostic[] {
  const diagnostics: OFAuthoringTomlDiagnostic[] = []
  document.nodes.forEach((node) => {
    if ((node.type === 'iter' || node.type === 'loop') && !node.subgraph) {
      diagnostics.push(
        createAuthoringTomlDiagnostic({
          category: 'semantic',
          code: 'subgraph-required',
          message: `节点 ${node.id} 需要提供 subgraph`,
          nodeId: node.id,
          path: `nodes.${node.id}.subgraph`
        })
      )
    }
  })
  return diagnostics
}

export function validateOFAuthoringToml(
  document: OFAuthoringTomlDocument
): OFAuthoringTomlValidationReport {
  const diagnostics = [
    ...validateFieldPresence(document),
    ...validateReferences(document),
    ...validateTopology(document),
    ...validateSemantic(document)
  ]

  return {
    valid: diagnostics.length === 0,
    diagnostics
  }
}
