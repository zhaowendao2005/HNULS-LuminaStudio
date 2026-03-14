import type { OFRunnableWorkflow } from '../contract'
import {
  findOFAuthoringNodeDefinition,
  findOFLegacyAuthoringNodeDefinition,
  OFBlockEnum,
  OFVarType,
  getOFVarTypeFromSchema,
  type OFAuthoringValuePayload,
  type OFAuthoringVariableSpec,
  type OFBlueprintEdge,
  type OFBlueprintNode,
  type OFBlueprintTextCompileResult,
  type OFBlueprintTextDiagnostic,
  type OFBlueprintTextLocation,
  type OFBlueprintTextParseResult,
  type OFBlueprintSectionAst,
  type OFBlueprintSectionDslAst,
  type OFBlueprintWorkflow,
  type OFJsonSchemaProperty,
  type OFJsonSchemaObject
} from '..'
import { compileOFBlueprintToRunnable } from './compiler'
import { validateOFBlueprint } from './validator'

export const OF_BLUEPRINT_SECTION_DSL_HEADER = 'OFT/1'
export const OF_BLUEPRINT_SECTION_DSL_SECTION_FORMS = [
  '[workflow]',
  '[node.<id>]',
  '[node.<container>.<child>]',
  '[subgraph.<container>]',
  '[graph]'
] as const
export const OF_BLUEPRINT_SECTION_DSL_RULES = [
  '所有结构用 section 表达，不使用缩进表达层级。',
  '多行 prompt 使用三引号字符串 `""" ... """`。',
  '数组必须写成单行 JSON 数组。',
  '边必须显式写成 `node.handle -> node.handle`。',
  'start/llm/if/loop/iter/set/end 使用节点专用字段，不再直接写深路径 `data.*`。',
  '变量声明统一写成单行 JSON 对象数组；不再使用 input section 或 `name:type=value` 简写。',
  '变量来源统一写成 `{"mode":"ref","ref":"@path"}` 或 `{"mode":"value","value":...}`。',
  '组合 object/array 中如需引用变量，必须把引用写成 JSON 字符串 `"@ref"`。'
] as const

type ParsedValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | number[]
  | boolean[]
  | Record<string, unknown>
  | unknown[]

type SectionCompileContext = {
  nodeIds: Set<string>
  variableRoots: Set<string>
}

const WORKFLOW_ALLOWED_KEYS = new Set(['name', 'description', 'author'])
const GRAPH_ALLOWED_KEYS = new Set(['edges'])
const SUBGRAPH_ALLOWED_KEYS = new Set(['entry', 'edges'])
const COMMON_NODE_ALLOWED_KEYS = new Set(['type', 'title', 'description'])
const _LEGACY_KEY_REPLACEMENTS = new Map<string, string>([
  ['desc', 'description'],
  ['assignments', 'let'],
  ['conditions', 'when'],
  ['cases', 'when'],
  ['elseCase', 'else_label'],
  ['iterator_ref', 'over'],
  ['output_policy', 'result'],
  ['output_schema', 'struct'],
  ['loop_count_ref', 'count'],
  ['max_iterations', 'count'],
  ['loop_condition', 'count 或 break_conditions'],
  ['nodes', '删除该键；子图节点通过 [node.<container>.<child>] section 定义'],
  ['start_node_id', '删除该键；内部 start 节点由系统管理']
])

const MULTILINE_QUOTE = '"""'

export function parseOFBlueprintSectionDsl(sourceText: string): OFBlueprintTextParseResult {
  const normalizedText = sourceText.replace(/\r\n?/g, '\n')
  const lines = normalizedText.split('\n')
  const diagnostics: OFBlueprintTextDiagnostic[] = []
  const headerLineIndex = findFirstMeaningfulLine(lines)

  if (headerLineIndex < 0) {
    diagnostics.push(
      createDiagnostic({
        code: 'missing-header',
        message: `首行必须是 ${OF_BLUEPRINT_SECTION_DSL_HEADER}。`,
        path: 'header',
        line: 1,
        column: 1,
        endLine: 1,
        endColumn: OF_BLUEPRINT_SECTION_DSL_HEADER.length
      })
    )
    return { ast: null, diagnostics, valid: false }
  }

  if (lines[headerLineIndex].trim() !== OF_BLUEPRINT_SECTION_DSL_HEADER) {
    diagnostics.push(
      createDiagnostic({
        code: 'invalid-header',
        message: `首个非注释行必须严格等于 ${OF_BLUEPRINT_SECTION_DSL_HEADER}。`,
        path: 'header',
        line: headerLineIndex + 1,
        column: 1,
        endLine: headerLineIndex + 1,
        endColumn: lines[headerLineIndex].length || 1,
        context: lines[headerLineIndex].trim()
      })
    )
    return { ast: null, diagnostics, valid: false }
  }

  const sections: OFBlueprintSectionAst[] = []
  let currentSection: OFBlueprintSectionAst | null = null

  let index = headerLineIndex + 1
  while (index < lines.length) {
    const rawLine = lines[index]
    const trimmed = rawLine.trim()

    if (!trimmed || trimmed.startsWith('#')) {
      index += 1
      continue
    }

    const sectionMatch = trimmed.match(/^\[([A-Za-z0-9_.-]+)\]$/)
    if (sectionMatch) {
      currentSection = {
        name: sectionMatch[1],
        entries: [],
        location: createLineLocation(index, rawLine)
      }
      sections.push(currentSection)
      index += 1
      continue
    }

    if (!currentSection) {
      diagnostics.push(
        createLineDiagnostic(
          'entry-before-section',
          '键值对必须出现在 section 内部。',
          'dsl',
          index,
          rawLine
        )
      )
      index += 1
      continue
    }

    const assignmentMatch = rawLine.match(/^\s*([A-Za-z0-9_.-]+)\s*=\s*(.*)$/)
    if (!assignmentMatch) {
      diagnostics.push(
        createLineDiagnostic(
          'unknown-statement',
          buildUnknownStatementMessage(rawLine),
          'dsl',
          index,
          rawLine
        )
      )
      index += 1
      continue
    }

    const [, key, rawValue] = assignmentMatch
    const valueLocation = createLineLocation(index, rawLine)
    const parsed = parseSectionValue(lines, index, rawValue, valueLocation)
    diagnostics.push(...parsed.diagnostics)
    currentSection.entries.push({
      key,
      value: parsed.value,
      location: parsed.location
    })
    index = parsed.nextLineIndex
  }

  return {
    ast: {
      version: '2.0',
      format: 'oft/1',
      sections
    },
    diagnostics,
    valid: diagnostics.length === 0
  }
}

export function compileOFBlueprintSectionDslAst(
  ast: OFBlueprintSectionDslAst
): OFBlueprintTextCompileResult {
  const diagnostics: OFBlueprintTextDiagnostic[] = []
  const sectionMap = new Map(ast.sections.map((section) => [section.name, section] as const))
  const workflowSection = sectionMap.get('workflow')

  if (!workflowSection) {
    diagnostics.push(
      createDiagnostic({
        code: 'missing-workflow-section',
        message: '缺少 [workflow] section。',
        path: 'workflow',
        ...createDefaultLocation()
      })
    )
    return {
      ast,
      diagnostics,
      valid: false,
      blueprint: null,
      runnable: null
    }
  }

  const workflow = compileWorkflowMeta(workflowSection, diagnostics)
  validateSectionNames(ast.sections, diagnostics)
  const topNodeSections = ast.sections.filter((section) => isTopLevelNodeSection(section.name))
  const topNodeIds = new Set(topNodeSections.map((section) => extractTopLevelNodeId(section.name)))

  const nodes = topNodeSections
    .map((section) =>
      compileNodeSection(
        section,
        ast.sections,
        {
          nodeIds: topNodeIds,
          variableRoots: new Set()
        },
        diagnostics
      )
    )
    .filter((node): node is OFBlueprintNode => Boolean(node))

  const edges = compileGraphEdges(
    sectionMap.get('graph'),
    topNodeIds,
    createDefaultLocation(),
    diagnostics
  )

  const blueprint: OFBlueprintWorkflow = {
    version: '2.0',
    workflow,
    nodes,
    edges
  }

  const validationResult = validateOFBlueprint(blueprint)
  diagnostics.push(
    ...validationResult.issues.map((issue) =>
      createDiagnostic({
        code: 'blueprint-validation',
        message: issue.message,
        path: issue.path,
        ...resolveSectionLocation(issue.path, ast)
      })
    )
  )

  const runnable = diagnostics.length === 0 ? tryCompileRunnable(blueprint, ast, diagnostics) : null

  return {
    ast,
    diagnostics,
    valid: diagnostics.length === 0,
    blueprint: diagnostics.length === 0 ? blueprint : null,
    runnable
  }
}

function compileWorkflowMeta(
  section: OFBlueprintSectionAst,
  diagnostics: OFBlueprintTextDiagnostic[]
): OFBlueprintWorkflow['workflow'] {
  validateSectionKeys(section, WORKFLOW_ALLOWED_KEYS, 'workflow', diagnostics)
  const name = getStringEntry(section, 'name')
  const description = getStringEntry(section, 'description')
  const author = getStringEntry(section, 'author')

  if (!name?.trim()) {
    diagnostics.push(
      createDiagnostic({
        code: 'missing-workflow-name',
        message: 'workflow.name 必须是非空字符串。',
        path: 'workflow.name',
        ...section.location
      })
    )
  }

  return {
    name: name || '',
    description: description || undefined,
    author: author || undefined
  }
}

function validateSectionNames(
  sections: OFBlueprintSectionAst[],
  diagnostics: OFBlueprintTextDiagnostic[]
): void {
  sections.forEach((section) => {
    const valid =
      section.name === 'workflow' ||
      section.name === 'graph' ||
      section.name.startsWith('node.') ||
      section.name.startsWith('subgraph.')

    if (valid) {
      return
    }

    diagnostics.push(
      createDiagnostic({
        code: 'unsupported-section',
        message: `${section.name} 不是受支持的 OFT/1 section。变量声明必须直接写在 start / loop / set / end 节点字段里。`,
        path: section.name,
        ...section.location
      })
    )
  })
}

function compileNodeSection(
  section: OFBlueprintSectionAst,
  allSections: OFBlueprintSectionAst[],
  context: SectionCompileContext,
  diagnostics: OFBlueprintTextDiagnostic[]
): OFBlueprintNode | null {
  const nodePath = section.name.slice('node.'.length).split('.')
  const nodeId = nodePath[nodePath.length - 1]
  const rawType = getStringEntry(section, 'type') || ''
  const normalizedType = rawType.trim().toLowerCase()
  const legacyDefinition = findOFLegacyAuthoringNodeDefinition(normalizedType)
  if (legacyDefinition) {
    diagnostics.push(
      createDiagnostic({
        code: 'legacy-node-type-not-supported',
        message: `节点 ${nodeId} 的 type=${rawType} 已废弃，请改用 ${legacyDefinition.dsl.authoringToken}。`,
        path: `nodes.${nodeId}.type`,
        ...section.location
      })
    )
    return null
  }

  const definition = findOFAuthoringNodeDefinition(normalizedType)
  const nodeType = definition?.runtime.type || null
  const title = getStringEntry(section, 'title') || undefined
  const description = getStringEntry(section, 'description') || undefined

  if (!nodeType || !definition) {
    diagnostics.push(
      createDiagnostic({
        code: 'missing-node-type',
        message: `节点 ${nodeId} 缺少 type。`,
        path: `nodes.${nodeId}.type`,
        ...section.location
      })
    )
    return null
  }

  const allowedNodeKeys = new Set([...COMMON_NODE_ALLOWED_KEYS, ...definition.dsl.allowedKeys])
  validateSectionKeys(
    section,
    allowedNodeKeys,
    `nodes.${nodeId}`,
    diagnostics,
    new Map(Object.entries(definition.dsl.legacyKeyReplacements || {}))
  )

  if (nodePath.length > 1 && nodeType === OFBlockEnum.Start) {
    diagnostics.push(
      createDiagnostic({
        code: 'container-start-not-supported',
        message: `容器子图中的内部 start 节点由系统注入，作者不应手写节点 ${nodeId}。`,
        path: `nodes.${nodeId}.type`,
        ...section.location
      })
    )
    return null
  }

  if (nodePath.length > 1 && [OFBlockEnum.Iteration, OFBlockEnum.Loop].includes(nodeType)) {
    diagnostics.push(
      createDiagnostic({
        code: 'nested-container-not-supported',
        message: `容器子图内禁止再定义容器节点 ${nodeId}。`,
        path: `nodes.${nodeId}.type`,
        ...section.location
      })
    )
    return null
  }

  const childSections = allSections.filter((item) => item.name.startsWith(`node.${nodeId}.`))
  const subgraphSection = allSections.find((item) => item.name === `subgraph.${nodeId}`) || null
  const childNodeIds = new Set(childSections.map((item) => item.name.split('.').pop() || ''))

  const node: OFBlueprintNode = {
    id: nodeId,
    type: nodeType,
    title,
    description,
    config: {}
  }

  switch (nodeType) {
    case OFBlockEnum.Start: {
      node.config.input = {
        variables: buildStartVariables(
          getVariableSpecArray(section, 'inputs', diagnostics, section.location),
          diagnostics,
          section.location
        )
      }
      break
    }
    case OFBlockEnum.LLM: {
      const model = getStringEntry(section, 'model') || ''
      const prompt = getStringEntry(section, 'prompt') || ''
      const struct = getStringEntry(section, 'struct')
      const { provider, name } = parseModelId(model)
      node.config.model = {
        provider,
        name,
        completion_params: {
          temperature: 1,
          top_p: 1
        }
      }
      node.config.prompt_template = prompt ? [{ id: 'prompt_1', role: 'user', text: prompt }] : []
      node.config.structured_output = buildStructuredOutput(struct, diagnostics, section.location)
      break
    }
    case OFBlockEnum.IfElse: {
      node.config.cases = buildIfCases(
        getArrayOfStrings(section, 'when'),
        {
          nodeIds: childNodeIds.size ? childNodeIds : context.nodeIds,
          variableRoots: context.variableRoots
        },
        diagnostics,
        section.location
      )
      node.config.elseCase = {
        handleId: 'else',
        label: getStringEntry(section, 'else_label') || 'ELSE'
      }
      break
    }
    case OFBlockEnum.VariableAssign: {
      node.config.rules = buildVariableAssignRules(
        getVariableSpecArray(section, 'let', diagnostics, section.location),
        context,
        diagnostics,
        section.location
      )
      break
    }
    case OFBlockEnum.End: {
      node.config.output = {
        variables: buildEndOutputs(
          getVariableSpecArray(section, 'outputs', diagnostics, section.location),
          context,
          diagnostics,
          section.location
        )
      }
      break
    }
    case OFBlockEnum.Loop: {
      const countValue = getEntryValue(section, 'count')
      if (typeof countValue === 'number' && Number.isInteger(countValue) && countValue >= 1) {
        node.config.loop_count = countValue
      } else if (typeof countValue === 'string' && countValue.trim().startsWith('@')) {
        const selector = compileReferenceSelector(
          countValue,
          context,
          diagnostics,
          section.location
        )
        node.config.loop_count = 1
        node.config.loop_count_selector = selector
        node.config.loop_count_ref = {
          selector,
          path: selector.join('.')
        }
      } else {
        diagnostics.push(
          createDiagnostic({
            code: 'invalid-loop-count',
            message: 'loop.count 当前只支持大于等于 1 的常量整数，或单个 `@ref` 字符串。',
            path: `nodes.${nodeId}.count`,
            ...section.location
          })
        )
        node.config.loop_count = 1
      }
      const loopVars = buildLoopVariables(
        getVariableSpecArray(section, 'vars', diagnostics, section.location),
        context,
        diagnostics,
        section.location
      )
      node.config.loop_variables = loopVars
      node.config.entry = getStringEntry(subgraphSection, 'entry') || undefined
      if (!node.config.entry) {
        diagnostics.push(
          createDiagnostic({
            code: 'missing-subgraph-entry',
            message: `循环节点 ${nodeId} 缺少 [subgraph.${nodeId}] 的 entry。`,
            path: `nodes.${nodeId}.entry`,
            ...(subgraphSection?.location || section.location)
          })
        )
      }
      node.subgraph = buildSubgraph(
        childSections,
        subgraphSection,
        diagnostics,
        new Set([
          ...context.variableRoots,
          ...loopVars.map((item) => String(item.variable)),
          'index',
          'loop_count'
        ])
      )
      break
    }
    case OFBlockEnum.Iteration: {
      const over = getStringEntry(section, 'over') || ''
      node.config.iterator_selector = compileReferenceSelector(
        over,
        context,
        diagnostics,
        section.location
      )
      const result = getStringEntry(section, 'result') || ''
      node.config.output_selector = compileReferenceSelector(
        result,
        context,
        diagnostics,
        section.location
      )
      node.config.branch_output_selectors = []
      node.config.entry = getStringEntry(subgraphSection, 'entry') || undefined
      if (!node.config.entry) {
        diagnostics.push(
          createDiagnostic({
            code: 'missing-subgraph-entry',
            message: `迭代节点 ${nodeId} 缺少 [subgraph.${nodeId}] 的 entry。`,
            path: `nodes.${nodeId}.entry`,
            ...(subgraphSection?.location || section.location)
          })
        )
      }
      node.subgraph = buildSubgraph(
        childSections,
        subgraphSection,
        diagnostics,
        new Set([...context.variableRoots, 'item', 'index', 'length'])
      )
      break
    }
    default: {
      diagnostics.push(
        createDiagnostic({
          code: 'unsupported-node-type',
          message: `OFT/1 当前未实现节点类型 ${nodeType}。`,
          path: `nodes.${nodeId}.type`,
          ...section.location
        })
      )
      return null
    }
  }

  return node
}

function buildSubgraph(
  childSections: OFBlueprintSectionAst[],
  subgraphSection: OFBlueprintSectionAst | null,
  diagnostics: OFBlueprintTextDiagnostic[],
  variableRoots: Set<string>
): OFBlueprintNode['subgraph'] {
  if (subgraphSection) {
    validateSectionKeys(subgraphSection, SUBGRAPH_ALLOWED_KEYS, subgraphSection.name, diagnostics)
  }
  const childNodeIds = new Set(childSections.map((item) => item.name.split('.').pop() || ''))
  const childNodes = childSections
    .map((section) =>
      compileNodeSection(
        section,
        childSections,
        {
          nodeIds: childNodeIds,
          variableRoots
        },
        diagnostics
      )
    )
    .filter((node): node is OFBlueprintNode => Boolean(node))

  const edges = compileEdgeSpecs(
    getArrayOfStrings(subgraphSection, 'edges'),
    childNodeIds,
    subgraphSection?.location || createDefaultLocation(),
    diagnostics
  )

  return {
    nodes: childNodes,
    edges
  }
}

function compileGraphEdges(
  graphSection: OFBlueprintSectionAst | undefined,
  nodeIds: Set<string>,
  location: OFBlueprintTextLocation,
  diagnostics: OFBlueprintTextDiagnostic[]
): OFBlueprintEdge[] {
  if (graphSection) {
    validateSectionKeys(graphSection, GRAPH_ALLOWED_KEYS, 'graph', diagnostics)
  }
  return compileEdgeSpecs(getArrayOfStrings(graphSection, 'edges'), nodeIds, location, diagnostics)
}

function compileEdgeSpecs(
  specs: string[],
  nodeIds: Set<string>,
  location: OFBlueprintTextLocation,
  diagnostics: OFBlueprintTextDiagnostic[]
): OFBlueprintEdge[] {
  return specs.flatMap((spec, index) => {
    const parsed = parseEdgeSpec(spec)
    if (!parsed) {
      diagnostics.push(
        createDiagnostic({
          code: 'invalid-edge-spec',
          message: `无法解析 edge 语句：${spec}`,
          path: `edges[${index}]`,
          ...location
        })
      )
      return []
    }

    if (!nodeIds.has(parsed.from.node) || !nodeIds.has(parsed.to.node)) {
      diagnostics.push(
        createDiagnostic({
          code: 'unknown-edge-node',
          message: '连线引用了不存在的节点。',
          path: `edges[${index}]`,
          ...location
        })
      )
      return []
    }

    return [parsed]
  })
}

function getVariableSpecArray(
  section: OFBlueprintSectionAst | undefined | null,
  key: string,
  diagnostics: OFBlueprintTextDiagnostic[],
  location: OFBlueprintTextLocation
): OFAuthoringVariableSpec[] {
  const value = getEntryValue(section, key)
  if (value === undefined) {
    return []
  }
  if (!Array.isArray(value)) {
    diagnostics.push(
      createDiagnostic({
        code: 'invalid-variable-array',
        message: `${key} 必须是单行 JSON 对象数组。`,
        path: key,
        ...location
      })
    )
    return []
  }

  return value
    .map((item, index) =>
      parseAuthoringVariableSpec(item, `${key}[${index}]`, diagnostics, location)
    )
    .filter((item): item is OFAuthoringVariableSpec => Boolean(item))
}

function parseAuthoringVariableSpec(
  value: unknown,
  path: string,
  diagnostics: OFBlueprintTextDiagnostic[],
  location: OFBlueprintTextLocation
): OFAuthoringVariableSpec | null {
  if (!isPlainObject(value)) {
    diagnostics.push(
      createDiagnostic({
        code: 'invalid-variable-spec',
        message: `${path} 必须是对象。`,
        path,
        ...location
      })
    )
    return null
  }

  const variable = typeof value.variable === 'string' ? value.variable.trim() : ''
  if (!variable) {
    diagnostics.push(
      createDiagnostic({
        code: 'missing-variable-name',
        message: `${path}.variable 必须是非空字符串。`,
        path: `${path}.variable`,
        ...location
      })
    )
    return null
  }

  // 明确拒绝旧的多入口字段，避免作者态继续出现多套语义。
  ;['type', 'default', 'fields', 'item_type', 'item_schema'].forEach((legacyKey) => {
    if (legacyKey in value) {
      diagnostics.push(
        createDiagnostic({
          code: 'legacy-variable-key-not-supported',
          message: `${path}.${legacyKey} 已废弃，变量声明只允许使用 schema。`,
          path: `${path}.${legacyKey}`,
          ...location
        })
      )
    }
  })

  const schema = parseAuthoringSchemaNode(value.schema, `${path}.schema`, diagnostics, location)
  if (!schema) {
    return null
  }

  return {
    variable,
    label: typeof value.label === 'string' ? value.label.trim() || undefined : undefined,
    description:
      typeof value.description === 'string' ? value.description.trim() || undefined : undefined,
    required: typeof value.required === 'boolean' ? value.required : undefined,
    schema,
    source: parseAuthoringVariableSource(value.source, `${path}.source`, diagnostics, location)
  }
}

function parseAuthoringSchemaNode(
  value: unknown,
  path: string,
  diagnostics: OFBlueprintTextDiagnostic[],
  location: OFBlueprintTextLocation
): OFJsonSchemaProperty | null {
  if (!isPlainObject(value)) {
    diagnostics.push(
      createDiagnostic({
        code: 'invalid-schema-node',
        message: `${path} 必须是 schema 对象。`,
        path,
        ...location
      })
    )
    return null
  }

  const type = typeof value.type === 'string' ? value.type.trim() : ''
  const description = typeof value.description === 'string' ? value.description.trim() : undefined

  switch (type) {
    case 'string':
    case 'number':
    case 'boolean':
      if ('default' in value && !isScalarDefault(value.default)) {
        diagnostics.push(
          createDiagnostic({
            code: 'invalid-schema-default',
            message: `${path}.default 只能是 string | number | boolean | null。`,
            path: `${path}.default`,
            ...location
          })
        )
      }
      return {
        type,
        description,
        ...(value.default !== undefined
          ? { default: value.default as string | number | boolean | null }
          : {})
      }

    case 'array': {
      if (
        'default' in value &&
        value.default !== undefined &&
        !Array.isArray(value.default) &&
        value.default !== null
      ) {
        diagnostics.push(
          createDiagnostic({
            code: 'invalid-array-default',
            message: `${path}.default 必须是数组或 null。`,
            path: `${path}.default`,
            ...location
          })
        )
      }
      const items = parseAuthoringSchemaNode(value.items, `${path}.items`, diagnostics, location)
      if (!items) {
        return null
      }
      return {
        type: 'array',
        items,
        description,
        ...(value.default !== undefined ? { default: value.default as unknown[] | null } : {})
      }
    }

    case 'object': {
      if (value.additionalProperties !== false) {
        diagnostics.push(
          createDiagnostic({
            code: 'missing-object-closure',
            message: `${path}.additionalProperties 必须显式等于 false。`,
            path: `${path}.additionalProperties`,
            ...location
          })
        )
      }
      if (
        'default' in value &&
        value.default !== undefined &&
        !isPlainObject(value.default) &&
        value.default !== null
      ) {
        diagnostics.push(
          createDiagnostic({
            code: 'invalid-object-default',
            message: `${path}.default 必须是对象或 null。`,
            path: `${path}.default`,
            ...location
          })
        )
      }
      if (!isPlainObject(value.properties) || Object.keys(value.properties).length === 0) {
        diagnostics.push(
          createDiagnostic({
            code: 'invalid-object-properties',
            message: `${path}.properties 必须是非空对象。`,
            path: `${path}.properties`,
            ...location
          })
        )
      }
      const required = Array.isArray(value.required)
        ? value.required.filter(
            (item): item is string => typeof item === 'string' && item.trim().length > 0
          )
        : null
      if (!required) {
        diagnostics.push(
          createDiagnostic({
            code: 'invalid-object-required',
            message: `${path}.required 必须是字符串数组。`,
            path: `${path}.required`,
            ...location
          })
        )
      }

      const properties = Object.fromEntries(
        Object.entries(isPlainObject(value.properties) ? value.properties : {}).flatMap(
          ([key, child]) => {
            const parsedChild = parseAuthoringSchemaNode(
              child,
              `${path}.properties.${key}`,
              diagnostics,
              location
            )
            return parsedChild ? [[key, parsedChild]] : []
          }
        )
      ) as OFJsonSchemaObject['properties']

      if (!Object.keys(properties).length || !required) {
        return null
      }

      return {
        type: 'object',
        properties,
        required,
        additionalProperties: false,
        description,
        ...(value.default !== undefined
          ? { default: value.default as Record<string, unknown> | null }
          : {})
      }
    }

    default:
      diagnostics.push(
        createDiagnostic({
          code: 'unsupported-schema-type',
          message: `${path}.type 只支持 string | number | boolean | object | array。`,
          path: `${path}.type`,
          ...location
        })
      )
      return null
  }
}

function parseAuthoringVariableSource(
  value: unknown,
  path: string,
  diagnostics: OFBlueprintTextDiagnostic[],
  location: OFBlueprintTextLocation
): OFAuthoringVariableSpec['source'] {
  if (value === undefined) {
    return undefined
  }
  if (!isPlainObject(value)) {
    diagnostics.push(
      createDiagnostic({
        code: 'invalid-variable-source',
        message: `${path} 必须是 source 对象。`,
        path,
        ...location
      })
    )
    return undefined
  }

  if (value.mode === 'ref') {
    const ref = typeof value.ref === 'string' ? value.ref.trim() : ''
    if (!ref.startsWith('@')) {
      diagnostics.push(
        createDiagnostic({
          code: 'invalid-source-ref',
          message: `${path}.ref 必须是以 @ 开头的引用字符串。`,
          path: `${path}.ref`,
          ...location
        })
      )
      return undefined
    }
    return { mode: 'ref', ref }
  }

  if (value.mode === 'value') {
    if (!Object.prototype.hasOwnProperty.call(value, 'value')) {
      diagnostics.push(
        createDiagnostic({
          code: 'missing-source-value',
          message: `${path}.value 不能为空。`,
          path: `${path}.value`,
          ...location
        })
      )
      return undefined
    }
    return {
      mode: 'value',
      value: value.value as OFAuthoringValuePayload
    }
  }

  diagnostics.push(
    createDiagnostic({
      code: 'invalid-source-mode',
      message: `${path}.mode 只支持 ref 或 value。`,
      path: `${path}.mode`,
      ...location
    })
  )
  return undefined
}

function buildStartVariables(
  specs: OFAuthoringVariableSpec[],
  diagnostics: OFBlueprintTextDiagnostic[],
  location: OFBlueprintTextLocation
): Record<string, unknown>[] {
  return specs.flatMap((spec, index) => {
    if (spec.source) {
      diagnostics.push(
        createDiagnostic({
          code: 'start-input-source-not-supported',
          message: `inputs[${index}] 不能声明 source；开始节点输入只允许声明 schema。`,
          path: `inputs[${index}].source`,
          ...location
        })
      )
      return []
    }

    return [
      {
        variable: spec.variable,
        label: spec.label || spec.variable,
        description: spec.description,
        required: spec.required,
        type: getOFVarTypeFromSchema(spec.schema),
        schema: spec.schema
      }
    ]
  })
}

function buildLoopVariables(
  specs: OFAuthoringVariableSpec[],
  context: SectionCompileContext,
  diagnostics: OFBlueprintTextDiagnostic[],
  location: OFBlueprintTextLocation
): Record<string, unknown>[] {
  return specs.flatMap((spec, index) => {
    if (!spec.source) {
      diagnostics.push(
        createDiagnostic({
          code: 'missing-loop-var-source',
          message: `vars[${index}] 必须声明 source。`,
          path: `vars[${index}].source`,
          ...location
        })
      )
      return []
    }

    const variable: Record<string, unknown> = {
      variable: spec.variable,
      label: spec.label || spec.variable,
      description: spec.description,
      required: spec.required,
      type: getOFVarTypeFromSchema(spec.schema),
      schema: spec.schema,
      value_type: spec.source.mode === 'ref' ? 'variable' : 'constant'
    }

    if (spec.source.mode === 'ref') {
      const selector = compileReferenceSelector(spec.source.ref, context, diagnostics, location)
      variable.value_selector = selector
      variable.value_source = {
        mode: 'variable',
        ref: {
          selector,
          path: selector.join('.'),
          label: spec.label || spec.variable,
          type: getOFVarTypeFromSchema(spec.schema),
          schema: spec.schema
        }
      }
    } else {
      variable.value = spec.source.value
      variable.value_source = {
        mode: 'constant',
        constant_value: spec.source.value
      }
    }

    return [variable]
  })
}

function buildVariableAssignRules(
  specs: OFAuthoringVariableSpec[],
  context: SectionCompileContext,
  diagnostics: OFBlueprintTextDiagnostic[],
  location: OFBlueprintTextLocation
): Record<string, unknown>[] {
  return specs.flatMap((spec, index) => {
    if (!spec.source) {
      diagnostics.push(
        createDiagnostic({
          code: 'missing-let-source',
          message: `let[${index}] 必须声明 source。`,
          path: `let[${index}].source`,
          ...location
        })
      )
      return []
    }

    const targetType = getOFVarTypeFromSchema(spec.schema)
    if (!targetType) {
      return []
    }

    const rule: Record<string, unknown> = {
      id: `rule_${index + 1}`,
      target_variable: spec.variable,
      target_label: spec.label || spec.variable,
      target_type: targetType,
      schema: spec.schema,
      description: spec.description,
      source_mode: spec.source.mode === 'ref' ? 'variable' : 'constant'
    }

    if (spec.source.mode === 'ref') {
      const selector = compileReferenceSelector(spec.source.ref, context, diagnostics, location)
      rule.source_selector = selector
      rule.source = {
        mode: 'variable',
        ref: {
          selector,
          path: selector.join('.')
        }
      }
    } else {
      rule.constant_value = spec.source.value
      rule.source = {
        mode: 'constant',
        constant_value: spec.source.value
      }
    }

    return [rule]
  })
}

function buildEndOutputs(
  specs: OFAuthoringVariableSpec[],
  context: SectionCompileContext,
  diagnostics: OFBlueprintTextDiagnostic[],
  location: OFBlueprintTextLocation
): Record<string, unknown>[] {
  return specs.flatMap((spec, index) => {
    if (!spec.source) {
      diagnostics.push(
        createDiagnostic({
          code: 'missing-output-source',
          message: `outputs[${index}] 必须声明 source。`,
          path: `outputs[${index}].source`,
          ...location
        })
      )
      return []
    }

    const variable: Record<string, unknown> = {
      variable: spec.variable,
      label: spec.label || spec.variable,
      description: spec.description,
      required: spec.required,
      type: getOFVarTypeFromSchema(spec.schema),
      schema: spec.schema
    }

    if (spec.source.mode === 'ref') {
      const selector = compileReferenceSelector(spec.source.ref, context, diagnostics, location)
      variable.value_selector = selector
    } else {
      variable.value_template = spec.source.value
    }

    return [variable]
  })
}

function isScalarDefault(value: unknown): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
}

function buildStructuredOutput(
  spec: string | undefined,
  diagnostics: OFBlueprintTextDiagnostic[],
  location: OFBlueprintTextLocation
): Record<string, unknown> {
  if (!spec?.trim()) {
    return {
      enabled: false,
      schema: null
    }
  }

  const fields = spec
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => parseStructField(item))
    .filter((item): item is { name: string; type: OFVarType } => Boolean(item))

  if (!fields.length) {
    diagnostics.push(
      createDiagnostic({
        code: 'invalid-struct-spec',
        message: 'struct 字段不能为空，且必须使用 field:type 写法。',
        path: 'struct',
        ...location
      })
    )
  }

  const properties = Object.fromEntries(
    fields.map((field) => [field.name, { type: convertVarTypeToSchemaType(field.type) }])
  )

  return {
    enabled: true,
    schema: {
      type: 'object',
      properties,
      required: fields.map((field) => field.name),
      additionalProperties: false
    }
  }
}

function buildIfCases(
  specs: string[],
  context: SectionCompileContext,
  diagnostics: OFBlueprintTextDiagnostic[],
  location: OFBlueprintTextLocation
): Record<string, unknown>[] {
  return specs.flatMap((spec, index) => {
    const parsed = parseWhenSpec(spec)
    if (!parsed) {
      diagnostics.push(
        createDiagnostic({
          code: 'invalid-if-when',
          message: `无法解析 when 语句：${spec}`,
          path: `when[${index}]`,
          ...location
        })
      )
      return []
    }

    const variableSelector = compileReferenceSelector(parsed.left, context, diagnostics, location)
    const condition: Record<string, unknown> = {
      id: `condition_${index + 1}`,
      variable_selector: variableSelector,
      operator: parsed.operator
    }

    if (parsed.right?.startsWith('@')) {
      const compareSelector = compileReferenceSelector(parsed.right, context, diagnostics, location)
      condition.compare_source_mode = 'variable'
      condition.compare_selector = compareSelector
      condition.compare_ref = {
        selector: compareSelector,
        path: compareSelector.join('.')
      }
    } else if (parsed.right !== undefined) {
      const literal = parseLiteralExpression(parsed.right)
      condition.value = literal.value
      condition.value_type = literal.valueType
    }

    return [
      {
        id: `case_${index + 1}`,
        kind: index === 0 ? 'if' : 'elif',
        label: parsed.handle,
        handleId: parsed.handle,
        conditions: [condition]
      }
    ]
  })
}

function parseEdgeSpec(spec: string): OFBlueprintEdge | null {
  const match = spec
    .trim()
    .match(/^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\s*->\s*([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/)
  if (!match) return null
  const [, fromNode, fromHandle, toNode, toHandle] = match
  return {
    from: { node: fromNode, handle: fromHandle },
    to: { node: toNode, handle: toHandle }
  }
}

function parseWhenSpec(
  spec: string
): { left: string; operator: string; right?: string; handle: string } | null {
  const unaryMatch = spec
    .trim()
    .match(
      /^(.+?)\s+(is_empty|is_not_empty|all_true|any_true|all_false|any_false)\s*=>\s*([A-Za-z0-9_-]+)$/
    )
  if (unaryMatch) {
    const [, left, operatorToken, handle] = unaryMatch
    return {
      left: left.trim(),
      operator: operatorToken.trim(),
      handle: handle.trim()
    }
  }

  const match = spec
    .trim()
    .match(
      /^(.+?)\s*(>=|<=|>|<|==|!=|contains|not_contains|starts_with|ends_with)\s*(.+?)\s*=>\s*([A-Za-z0-9_-]+)$/
    )
  if (!match) return null
  const [, left, operatorToken, right, handle] = match
  const operatorMap: Record<string, string> = {
    '>=': 'gte',
    '<=': 'lte',
    '>': 'gt',
    '<': 'lt',
    '==': 'is',
    '!=': 'is_not',
    contains: 'contains',
    not_contains: 'not_contains',
    starts_with: 'starts_with',
    ends_with: 'ends_with'
  }
  return {
    left: left.trim(),
    operator: operatorMap[operatorToken],
    right: right.trim(),
    handle: handle.trim()
  }
}

function mapPrimitiveType(typeText: string): OFVarType {
  switch (typeText) {
    case 'string':
      return OFVarType.String
    case 'number':
      return OFVarType.Number
    case 'boolean':
      return OFVarType.Boolean
    case 'object':
      return OFVarType.Object
    case 'array':
      return OFVarType.Array
    default:
      return OFVarType.String
  }
}

function parseStructField(spec: string): { name: string; type: OFVarType } | null {
  const match = spec.match(/^([A-Za-z0-9_]+):([A-Za-z]+)$/)
  if (!match) return null
  return {
    name: match[1],
    type: mapPrimitiveType(match[2])
  }
}

function convertVarTypeToSchemaType(type: OFVarType): 'string' | 'number' | 'boolean' | 'object' {
  if (type === OFVarType.Number) return 'number'
  if (type === OFVarType.Boolean) return 'boolean'
  if (type === OFVarType.Object || type === OFVarType.Array) return 'object'
  return 'string'
}

function compileReferenceSelector(
  reference: string,
  context: SectionCompileContext,
  diagnostics: OFBlueprintTextDiagnostic[],
  location: OFBlueprintTextLocation
): string[] {
  const trimmed = reference.trim()
  if (!trimmed.startsWith('@')) {
    diagnostics.push(
      createDiagnostic({
        code: 'invalid-reference',
        message: `引用必须以 @ 开头：${reference}`,
        path: 'reference',
        ...location
      })
    )
    return []
  }

  const parts = trimmed
    .slice(1)
    .split('.')
    .map((item) => item.trim())
    .filter(Boolean)
  if (!parts.length) {
    return []
  }

  if (context.nodeIds.has(parts[0]) && parts.length >= 2) {
    return [`${parts[0]}.${parts[1]}`, ...parts.slice(2)]
  }

  if (context.variableRoots.has(parts[0])) {
    return parts
  }

  if (parts.length >= 2) {
    return [`${parts[0]}.${parts[1]}`, ...parts.slice(2)]
  }

  return parts
}

function parseSectionValue(
  lines: string[],
  lineIndex: number,
  rawValue: string,
  location: OFBlueprintTextLocation
): {
  value: ParsedValue
  diagnostics: OFBlueprintTextDiagnostic[]
  nextLineIndex: number
  location: OFBlueprintTextLocation
} {
  const diagnostics: OFBlueprintTextDiagnostic[] = []
  const trimmed = rawValue.trim()

  if (trimmed.startsWith(MULTILINE_QUOTE)) {
    const rest = trimmed.slice(MULTILINE_QUOTE.length)
    if (rest.endsWith(MULTILINE_QUOTE)) {
      return {
        value: rest.slice(0, -MULTILINE_QUOTE.length),
        diagnostics,
        nextLineIndex: lineIndex + 1,
        location
      }
    }

    const buffer: string[] = [rest]
    let cursor = lineIndex + 1
    while (cursor < lines.length) {
      const line = lines[cursor]
      const closeIndex = line.indexOf(MULTILINE_QUOTE)
      if (closeIndex >= 0) {
        buffer.push(line.slice(0, closeIndex))
        return {
          value: buffer.join('\n').replace(/^\n/, ''),
          diagnostics,
          nextLineIndex: cursor + 1,
          location: {
            line: location.line,
            column: location.column,
            endLine: cursor + 1,
            endColumn: closeIndex + MULTILINE_QUOTE.length
          }
        }
      }
      buffer.push(line)
      cursor += 1
    }

    diagnostics.push(
      createDiagnostic({
        code: 'unterminated-multiline-string',
        message: '多行字符串缺少结束的三引号。',
        path: 'value',
        ...location
      })
    )
    return {
      value: '',
      diagnostics,
      nextLineIndex: lines.length,
      location
    }
  }

  return {
    value: parsePrimitiveValue(trimmed),
    diagnostics,
    nextLineIndex: lineIndex + 1,
    location
  }
}

function parsePrimitiveValue(raw: string): ParsedValue {
  if (!raw) return ''
  if (raw.startsWith('[') || raw.startsWith('{')) {
    try {
      return JSON.parse(raw) as ParsedValue
    } catch {
      return raw
    }
  }
  if (raw.startsWith('"') && raw.endsWith('"')) {
    return JSON.parse(raw)
  }
  if (raw === 'true') return true
  if (raw === 'false') return false
  if (raw === 'null') return null
  if (/^-?\d+(?:\.\d+)?$/.test(raw)) return Number(raw)
  return raw
}

function getEntryValue(section: OFBlueprintSectionAst | undefined | null, key: string): unknown {
  return section?.entries.find((entry) => entry.key === key)?.value
}

function getStringEntry(
  section: OFBlueprintSectionAst | undefined | null,
  key: string
): string | undefined {
  const value = getEntryValue(section, key)
  return typeof value === 'string' ? value : undefined
}

function getArrayOfStrings(
  section: OFBlueprintSectionAst | undefined | null,
  key: string
): string[] {
  const value = getEntryValue(section, key)
  return Array.isArray(value) ? value.map((item) => String(item)) : []
}

function validateSectionKeys(
  section: OFBlueprintSectionAst,
  allowedKeys: Set<string>,
  pathPrefix: string,
  diagnostics: OFBlueprintTextDiagnostic[],
  legacyKeyReplacements: Map<string, string> = _LEGACY_KEY_REPLACEMENTS
): void {
  section.entries.forEach((entry) => {
    if (allowedKeys.has(entry.key)) {
      return
    }

    const replacement = legacyKeyReplacements.get(entry.key)
    diagnostics.push(
      createDiagnostic({
        code: replacement ? 'legacy-key-not-supported' : 'unknown-section-key',
        message: replacement
          ? `${section.name} 中的键 ${entry.key} 已废弃，请改用 ${replacement}。`
          : `${section.name} 不支持键 ${entry.key}。`,
        path: `${pathPrefix}.${entry.key}`,
        ...entry.location
      })
    )
  })
}

function isTopLevelNodeSection(name: string): boolean {
  return name.startsWith('node.') && name.slice('node.'.length).split('.').length === 1
}

function extractTopLevelNodeId(name: string): string {
  return name.slice('node.'.length)
}

function parseModelId(value: string): { provider: string; name: string } {
  const normalized = value.trim()
  if (normalized.includes('/')) {
    const [provider, ...rest] = normalized.split('/')
    return {
      provider,
      name: rest.join('/')
    }
  }
  if (normalized.includes(':')) {
    const [provider, ...rest] = normalized.split(':')
    return {
      provider,
      name: rest.join(':')
    }
  }
  return {
    provider: '',
    name: normalized
  }
}

function parseLiteralExpression(expression: string): { value: unknown; valueType: OFVarType } {
  if (expression === 'true' || expression === 'false') {
    return {
      value: expression === 'true',
      valueType: OFVarType.Boolean
    }
  }
  if (/^-?\d+(?:\.\d+)?$/.test(expression)) {
    return {
      value: Number(expression),
      valueType: OFVarType.Number
    }
  }
  if (expression.startsWith('"') && expression.endsWith('"')) {
    return {
      value: JSON.parse(expression),
      valueType: OFVarType.String
    }
  }
  if (expression.startsWith('[') || expression.startsWith('{')) {
    try {
      const parsed = JSON.parse(expression)
      return {
        value: parsed,
        valueType: Array.isArray(parsed) ? OFVarType.Array : OFVarType.Object
      }
    } catch {
      return {
        value: expression,
        valueType: OFVarType.String
      }
    }
  }

  return {
    value: expression,
    valueType: OFVarType.String
  }
}

function resolveSectionLocation(
  path: string,
  ast: OFBlueprintSectionDslAst
): OFBlueprintTextLocation {
  if (path.startsWith('workflow')) {
    return (
      ast.sections.find((section) => section.name === 'workflow')?.location ||
      createDefaultLocation()
    )
  }

  const nodeMatch = path.match(/^nodes\.(.+?)(?:\.|$)/)
  if (nodeMatch) {
    return (
      ast.sections.find(
        (section) =>
          section.name === `node.${nodeMatch[1]}` || section.name.endsWith(`.${nodeMatch[1]}`)
      )?.location || createDefaultLocation()
    )
  }

  if (path.startsWith('edges[')) {
    return (
      ast.sections.find((section) => section.name === 'graph')?.location || createDefaultLocation()
    )
  }

  return createDefaultLocation()
}

function tryCompileRunnable(
  blueprint: OFBlueprintWorkflow,
  ast: OFBlueprintSectionDslAst,
  diagnostics: OFBlueprintTextDiagnostic[]
): OFRunnableWorkflow | null {
  try {
    return compileOFBlueprintToRunnable(blueprint)
  } catch (error) {
    diagnostics.push(
      createDiagnostic({
        code: 'runnable-compile-failed',
        message: error instanceof Error ? error.message : '无法编译为 runnable workflow。',
        path: 'workflow',
        ...resolveSectionLocation('workflow', ast)
      })
    )
    return null
  }
}

function findFirstMeaningfulLine(lines: string[]): number {
  return lines.findIndex((line) => {
    const trimmed = line.trim()
    return Boolean(trimmed) && !trimmed.startsWith('#')
  })
}

function createDiagnostic(
  input: Omit<OFBlueprintTextDiagnostic, 'severity'>
): OFBlueprintTextDiagnostic {
  return {
    ...input,
    severity: 'error'
  }
}

function createLineDiagnostic(
  code: string,
  message: string,
  path: string,
  lineIndex: number,
  rawLine: string
): OFBlueprintTextDiagnostic {
  return createDiagnostic({
    code,
    message,
    path,
    line: lineIndex + 1,
    column: 1,
    endLine: lineIndex + 1,
    endColumn: rawLine.length || 1,
    context: rawLine.trim()
  })
}

function createLineLocation(lineIndex: number, rawLine: string): OFBlueprintTextLocation {
  return {
    line: lineIndex + 1,
    column: 1,
    endLine: lineIndex + 1,
    endColumn: rawLine.length || 1
  }
}

function createDefaultLocation(): OFBlueprintTextLocation {
  return {
    line: 1,
    column: 1,
    endLine: 1,
    endColumn: 1
  }
}

function buildUnknownStatementMessage(rawLine: string): string {
  const trimmed = rawLine.trim()
  const looksLikeMultilineJsonFragment =
    trimmed === '[' ||
    trimmed === ']' ||
    trimmed === '{' ||
    trimmed === '}' ||
    trimmed.endsWith(',') ||
    trimmed.startsWith('"') ||
    trimmed.startsWith('{') ||
    trimmed.startsWith('}')

  if (looksLikeMultilineJsonFragment) {
    return '无法识别这条 OFT/1 语句。若你在写数组或对象，请改成单行合法 JSON；OFT/1 不支持多行数组项或多行对象项。'
  }

  return '无法识别这条 OFT/1 语句。'
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
