import {
  OFBlockEnum,
  type OFIfElseCase,
  type OFIfElseCondition,
  type OFJsonSchemaObject,
  type OFLoopVariableData,
  type OFNode,
  type OFVariable,
  type OFIterationBranchOutputRef,
  type OFSelectorRef,
  type OFStructuredJsonSchema,
  type OFValueSource,
  type OFVariableRef,
  type OFVarType
} from './core-types'

type MutableRecord = Record<string, unknown>

function toRecord(value: unknown): MutableRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as MutableRecord)
    : null
}

function toVariableList(value: unknown): OFVariable[] {
  return Array.isArray(value) ? (value as OFVariable[]) : []
}

function toLoopVariableList(value: unknown): OFLoopVariableData[] {
  return Array.isArray(value) ? (value as OFLoopVariableData[]) : []
}

function toConditionList(value: unknown): OFIfElseCondition[] {
  return Array.isArray(value) ? (value as OFIfElseCondition[]) : []
}

function toCaseList(value: unknown): OFIfElseCase[] {
  return Array.isArray(value) ? (value as OFIfElseCase[]) : []
}

function toNodeList(value: unknown): OFNode[] {
  return Array.isArray(value) ? (value as OFNode[]) : []
}

function toNonEmptySegments(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item).trim()).filter(Boolean)
}

export function selectorToPath(selector?: string[] | null): string {
  return Array.isArray(selector) ? selector.join('.') : ''
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

export function normalizeOFSelectorRef(
  ref: unknown,
  selector: unknown,
  path: unknown,
  variableRoots: Iterable<string>
): OFSelectorRef | undefined {
  const refRecord =
    ref && typeof ref === 'object' && !Array.isArray(ref) ? (ref as MutableRecord) : null
  const normalizedSelector =
    normalizeOFSelector(refRecord?.selector, variableRoots) ??
    normalizeOFSelector(selector, variableRoots)

  if (!normalizedSelector?.length) {
    return undefined
  }

  const normalizedPath =
    typeof refRecord?.path === 'string' && refRecord.path.trim()
      ? refRecord.path
      : typeof path === 'string' && path.trim()
        ? String(path)
        : selectorToPath(normalizedSelector)

  return {
    selector: normalizedSelector,
    path: normalizedPath || undefined
  }
}

export function normalizeOFVariableRef(
  ref: unknown,
  legacy: {
    selector?: unknown
    path?: unknown
    label?: unknown
    type?: unknown
    schema?: unknown
    item_schema?: unknown
  },
  variableRoots: Iterable<string>
): OFVariableRef | undefined {
  const refRecord =
    ref && typeof ref === 'object' && !Array.isArray(ref) ? (ref as MutableRecord) : null
  const baseRef = normalizeOFSelectorRef(refRecord, legacy.selector, legacy.path, variableRoots)
  if (!baseRef) return undefined

  return {
    ...baseRef,
    label:
      typeof refRecord?.label === 'string'
        ? refRecord.label
        : typeof legacy.label === 'string'
          ? legacy.label
          : undefined,
    type: (refRecord?.type ?? legacy.type) as OFVarType | undefined,
    schema: resolveStructuredSchema(refRecord?.schema ?? legacy.schema),
    item_schema: (refRecord?.item_schema ?? legacy.item_schema ?? null) as
      | OFJsonSchemaObject
      | null
      | undefined
  }
}

function resolveStructuredSchema(value: unknown): OFStructuredJsonSchema | null {
  const record = toRecord(value)
  if (
    record &&
    record.type === 'object' &&
    typeof record.properties === 'object' &&
    Array.isArray(record.required) &&
    record.additionalProperties === false
  ) {
    return record as unknown as OFJsonSchemaObject
  }
  return null
}

export function normalizeOFValueSource(
  source: unknown,
  legacy: {
    mode?: unknown
    selector?: unknown
    path?: unknown
    label?: unknown
    type?: unknown
    schema?: unknown
    item_schema?: unknown
    constant_value?: unknown
  },
  variableRoots: Iterable<string>
): OFValueSource | undefined {
  const sourceRecord =
    source && typeof source === 'object' && !Array.isArray(source)
      ? (source as MutableRecord)
      : null
  const mode = String(sourceRecord?.mode ?? legacy.mode ?? '').trim()

  if (mode === 'constant') {
    return {
      mode: 'constant',
      constant_value: (sourceRecord?.constant_value ?? legacy.constant_value) as
        | string
        | number
        | boolean
        | Record<string, unknown>
        | unknown[]
        | null
        | undefined
    }
  }

  const ref = normalizeOFVariableRef(
    sourceRecord?.ref,
    {
      selector: legacy.selector,
      path: legacy.path,
      label: legacy.label,
      type: legacy.type,
      schema: legacy.schema,
      item_schema: legacy.item_schema
    },
    variableRoots
  )

  if (!ref) {
    return undefined
  }

  return {
    mode: 'variable',
    ref
  }
}

export function getOFSelectorFromRef(ref?: OFSelectorRef | null): string[] {
  return ref?.selector?.length ? [...ref.selector] : []
}

export function getOFPathFromRef(ref?: OFSelectorRef | null): string {
  return ref?.path || selectorToPath(ref?.selector)
}

export function getOFVariableLabel(ref?: OFVariableRef | null): string {
  return ref?.label || getOFPathFromRef(ref)
}

export function getOFValueSourceSelector(source?: OFValueSource | null): string[] {
  return source?.mode === 'variable' ? getOFSelectorFromRef(source.ref) : []
}

export function getOFValueSourcePath(source?: OFValueSource | null): string {
  return source?.mode === 'variable' ? getOFPathFromRef(source.ref) : ''
}

function replaceNamespace(
  selector: string[],
  oldNamespace: string,
  newNamespace: string
): string[] {
  return selector.map((segment, index) => {
    if (index !== 0) return segment
    if (segment === oldNamespace) return newNamespace
    if (segment.startsWith(`${oldNamespace}.`)) {
      return `${newNamespace}${segment.slice(oldNamespace.length)}`
    }
    return segment
  })
}

function replaceRoot(selector: string[], oldRoot: string, newRoot: string): string[] {
  return selector.map((segment, index) => (index === 0 && segment === oldRoot ? newRoot : segment))
}

function replacePathRoot(
  path: string | undefined,
  oldRoot: string,
  newRoot: string
): string | undefined {
  if (!path) return path
  if (path === oldRoot) return newRoot
  if (path.startsWith(`${oldRoot}.`)) {
    return `${newRoot}${path.slice(oldRoot.length)}`
  }
  return path
}

function mapSelectorRef(
  ref: OFSelectorRef | undefined,
  mapper: (selector: string[]) => string[]
): OFSelectorRef | undefined {
  if (!ref?.selector?.length) return ref
  const selector = mapper(ref.selector)
  return {
    ...ref,
    selector,
    path: replacePathRoot(ref.path || selectorToPath(ref.selector), ref.selector[0], selector[0])
  }
}

export function replaceOFSelectorRefNamespace(
  ref: OFSelectorRef | undefined,
  oldNamespace: string,
  newNamespace: string
): OFSelectorRef | undefined {
  return mapSelectorRef(ref, (selector) => replaceNamespace(selector, oldNamespace, newNamespace))
}

export function replaceOFVariableRefNamespace(
  ref: OFVariableRef | undefined,
  oldNamespace: string,
  newNamespace: string
): OFVariableRef | undefined {
  return replaceOFSelectorRefNamespace(ref, oldNamespace, newNamespace) as OFVariableRef | undefined
}

export function replaceOFValueSourceNamespace(
  source: OFValueSource | undefined,
  oldNamespace: string,
  newNamespace: string
): OFValueSource | undefined {
  if (source?.mode !== 'variable') return source
  return {
    mode: 'variable',
    ref: replaceOFVariableRefNamespace(source.ref, oldNamespace, newNamespace) || source.ref
  }
}

export function replaceOFSelectorRefRoot(
  ref: OFSelectorRef | undefined,
  oldRoot: string,
  newRoot: string
): OFSelectorRef | undefined {
  return mapSelectorRef(ref, (selector) => replaceRoot(selector, oldRoot, newRoot))
}

export function replaceOFVariableRefRoot(
  ref: OFVariableRef | undefined,
  oldRoot: string,
  newRoot: string
): OFVariableRef | undefined {
  return replaceOFSelectorRefRoot(ref, oldRoot, newRoot) as OFVariableRef | undefined
}

export function replaceOFValueSourceRoot(
  source: OFValueSource | undefined,
  oldRoot: string,
  newRoot: string
): OFValueSource | undefined {
  if (source?.mode !== 'variable') return source
  return {
    mode: 'variable',
    ref: replaceOFVariableRefRoot(source.ref, oldRoot, newRoot) || source.ref
  }
}

function normalizeIfElseCondition(condition: MutableRecord, variableRoots: Iterable<string>): void {
  const variableRef = normalizeOFVariableRef(
    condition.variable_ref,
    {
      selector: condition.variable_selector,
      path: condition.variable_path,
      label: condition.variable_label,
      type: condition.variable_type
    },
    variableRoots
  )
  if (variableRef) {
    condition.variable_ref = variableRef
    condition.variable_type = variableRef.type
  }

  const compareRef = normalizeOFVariableRef(
    condition.compare_ref,
    {
      selector: condition.compare_selector,
      path: condition.compare_path,
      label: condition.compare_label,
      type: condition.compare_type
    },
    variableRoots
  )

  const missingLeftSelector =
    !variableRef?.selector?.length &&
    (!Array.isArray(condition.variable_selector) || condition.variable_selector.length === 0)
  const hasLegacyVariableCompare =
    condition.compare_source_mode === 'variable' && compareRef?.selector?.length
  const hasConstantValue = Object.prototype.hasOwnProperty.call(condition, 'value')

  if (missingLeftSelector && hasLegacyVariableCompare && hasConstantValue) {
    condition.variable_ref = compareRef
    condition.variable_type = compareRef?.type
    delete condition.compare_ref
    delete condition.compare_source_mode
  } else if (compareRef) {
    condition.compare_ref = compareRef
    condition.compare_type = compareRef.type
  }

  delete condition.variable_selector
  delete condition.variable_path
  delete condition.variable_label
  delete condition.compare_selector
  delete condition.compare_path
  delete condition.compare_label
}

function normalizeIterationBranchOutputRef(
  item: MutableRecord,
  variableRoots: Iterable<string>
): OFIterationBranchOutputRef | undefined {
  const outputRef = normalizeOFVariableRef(
    item.output_ref,
    {
      selector: item.output_selector,
      path: item.output_path
    },
    variableRoots
  )

  if (!outputRef) {
    return undefined
  }

  return {
    source_node_id: String(item.source_node_id || ''),
    source_handle_id: String(item.source_handle_id || ''),
    output_ref: outputRef
  }
}

export function collectOFSelectorVariableRoots(nodes: unknown[]): string[] {
  const roots = new Set<string>()

  function visitNode(node: unknown): void {
    if (!node || typeof node !== 'object') return
    const record = node as MutableRecord
    const data = toRecord(record.data)
    if (!data) return

    if (data.type === OFBlockEnum.Start) {
      const input = toRecord(data.input)
      for (const variable of toVariableList(input?.variables)) {
        if (typeof variable?.variable === 'string' && variable.variable.trim()) {
          roots.add(variable.variable.trim())
        }
      }
    }

    if (data.type === OFBlockEnum.Loop) {
      for (const variable of toLoopVariableList(data.loop_variables)) {
        if (typeof variable?.variable === 'string' && variable.variable.trim()) {
          roots.add(variable.variable.trim())
        }
      }
    }

    if (data.type === OFBlockEnum.Iteration || data.type === OFBlockEnum.Loop) {
      const subgraph = toRecord(data.subgraph)
      for (const child of toNodeList(subgraph?.nodes)) {
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
  data: MutableRecord,
  variableRoots: Iterable<string>
): void {
  switch (nodeType) {
    case OFBlockEnum.Start:
      for (const variable of toVariableList(toRecord(data.input)?.variables)) {
        const valueRef = normalizeOFVariableRef(
          variable?.value_ref,
          {
            selector: variable?.value_selector,
            path: variable?.value_path,
            label: variable?.label,
            type: variable?.type,
            schema: variable?.schema,
            item_schema: variable?.item_schema
          },
          variableRoots
        )
        if (valueRef) {
          variable.value_ref = valueRef
        }
        delete variable.value_selector
        delete variable.value_path
      }
      return

    case OFBlockEnum.IfElse:
      for (const item of toCaseList(data.cases)) {
        for (const condition of toConditionList(item.conditions)) {
          normalizeIfElseCondition(condition as unknown as MutableRecord, variableRoots)
        }
      }
      return

    case OFBlockEnum.Iteration: {
      const iteratorRef = normalizeOFVariableRef(
        data.iterator_ref,
        {
          selector: data.iterator_selector,
          path: data.iterator_path,
          label: data.iterator_label,
          type: data.iterator_type
        },
        variableRoots
      )
      if (iteratorRef) data.iterator_ref = iteratorRef

      const outputRef = normalizeOFVariableRef(
        data.output_ref,
        {
          selector: data.output_selector,
          path: data.output_path,
          label: data.output_label,
          type: data.output_type
        },
        variableRoots
      )
      if (outputRef) data.output_ref = outputRef

      data.branch_output_refs = (
        Array.isArray(data.branch_output_refs)
          ? data.branch_output_refs
          : Array.isArray(data.branch_output_selectors)
            ? data.branch_output_selectors
            : []
      )
        .map((item: MutableRecord) => normalizeIterationBranchOutputRef(item, variableRoots))
        .filter(Boolean) as OFIterationBranchOutputRef[]

      delete data.iterator_selector
      delete data.output_selector
      delete data.branch_output_selectors

      for (const child of toNodeList(toRecord(data.subgraph)?.nodes)) {
        if (!child?.data || typeof child.data !== 'object') continue
        normalizeOFRunnableNodeSelectorData(
          child.data.type,
          child.data as unknown as MutableRecord,
          variableRoots
        )
      }
      return
    }

    case OFBlockEnum.Loop:
      for (const variable of toLoopVariableList(data.loop_variables)) {
        const valueSource = normalizeOFValueSource(
          variable?.value_source,
          {
            mode: variable?.value_type,
            selector: variable?.value_selector,
            constant_value: variable?.value,
            schema: variable?.schema,
            item_schema: variable?.item_schema
          },
          variableRoots
        )
        if (valueSource) {
          variable.value_source = valueSource
          variable.value_type = valueSource.mode
          if (valueSource.mode === 'constant') {
            variable.value = valueSource.constant_value
          }
        }
        delete variable.value_selector
      }

      for (const condition of toConditionList(data.break_conditions)) {
        normalizeIfElseCondition(condition as unknown as MutableRecord, variableRoots)
      }

      for (const child of toNodeList(toRecord(data.subgraph)?.nodes)) {
        if (!child?.data || typeof child.data !== 'object') continue
        normalizeOFRunnableNodeSelectorData(
          child.data.type,
          child.data as unknown as MutableRecord,
          variableRoots
        )
      }
      return

    case OFBlockEnum.VariableAssign:
      for (const rule of Array.isArray(data.rules) ? data.rules : []) {
        const source = normalizeOFValueSource(
          rule?.source,
          {
            mode: rule?.source_mode,
            selector: rule?.source_selector,
            path: rule?.source_path,
            label: rule?.source_label,
            type: rule?.source_type,
            schema: rule?.schema,
            item_schema: rule?.item_schema,
            constant_value: rule?.constant_value
          },
          variableRoots
        )
        if (source) {
          rule.source = source
          rule.source_mode = source.mode
          if (source.mode === 'constant') {
            rule.constant_value = source.constant_value
          } else {
            rule.source_type = source.ref.type
          }
        }
        delete rule.source_selector
        delete rule.source_path
        delete rule.source_label
      }
      return

    case OFBlockEnum.End:
      for (const variable of toVariableList(toRecord(data.output)?.variables)) {
        const valueRef = normalizeOFVariableRef(
          variable?.value_ref,
          {
            selector: variable?.value_selector,
            path: variable?.value_path,
            label: variable?.label,
            type: variable?.type,
            schema: variable?.schema,
            item_schema: variable?.item_schema
          },
          variableRoots
        )
        if (valueRef) {
          variable.value_ref = valueRef
        }
        delete variable.value_selector
        delete variable.value_path
      }
      return

    default:
      return
  }
}
