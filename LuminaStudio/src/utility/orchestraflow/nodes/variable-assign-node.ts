import { BaseNode } from './base-node'
import {
  OFBlockEnum,
  OF_VARIABLE_ASSIGN_NODE_NAME,
  normalizeOFVariableNamespace,
  type OFVariableAssignNodeData,
  type OFVariableAssignRule,
  type OFVariableRef
} from '@shared/Orchestraflow-types'
import type { ExecutionContext, NodeResult } from './types'
import { VariableStore } from '../services/variable-store'
import { convertValue } from '../services/value-converter'

interface PendingWrite {
  variable: string
  value: unknown
}

export class VariableAssignNode extends BaseNode {
  readonly nodeType: OFBlockEnum.VariableAssign

  constructor(node: any, variableStore: VariableStore) {
    super(node, variableStore)
    this.nodeType = OFBlockEnum.VariableAssign
  }

  async execute(context: ExecutionContext): Promise<NodeResult> {
    this.setContext(context)

    try {
      const nodeData = this.getNodeData() as OFVariableAssignNodeData
      this.validateConfig(nodeData)

      const normalizedTitle = normalizeOFVariableNamespace(
        nodeData.title,
        OF_VARIABLE_ASSIGN_NODE_NAME
      )
      const pendingWrites: PendingWrite[] = []
      const outputs: Record<string, unknown> = {}

      for (const rule of nodeData.rules) {
        const sourceRef = this.resolveVariableSourceRef(rule)
        const sourceValue = this.resolveSourceValue(rule)
        const convertedValue = convertValue(sourceValue, {
          targetType: rule.target_type,
          targetVariable: rule.target_variable,
          sourcePath: sourceRef ? sourceRef.path || sourceRef.selector.join('.') : undefined
        })

        pendingWrites.push({
          variable: rule.target_variable,
          value: convertedValue
        })
        outputs[rule.target_variable] = convertedValue
      }

      pendingWrites.forEach((item) => {
        this.setOutput(`${normalizedTitle}.${item.variable}`, item.value)
        this.setOutput(`${context.node.id}.${item.variable}`, item.value)
      })

      return { outputs }
    } catch (error) {
      return {
        outputs: {},
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  private resolveVariableSourceRef(rule: OFVariableAssignRule): OFVariableRef | undefined {
    if (rule.source?.mode === 'variable') {
      return rule.source.ref
    }

    if (rule.source_selector?.length) {
      return {
        selector: rule.source_selector,
        path: rule.source_path,
        label: rule.source_label,
        type: rule.source_type,
        schema: rule.schema,
        item_schema: rule.item_schema
      }
    }

    return undefined
  }

  private resolveSourceValue(rule: OFVariableAssignRule): unknown {
    const sourceMode = rule.source?.mode || rule.source_mode

    if (sourceMode === 'constant') {
      const constantValue =
        rule.source?.mode === 'constant' ? rule.source.constant_value : rule.constant_value
      if (
        constantValue === undefined &&
        !Object.prototype.hasOwnProperty.call(rule, 'constant_value')
      ) {
        throw new Error(`Rule "${rule.target_variable}" is missing constant_value`)
      }
      return constantValue
    }

    const sourceRef = this.resolveVariableSourceRef(rule)
    if (sourceMode !== 'variable' || !sourceRef?.selector?.length) {
      throw new Error(`Rule "${rule.target_variable}" is missing source_selector`)
    }

    const value = this.variableStore.getByVariableRef(sourceRef)
    if (value === undefined) {
      throw new Error(`Variable "${sourceRef.path || sourceRef.selector.join('.')}" is undefined`)
    }
    return value
  }

  private validateConfig(nodeData: OFVariableAssignNodeData): void {
    if (!nodeData.rules?.length) {
      throw new Error('rules cannot be empty')
    }

    const seenVariables = new Set<string>()
    nodeData.rules.forEach((rule) => {
      const variable = String(rule.target_variable || '').trim()
      if (!variable) {
        throw new Error(`Rule "${rule.id}" target_variable cannot be empty`)
      }
      if (seenVariables.has(variable)) {
        throw new Error(`Duplicate target_variable: ${variable}`)
      }
      seenVariables.add(variable)

      const sourceMode = rule.source?.mode || rule.source_mode
      const sourceRef = this.resolveVariableSourceRef(rule)

      if (sourceMode === 'variable' && !sourceRef?.selector?.length) {
        throw new Error(`Rule "${variable}" must select a source variable`)
      }
      if (sourceMode !== 'variable' && sourceMode !== 'constant') {
        throw new Error(`Rule "${variable}" has invalid source_mode`)
      }
    })
  }
}
