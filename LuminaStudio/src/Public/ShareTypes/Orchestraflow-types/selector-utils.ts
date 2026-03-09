import { OFBlockEnum } from './core-types'

function toNonEmptySegments(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item).trim()).filter(Boolean)
}

function setIfMissingPath(target: Record<string, any>, pathKey: string, selector: string[]): void {
  if (!selector.length || typeof target[pathKey] === 'string') return
  target[pathKey] = selector.join('.')
}

export function normalizeOFSelector(
  selector: unknown,
  variableRoots: Iterable<string>
): string[] | undefined {
  const segments = toNonEmptySegments(selector)
  if (!segments.length) return Array.isArray(selector) ? [] : undefined
  if (segments.length > 1) return segments

  const [single] = segments
  const splitSegments = single
    .split('.')
    .map((item) => item.trim())
    .filter(Boolean)

  if (splitSegments.length <= 1) return segments

  const roots = new Set(variableRoots)
  return roots.has(splitSegments[0]) ? splitSegments : segments
}

function normalizeIfElseCondition(
  condition: Record<string, any>,
  variableRoots: Iterable<string>
): void {
  const variableSelector = normalizeOFSelector(condition.variable_selector, variableRoots)
  if (variableSelector) {
    condition.variable_selector = variableSelector
    setIfMissingPath(condition, 'variable_path', variableSelector)
  }

  const compareSelector = normalizeOFSelector(condition.compare_selector, variableRoots)
  if (compareSelector) {
    condition.compare_selector = compareSelector
    setIfMissingPath(condition, 'compare_path', compareSelector)
  }

  const missingLeftSelector =
    !Array.isArray(condition.variable_selector) || condition.variable_selector.length === 0
  const hasLegacyVariableCompare =
    condition.compare_source_mode === 'variable' &&
    Array.isArray(condition.compare_selector) &&
    condition.compare_selector.length > 0
  const hasConstantValue = Object.prototype.hasOwnProperty.call(condition, 'value')

  // Repair the legacy AI-template shape that misplaced the left selector into compare_selector.
  if (missingLeftSelector && hasLegacyVariableCompare && hasConstantValue) {
    condition.variable_selector = condition.compare_selector
    setIfMissingPath(condition, 'variable_path', condition.variable_selector)
    delete condition.compare_selector
    delete condition.compare_path
    delete condition.compare_label
    delete condition.compare_type
    delete condition.compare_source_mode
  }
}

export function collectOFSelectorVariableRoots(nodes: unknown[]): string[] {
  const roots = new Set<string>()

  function visitNode(node: unknown): void {
    if (!node || typeof node !== 'object') return
    const record = node as Record<string, any>
    const data =
      record.data && typeof record.data === 'object' ? (record.data as Record<string, any>) : null
    if (!data) return

    if (data.type === OFBlockEnum.Start) {
      for (const variable of data.input?.variables || []) {
        if (typeof variable?.variable === 'string' && variable.variable.trim()) {
          roots.add(variable.variable.trim())
        }
      }
    }

    if (data.type === OFBlockEnum.Loop) {
      for (const variable of data.loop_variables || []) {
        if (typeof variable?.variable === 'string' && variable.variable.trim()) {
          roots.add(variable.variable.trim())
        }
      }
    }

    if (data.type === OFBlockEnum.Iteration || data.type === OFBlockEnum.Loop) {
      for (const child of data.subgraph?.nodes || []) {
        visitNode(child)
      }
    }
  }

  for (const node of nodes) {
    visitNode(node)
  }

  return Array.from(roots)
}

export function normalizeOFRunnableNodeSelectorData(
  nodeType: OFBlockEnum,
  data: Record<string, any>,
  variableRoots: Iterable<string>
): void {
  switch (nodeType) {
    case OFBlockEnum.Start:
      for (const variable of data.input?.variables || []) {
        const selector = normalizeOFSelector(variable?.value_selector, variableRoots)
        if (selector) variable.value_selector = selector
      }
      return

    case OFBlockEnum.IfElse:
      for (const item of data.cases || []) {
        for (const condition of item.conditions || []) {
          normalizeIfElseCondition(condition, variableRoots)
        }
      }
      return

    case OFBlockEnum.Iteration: {
      const iteratorSelector = normalizeOFSelector(data.iterator_selector, variableRoots)
      if (iteratorSelector) data.iterator_selector = iteratorSelector

      const outputSelector = normalizeOFSelector(data.output_selector, variableRoots)
      if (outputSelector) data.output_selector = outputSelector

      for (const item of data.branch_output_selectors || []) {
        const selector = normalizeOFSelector(item?.output_selector, variableRoots)
        if (selector) item.output_selector = selector
      }

      for (const child of data.subgraph?.nodes || []) {
        if (!child?.data || typeof child.data !== 'object') continue
        normalizeOFRunnableNodeSelectorData(child.data.type, child.data, variableRoots)
      }
      return
    }

    case OFBlockEnum.Loop:
      for (const variable of data.loop_variables || []) {
        const selector = normalizeOFSelector(variable?.value_selector, variableRoots)
        if (selector) variable.value_selector = selector
      }

      for (const condition of data.break_conditions || []) {
        normalizeIfElseCondition(condition, variableRoots)
      }

      for (const child of data.subgraph?.nodes || []) {
        if (!child?.data || typeof child.data !== 'object') continue
        normalizeOFRunnableNodeSelectorData(child.data.type, child.data, variableRoots)
      }
      return

    case OFBlockEnum.VariableAssign:
      for (const rule of data.rules || []) {
        const selector = normalizeOFSelector(rule?.source_selector, variableRoots)
        if (selector) {
          rule.source_selector = selector
          setIfMissingPath(rule, 'source_path', selector)
        }
      }
      return

    case OFBlockEnum.End:
      for (const variable of data.output?.variables || []) {
        const selector = normalizeOFSelector(variable?.value_selector, variableRoots)
        if (selector) variable.value_selector = selector
      }
      return

    default:
      return
  }
}
