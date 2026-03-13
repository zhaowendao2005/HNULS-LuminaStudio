import type { OFRunnableWorkflow } from '../contract'
import {
  OFBlockEnum,
  OFVarType,
  type OFBlueprintEdge,
  type OFBlueprintNode,
  type OFBlueprintTextCompileResult,
  type OFBlueprintTextDiagnostic,
  type OFBlueprintTextLocation,
  type OFBlueprintTextParseResult,
  type OFBlueprintSectionAst,
  type OFBlueprintSectionDslAst,
  type OFBlueprintWorkflow,
  type OFJsonSchemaObject,
  type OFStructuredJsonSchema
} from '..'
import { compileOFBlueprintToRunnable } from './compiler'
import { validateOFBlueprint } from './validator'

export const OF_BLUEPRINT_SECTION_DSL_HEADER = 'OFT/1'
export const OF_BLUEPRINT_SECTION_DSL_SECTION_FORMS = [
  '[workflow]',
  '[input.<name>]',
  '[node.<id>]',
  '[node.<container>.<child>]',
  '[subgraph.<container>]',
  '[graph]'
] as const
export const OF_BLUEPRINT_SECTION_DSL_RULES = [
  '所有结构用 section 表达，不使用缩进表达层级。',
  '多行 prompt 使用三引号字符串 `""" ... """`。',
  '数组必须写成单行 JSON 数组。',
  'start/llm/if/loop/iter/set/end 使用节点专用字段，不再直接写深路径 `data.*`。',
  '引用统一使用 @ref 语法，由编译器转换成 selector。'
] as const

type ParsedValue = string | number | boolean | null | string[] | number[] | boolean[] | object

type SectionCompileContext = {
  inputNames: Set<string>
  nodeIds: Set<string>
  variableRoots: Set<string>
}

type InputDefinition = {
  name: string
  type: string
  desc?: string
  defaultValue?: unknown
  fields?: string[]
}

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
          '无法识别这条 OFT/1 语句。',
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
  const inputDefinitions = compileInputDefinitions(ast.sections, diagnostics)
  const topNodeSections = ast.sections.filter((section) => isTopLevelNodeSection(section.name))
  const topNodeIds = new Set(topNodeSections.map((section) => extractTopLevelNodeId(section.name)))
  const inputNames = new Set(inputDefinitions.map((item) => item.name))

  const nodes = topNodeSections
    .map((section) =>
      compileNodeSection(
        section,
        ast.sections,
        {
          inputNames,
          nodeIds: topNodeIds,
          variableRoots: inputNames
        },
        inputDefinitions,
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
  const name = getStringEntry(section, 'name')
  const description = getStringEntry(section, 'desc') || getStringEntry(section, 'description')
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

function compileInputDefinitions(
  sections: OFBlueprintSectionAst[],
  diagnostics: OFBlueprintTextDiagnostic[]
): InputDefinition[] {
  return sections
    .filter((section) => section.name.startsWith('input.'))
    .map((section) => {
      const name = section.name.slice('input.'.length)
      const type = getStringEntry(section, 'type') || ''
      const desc =
        getStringEntry(section, 'desc') || getStringEntry(section, 'description') || undefined
      const defaultValue = getEntryValue(section, 'default')
      const fields = getStringArrayEntry(section, 'fields')

      if (!name || !type) {
        diagnostics.push(
          createDiagnostic({
            code: 'invalid-input-section',
            message: 'input section 必须包含变量名和 type。',
            path: section.name,
            ...section.location
          })
        )
      }

      return { name, type, desc, defaultValue, fields }
    })
}

function compileNodeSection(
  section: OFBlueprintSectionAst,
  allSections: OFBlueprintSectionAst[],
  context: SectionCompileContext,
  inputDefinitions: InputDefinition[],
  diagnostics: OFBlueprintTextDiagnostic[]
): OFBlueprintNode | null {
  const nodePath = section.name.slice('node.'.length).split('.')
  const nodeId = nodePath[nodePath.length - 1]
  const nodeType = normalizeNodeType(getStringEntry(section, 'type') || '')
  const title = getStringEntry(section, 'title') || undefined
  const description =
    getStringEntry(section, 'desc') || getStringEntry(section, 'description') || undefined

  if (!nodeType) {
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
      const inputs = getStringArrayEntry(section, 'inputs')
      node.config.input = {
        variables: buildStartVariables(inputs, inputDefinitions, diagnostics, section.location)
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
        getArrayOfStrings(section, 'let'),
        context,
        diagnostics,
        section.location
      )
      break
    }
    case OFBlockEnum.End: {
      node.config.output = {
        variables: buildEndOutputs(
          getArrayOfStrings(section, 'outputs'),
          context,
          diagnostics,
          section.location
        )
      }
      break
    }
    case OFBlockEnum.Loop: {
      const countValue = getEntryValue(section, 'count')
      if (typeof countValue !== 'number' || !Number.isInteger(countValue) || countValue < 1) {
        diagnostics.push(
          createDiagnostic({
            code: 'invalid-loop-count',
            message: 'loop.count 当前只支持大于等于 1 的常量整数。',
            path: `nodes.${nodeId}.count`,
            ...section.location
          })
        )
        node.config.loop_count = 1
      } else {
        node.config.loop_count = countValue
      }
      const loopVars = buildLoopVariables(
        getArrayOfStrings(section, 'vars'),
        context,
        diagnostics,
        section.location
      )
      node.config.loop_variables = loopVars
      node.config.entry = getStringEntry(subgraphSection, 'entry') || undefined
      node.subgraph = buildSubgraph(
        childSections,
        subgraphSection,
        inputDefinitions,
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
      node.subgraph = buildSubgraph(
        childSections,
        subgraphSection,
        inputDefinitions,
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
  inputDefinitions: InputDefinition[],
  diagnostics: OFBlueprintTextDiagnostic[],
  variableRoots: Set<string>
): OFBlueprintNode['subgraph'] {
  const childNodeIds = new Set(childSections.map((item) => item.name.split('.').pop() || ''))
  const childNodes = childSections
    .map((section) =>
      compileNodeSection(
        section,
        childSections,
        {
          inputNames: new Set(inputDefinitions.map((item) => item.name)),
          nodeIds: childNodeIds,
          variableRoots
        },
        inputDefinitions,
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

function buildStartVariables(
  names: string[],
  inputDefinitions: InputDefinition[],
  diagnostics: OFBlueprintTextDiagnostic[],
  location: OFBlueprintTextLocation
): Record<string, unknown>[] {
  const definitionMap = new Map(inputDefinitions.map((item) => [item.name, item] as const))
  return names.flatMap((name) => {
    const definition = definitionMap.get(name)
    if (!definition) {
      diagnostics.push(
        createDiagnostic({
          code: 'unknown-input-variable',
          message: `start.inputs 引用了不存在的输入变量 ${name}。`,
          path: `inputs.${name}`,
          ...location
        })
      )
      return []
    }

    return [buildInputVariable(definition)]
  })
}

function buildInputVariable(definition: InputDefinition): Record<string, unknown> {
  const parsedType = parseTypeSpec(definition.type)
  const base = {
    variable: definition.name,
    label: definition.name,
    type: parsedType.type,
    description: definition.desc
  } as Record<string, unknown>

  if (parsedType.type === OFVarType.Array && parsedType.itemType) {
    base.item_type = parsedType.itemType
  }

  if (parsedType.type === OFVarType.Object) {
    base.schema = buildObjectSchema(definition.fields || [])
  } else if (definition.defaultValue !== undefined) {
    base.default = definition.defaultValue
  }

  return base
}

function buildObjectSchema(fieldSpecs: string[]): OFStructuredJsonSchema {
  const properties: Record<string, OFJsonSchemaObject['properties'][string]> = {}
  const required: string[] = []

  fieldSpecs.forEach((fieldSpec) => {
    const parsed = parseTypedAssignment(fieldSpec)
    if (!parsed) {
      return
    }
    properties[parsed.name] = {
      type: convertVarTypeToSchemaType(parsed.typeInfo.type),
      description: parsed.name,
      ...(parsed.constantValue !== undefined
        ? { default: parsed.constantValue as string | number | boolean | null }
        : {})
    }
    required.push(parsed.name)
  })

  return {
    type: 'object',
    properties,
    required,
    additionalProperties: false
  }
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

    if (parsed.right.startsWith('@')) {
      const compareSelector = compileReferenceSelector(parsed.right, context, diagnostics, location)
      condition.compare_source_mode = 'variable'
      condition.compare_selector = compareSelector
      condition.compare_ref = {
        selector: compareSelector,
        path: compareSelector.join('.')
      }
    } else {
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

function buildLoopVariables(
  specs: string[],
  context: SectionCompileContext,
  diagnostics: OFBlueprintTextDiagnostic[],
  location: OFBlueprintTextLocation
): Record<string, unknown>[] {
  return specs.flatMap((spec, index) => {
    const parsed = parseTypedAssignment(spec)
    if (!parsed) {
      diagnostics.push(
        createDiagnostic({
          code: 'invalid-loop-var',
          message: `无法解析 loop vars 语句：${spec}`,
          path: `vars[${index}]`,
          ...location
        })
      )
      return []
    }

    const variable: Record<string, unknown> = {
      variable: parsed.name,
      label: parsed.name,
      type: parsed.typeInfo.type,
      value_type: parsed.ref ? 'variable' : 'constant'
    }

    if (parsed.typeInfo.itemType) {
      variable.item_type = parsed.typeInfo.itemType
    }

    if (parsed.ref) {
      const selector = compileReferenceSelector(parsed.ref, context, diagnostics, location)
      variable.value_source = {
        mode: 'variable',
        ref: {
          selector,
          path: selector.join('.')
        }
      }
      variable.value_selector = selector
    } else {
      variable.value = parsed.constantValue ?? null
    }

    return [variable]
  })
}

function buildVariableAssignRules(
  specs: string[],
  context: SectionCompileContext,
  diagnostics: OFBlueprintTextDiagnostic[],
  location: OFBlueprintTextLocation
): Record<string, unknown>[] {
  return specs.flatMap((spec, index) => {
    const parsed = parseTypedAssignment(spec)
    if (!parsed) {
      diagnostics.push(
        createDiagnostic({
          code: 'invalid-let-rule',
          message: `无法解析 let 语句：${spec}`,
          path: `let[${index}]`,
          ...location
        })
      )
      return []
    }

    const rule: Record<string, unknown> = {
      id: `rule_${index + 1}`,
      target_variable: parsed.name,
      target_label: parsed.name,
      target_type: parsed.typeInfo.type,
      source_mode: parsed.ref ? 'variable' : 'constant'
    }

    if (parsed.typeInfo.itemType) {
      rule.item_type = parsed.typeInfo.itemType
    }

    if (parsed.ref) {
      const selector = compileReferenceSelector(parsed.ref, context, diagnostics, location)
      rule.source_selector = selector
      rule.source = {
        mode: 'variable',
        ref: {
          selector,
          path: selector.join('.')
        }
      }
    } else {
      rule.constant_value = parsed.constantValue ?? null
      rule.source = {
        mode: 'constant',
        constant_value: parsed.constantValue ?? null
      }
      if (parsed.typeInfo.type === OFVarType.Object && isPlainObject(parsed.constantValue)) {
        rule.schema = buildObjectSchemaFromValue(parsed.constantValue)
      }
    }

    return [rule]
  })
}

function buildEndOutputs(
  specs: string[],
  context: SectionCompileContext,
  diagnostics: OFBlueprintTextDiagnostic[],
  location: OFBlueprintTextLocation
): Record<string, unknown>[] {
  return specs.flatMap((spec, index) => {
    const parsed = parseOutputSpec(spec)
    if (!parsed) {
      diagnostics.push(
        createDiagnostic({
          code: 'invalid-output-spec',
          message: `无法解析 outputs 语句：${spec}`,
          path: `outputs[${index}]`,
          ...location
        })
      )
      return []
    }

    const selector = compileReferenceSelector(parsed.ref, context, diagnostics, location)
    const variable: Record<string, unknown> = {
      variable: parsed.name,
      label: parsed.name,
      type: parsed.typeInfo.type,
      value_selector: selector
    }

    if (parsed.typeInfo.itemType) {
      variable.item_type = parsed.typeInfo.itemType
    }

    return [variable]
  })
}

function parseEdgeSpec(spec: string): OFBlueprintEdge | null {
  const match = spec
    .trim()
    .match(
      /^([A-Za-z0-9_-]+)(?:\.([A-Za-z0-9_-]+))?\s*->\s*([A-Za-z0-9_-]+)(?:\.([A-Za-z0-9_-]+))?$/
    )
  if (!match) return null
  const [, fromNode, fromHandle, toNode, toHandle] = match
  return {
    from: { node: fromNode, handle: fromHandle || 'source' },
    to: { node: toNode, handle: toHandle || 'target' }
  }
}

function parseWhenSpec(
  spec: string
): { left: string; operator: string; right: string; handle: string } | null {
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

function parseOutputSpec(
  spec: string
): { name: string; typeInfo: ReturnType<typeof parseTypeSpec>; ref: string } | null {
  const match = spec.trim().match(/^([A-Za-z0-9_]+):([A-Za-z:]+)\s*<-\s*(.+)$/)
  if (!match) return null
  const [, name, typeText, ref] = match
  return {
    name,
    typeInfo: parseTypeSpec(typeText),
    ref: ref.trim()
  }
}

function parseTypedAssignment(spec: string): {
  name: string
  typeInfo: ReturnType<typeof parseTypeSpec>
  ref: string | null
  constantValue: unknown
} | null {
  const match = spec.trim().match(/^([A-Za-z0-9_]+):([A-Za-z:]+)\s*=\s*(.+)$/)
  if (!match) return null
  const [, name, typeText, expression] = match
  if (expression.trim().startsWith('@')) {
    return {
      name,
      typeInfo: parseTypeSpec(typeText),
      ref: expression.trim(),
      constantValue: null
    }
  }
  return {
    name,
    typeInfo: parseTypeSpec(typeText),
    ref: null,
    constantValue: parseLiteralExpression(expression.trim()).value
  }
}

function parseTypeSpec(typeText: string): { type: OFVarType; itemType?: OFVarType } {
  const trimmed = typeText.trim()
  if (trimmed.startsWith('array:')) {
    return {
      type: OFVarType.Array,
      itemType: mapPrimitiveType(trimmed.slice('array:'.length))
    }
  }
  return {
    type: mapPrimitiveType(trimmed)
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

function buildObjectSchemaFromValue(value: unknown): OFStructuredJsonSchema | null {
  if (!isPlainObject(value)) return null
  const properties = Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, { type: inferSchemaType(item) }])
  )
  return {
    type: 'object',
    properties,
    required: Object.keys(properties),
    additionalProperties: false
  }
}

function inferSchemaType(value: unknown): 'string' | 'number' | 'boolean' | 'object' {
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (isPlainObject(value) || Array.isArray(value)) return 'object'
  return 'string'
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

function getStringArrayEntry(
  section: OFBlueprintSectionAst | undefined | null,
  key: string
): string[] {
  return getArrayOfStrings(section, key)
}

function getArrayOfStrings(
  section: OFBlueprintSectionAst | undefined | null,
  key: string
): string[] {
  const value = getEntryValue(section, key)
  return Array.isArray(value) ? value.map((item) => String(item)) : []
}

function isTopLevelNodeSection(name: string): boolean {
  return name.startsWith('node.') && name.slice('node.'.length).split('.').length === 1
}

function extractTopLevelNodeId(name: string): string {
  return name.slice('node.'.length)
}

function normalizeNodeType(rawType: string): OFBlockEnum | null {
  const normalized = rawType.trim().toLowerCase()
  switch (normalized) {
    case 'start':
      return OFBlockEnum.Start
    case 'llm':
      return OFBlockEnum.LLM
    case 'if':
    case 'ifelse':
      return OFBlockEnum.IfElse
    case 'loop':
      return OFBlockEnum.Loop
    case 'iter':
    case 'iteration':
      return OFBlockEnum.Iteration
    case 'set':
    case 'variable-assign':
      return OFBlockEnum.VariableAssign
    case 'end':
      return OFBlockEnum.End
    default:
      return null
  }
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

function createDiagnostic(input: OFBlueprintTextDiagnostic): OFBlueprintTextDiagnostic {
  return {
    severity: 'error',
    ...input
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
