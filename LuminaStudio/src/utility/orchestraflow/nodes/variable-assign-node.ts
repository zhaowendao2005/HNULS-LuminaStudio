import { BaseNode } from './base-node'
import {
  OFBlockEnum,
  OF_VARIABLE_ASSIGN_NODE_NAME,
  normalizeOFVariableNamespace,
  type OFVariableAssignNodeData,
  type OFVariableAssignRule
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

      const normalizedTitle = normalizeOFVariableNamespace(nodeData.title, OF_VARIABLE_ASSIGN_NODE_NAME)
      const pendingWrites: PendingWrite[] = []
      const outputs: Record<string, unknown> = {}

      for (const rule of nodeData.rules) {
        const sourceValue = this.resolveSourceValue(rule)
        const convertedValue = convertValue(sourceValue, {
          targetType: rule.target_type,
          targetVariable: rule.target_variable,
          sourcePath: rule.source_path
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

  private resolveSourceValue(rule: OFVariableAssignRule): unknown {
    if (rule.source_mode === 'constant') {
      if (!Object.prototype.hasOwnProperty.call(rule, 'constant_value')) {
        throw new Error(`Rule "${rule.target_variable}" is missing constant_value`)
      }
      return rule.constant_value
    }

    if (!rule.source_selector?.length) {
      throw new Error(`Rule "${rule.target_variable}" is missing source_selector`)
    }

    const value = this.getVariable(rule.source_selector)
    if (value === undefined) {
      throw new Error(`Variable "${rule.source_path || rule.source_selector.join('.')}" is undefined`)
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

      if (rule.source_mode === 'variable' && !rule.source_selector?.length) {
        throw new Error(`Rule "${variable}" must select a source variable`)
      }
      if (rule.source_mode !== 'variable' && rule.source_mode !== 'constant') {
        throw new Error(`Rule "${variable}" has invalid source_mode`)
      }
    })
  }
}
