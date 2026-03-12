export type OFPlanningRootKey = 'analysis' | 'design'

export type OFPlanningSectionKey =
  | 'analysis-summary'
  | 'analysis-goals'
  | 'analysis-success-criteria'
  | 'analysis-constraints'
  | 'analysis-prohibitions'
  | 'analysis-missing-info'
  | 'analysis-readiness-signals'
  | 'design-candidate-nodes'
  | 'design-input-requirements'
  | 'design-output-requirements'
  | 'design-confirmation-questions'
  | 'design-blueprint-requirements'

export type OFPlanningCommandMode = 'apply' | 'propose' | 'noop'

export interface OFPlanningSectionDefinition {
  key: OFPlanningSectionKey
  rootKey: OFPlanningRootKey
  rootTitle: string
  title: string
  order: number
}

export interface OFPlanningValidationError {
  code:
    | 'unknown-root'
    | 'unknown-section'
    | 'duplicate-section'
    | 'section-before-root'
    | 'invalid-root-order'
    | 'invalid-section-order'
    | 'missing-section'
    | 'missing-doc'
    | 'missing-mode'
    | 'missing-content'
    | 'unexpected-content'
    | 'invalid-command'
    | 'invalid-mode'
  message: string
  line?: number
}

export interface OFPlanningDocument {
  sections: Record<OFPlanningSectionKey, string>
}

export interface OFPlanningMarkdownParseResult {
  document: OFPlanningDocument
  errors: OFPlanningValidationError[]
}

export interface OFPlanningCommandParseResult {
  documentId: string | null
  mode: OFPlanningCommandMode
  commands: OFPlanningEditCommand[]
  errors: OFPlanningValidationError[]
}

export interface OFPlanningReplaceSectionCommand {
  type: 'replace-section'
  sectionKey: OFPlanningSectionKey
  content: string
}

export interface OFPlanningAppendSectionCommand {
  type: 'append-section'
  sectionKey: OFPlanningSectionKey
  content: string
}

export interface OFPlanningClearSectionCommand {
  type: 'clear-section'
  sectionKey: OFPlanningSectionKey
}

export interface OFPlanningResetDocumentCommand {
  type: 'reset-document'
}

export interface OFPlanningNoopCommand {
  type: 'noop'
}

export type OFPlanningEditCommand =
  | OFPlanningReplaceSectionCommand
  | OFPlanningAppendSectionCommand
  | OFPlanningClearSectionCommand
  | OFPlanningResetDocumentCommand
  | OFPlanningNoopCommand

export interface OFPlanningEditProposal {
  documentId: string
  mode: OFPlanningCommandMode
  commandDsl: string
  commands: OFPlanningEditCommand[]
  affectedSectionKeys: OFPlanningSectionKey[]
}

const ROOT_TITLES: Record<OFPlanningRootKey, string> = {
  analysis: '需求分析',
  design: '设计交接'
}

export const OF_PLANNING_SECTION_DEFINITIONS: OFPlanningSectionDefinition[] = [
  {
    key: 'analysis-summary',
    rootKey: 'analysis',
    rootTitle: ROOT_TITLES.analysis,
    title: '摘要',
    order: 1
  },
  {
    key: 'analysis-goals',
    rootKey: 'analysis',
    rootTitle: ROOT_TITLES.analysis,
    title: '目标',
    order: 2
  },
  {
    key: 'analysis-success-criteria',
    rootKey: 'analysis',
    rootTitle: ROOT_TITLES.analysis,
    title: '成功标准',
    order: 3
  },
  {
    key: 'analysis-constraints',
    rootKey: 'analysis',
    rootTitle: ROOT_TITLES.analysis,
    title: '约束',
    order: 4
  },
  {
    key: 'analysis-prohibitions',
    rootKey: 'analysis',
    rootTitle: ROOT_TITLES.analysis,
    title: '禁止项',
    order: 5
  },
  {
    key: 'analysis-missing-info',
    rootKey: 'analysis',
    rootTitle: ROOT_TITLES.analysis,
    title: '待补充信息',
    order: 6
  },
  {
    key: 'analysis-readiness-signals',
    rootKey: 'analysis',
    rootTitle: ROOT_TITLES.analysis,
    title: '成熟度信号',
    order: 7
  },
  {
    key: 'design-candidate-nodes',
    rootKey: 'design',
    rootTitle: ROOT_TITLES.design,
    title: '候选节点',
    order: 8
  },
  {
    key: 'design-input-requirements',
    rootKey: 'design',
    rootTitle: ROOT_TITLES.design,
    title: '输入要求',
    order: 9
  },
  {
    key: 'design-output-requirements',
    rootKey: 'design',
    rootTitle: ROOT_TITLES.design,
    title: '输出要求',
    order: 10
  },
  {
    key: 'design-confirmation-questions',
    rootKey: 'design',
    rootTitle: ROOT_TITLES.design,
    title: '待确认问题',
    order: 11
  },
  {
    key: 'design-blueprint-requirements',
    rootKey: 'design',
    rootTitle: ROOT_TITLES.design,
    title: '蓝图要求',
    order: 12
  }
]

const SECTION_DEFINITION_MAP = Object.fromEntries(
  OF_PLANNING_SECTION_DEFINITIONS.map((definition) => [definition.key, definition])
) as Record<OFPlanningSectionKey, OFPlanningSectionDefinition>

const TITLE_TO_SECTION_KEY = Object.fromEntries(
  OF_PLANNING_SECTION_DEFINITIONS.map((definition) => [definition.title, definition.key])
) as Record<string, OFPlanningSectionKey>

export function createEmptyOFPlanningDocument(): OFPlanningDocument {
  return {
    sections: Object.fromEntries(
      OF_PLANNING_SECTION_DEFINITIONS.map((definition) => [definition.key, ''])
    ) as Record<OFPlanningSectionKey, string>
  }
}

export function getOFPlanningSectionDefinition(
  sectionKey: OFPlanningSectionKey
): OFPlanningSectionDefinition {
  return SECTION_DEFINITION_MAP[sectionKey]
}

export function getOFPlanningRootTitle(rootKey: OFPlanningRootKey): string {
  return ROOT_TITLES[rootKey]
}

export function getOFPlanningSectionKeysByRoot(rootKey: OFPlanningRootKey): OFPlanningSectionKey[] {
  return OF_PLANNING_SECTION_DEFINITIONS.filter((definition) => definition.rootKey === rootKey).map(
    (definition) => definition.key
  )
}

export function buildOFPlanningMarkdown(document: OFPlanningDocument): string {
  const lines: string[] = []

  ;(['analysis', 'design'] as OFPlanningRootKey[]).forEach((rootKey, rootIndex) => {
    if (rootIndex > 0) {
      lines.push('')
    }

    lines.push(`# ${ROOT_TITLES[rootKey]}`)

    getOFPlanningSectionKeysByRoot(rootKey).forEach((sectionKey) => {
      const definition = getOFPlanningSectionDefinition(sectionKey)
      lines.push(`## ${definition.title}`)
      const content = document.sections[sectionKey]?.trim() || ''
      if (content) {
        lines.push(...content.split('\n'))
      }
      lines.push('')
    })
  })

  return lines.join('\n').trim()
}

export function parseOFPlanningMarkdown(markdown: string): OFPlanningMarkdownParseResult {
  const document = createEmptyOFPlanningDocument()
  const errors: OFPlanningValidationError[] = []
  const lines = markdown.split('\n')

  let currentRoot: OFPlanningRootKey | null = null
  let currentSectionKey: OFPlanningSectionKey | null = null
  let currentContentLines: string[] = []
  let rootOrderCursor = 0
  let sectionOrderCursor = 0
  const seenSections = new Set<OFPlanningSectionKey>()

  function flushSection(): void {
    if (!currentSectionKey) {
      return
    }
    document.sections[currentSectionKey] = currentContentLines.join('\n').trim()
    currentContentLines = []
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim()

    if (trimmed.startsWith('# ')) {
      flushSection()
      currentSectionKey = null
      const rootTitle = trimmed.slice(2).trim()
      const nextRoot = (Object.entries(ROOT_TITLES).find(([, title]) => title === rootTitle)?.[0] ||
        null) as OFPlanningRootKey | null

      if (!nextRoot) {
        errors.push({
          code: 'unknown-root',
          line: index + 1,
          message: `未知的 planning 根标题：${rootTitle}`
        })
        currentRoot = null
        return
      }

      const expectedRoot = (['analysis', 'design'] as OFPlanningRootKey[])[rootOrderCursor] || null
      if (nextRoot !== expectedRoot) {
        errors.push({
          code: 'invalid-root-order',
          line: index + 1,
          message: `planning 根标题顺序错误：期望 ${expectedRoot ? ROOT_TITLES[expectedRoot] : '结束'}，实际 ${rootTitle}`
        })
      } else {
        rootOrderCursor += 1
      }

      currentRoot = nextRoot
      sectionOrderCursor = OF_PLANNING_SECTION_DEFINITIONS.findIndex(
        (definition) => definition.rootKey === currentRoot
      )
      return
    }

    if (trimmed.startsWith('## ')) {
      flushSection()
      const sectionTitle = trimmed.slice(3).trim()
      const sectionKey = TITLE_TO_SECTION_KEY[sectionTitle] || null

      if (!currentRoot) {
        errors.push({
          code: 'section-before-root',
          line: index + 1,
          message: `小节标题 ${sectionTitle} 出现在根标题之前`
        })
        currentSectionKey = null
        return
      }

      if (!sectionKey) {
        errors.push({
          code: 'unknown-section',
          line: index + 1,
          message: `未知的 planning 小节标题：${sectionTitle}`
        })
        currentSectionKey = null
        return
      }

      const definition = getOFPlanningSectionDefinition(sectionKey)
      if (definition.rootKey !== currentRoot) {
        errors.push({
          code: 'invalid-section-order',
          line: index + 1,
          message: `小节标题 ${sectionTitle} 不属于当前根节 ${ROOT_TITLES[currentRoot]}`
        })
      }

      if (seenSections.has(sectionKey)) {
        errors.push({
          code: 'duplicate-section',
          line: index + 1,
          message: `planning 小节重复出现：${sectionTitle}`
        })
      }

      if (definition.order < sectionOrderCursor + 1) {
        errors.push({
          code: 'invalid-section-order',
          line: index + 1,
          message: `planning 小节顺序错误：${sectionTitle}`
        })
      }

      seenSections.add(sectionKey)
      currentSectionKey = sectionKey
      sectionOrderCursor = definition.order
      return
    }

    if (currentSectionKey) {
      currentContentLines.push(line)
    }
  })

  flushSection()

  OF_PLANNING_SECTION_DEFINITIONS.forEach((definition) => {
    if (!seenSections.has(definition.key)) {
      errors.push({
        code: 'missing-section',
        message: `缺少 planning 小节：${definition.title}`
      })
    }
  })

  return {
    document,
    errors
  }
}

export function parseOFPlanningCommandDsl(commandDsl: string): OFPlanningCommandParseResult {
  const lines = commandDsl.split('\n')
  const errors: OFPlanningValidationError[] = []
  const commands: OFPlanningEditCommand[] = []
  let documentId: string | null = null
  let mode: OFPlanningCommandMode = 'noop'
  let currentCommand: 'replace-section' | 'append-section' | null = null
  let currentSectionKey: OFPlanningSectionKey | null = null
  let contentLines: string[] = []
  let inContentBlock = false

  function flushContent(): void {
    if (!currentCommand || !currentSectionKey) {
      return
    }

    const content = contentLines.join('\n').trim()
    if (!content) {
      errors.push({
        code: 'missing-content',
        message: `命令 ${currentCommand} 缺少正文`
      })
    } else if (currentCommand === 'replace-section') {
      commands.push({
        type: 'replace-section',
        sectionKey: currentSectionKey,
        content
      })
    } else {
      commands.push({
        type: 'append-section',
        sectionKey: currentSectionKey,
        content
      })
    }

    currentCommand = null
    currentSectionKey = null
    contentLines = []
    inContentBlock = false
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (!trimmed) {
      if (inContentBlock) {
        contentLines.push(line)
      }
      return
    }

    if (trimmed === '<LUMINA_PLANNING_COMMANDS>' || trimmed === '</LUMINA_PLANNING_COMMANDS>') {
      return
    }

    if (trimmed === '<CONTENT>') {
      inContentBlock = true
      contentLines = []
      return
    }

    if (trimmed === '</CONTENT>') {
      flushContent()
      return
    }

    if (inContentBlock) {
      contentLines.push(line)
      return
    }

    if (trimmed.startsWith('DOC ')) {
      documentId = trimmed.slice(4).trim() || null
      return
    }

    if (trimmed.startsWith('MODE ')) {
      const nextMode = trimmed.slice(5).trim().toLowerCase() as OFPlanningCommandMode
      if (!['apply', 'propose', 'noop'].includes(nextMode)) {
        errors.push({
          code: 'invalid-mode',
          line: index + 1,
          message: `未知的 MODE：${trimmed.slice(5).trim()}`
        })
      } else {
        mode = nextMode
      }
      return
    }

    if (trimmed === 'RESET_DOCUMENT') {
      commands.push({ type: 'reset-document' })
      return
    }

    if (trimmed === 'NOOP') {
      commands.push({ type: 'noop' })
      return
    }

    if (trimmed.startsWith('CLEAR_SECTION ')) {
      const sectionKey = trimmed.slice('CLEAR_SECTION '.length).trim() as OFPlanningSectionKey
      if (!SECTION_DEFINITION_MAP[sectionKey]) {
        errors.push({
          code: 'unknown-section',
          line: index + 1,
          message: `未知的 section key：${sectionKey}`
        })
        return
      }
      commands.push({
        type: 'clear-section',
        sectionKey
      })
      return
    }

    if (trimmed.startsWith('REPLACE_SECTION ') || trimmed.startsWith('APPEND_SECTION ')) {
      const commandType = trimmed.startsWith('REPLACE_SECTION ')
        ? 'replace-section'
        : 'append-section'
      const sectionKey = trimmed
        .slice(
          commandType === 'replace-section' ? 'REPLACE_SECTION '.length : 'APPEND_SECTION '.length
        )
        .trim() as OFPlanningSectionKey
      if (!SECTION_DEFINITION_MAP[sectionKey]) {
        errors.push({
          code: 'unknown-section',
          line: index + 1,
          message: `未知的 section key：${sectionKey}`
        })
        return
      }
      currentCommand = commandType
      currentSectionKey = sectionKey
      return
    }

    errors.push({
      code: 'invalid-command',
      line: index + 1,
      message: `无法解析的 DSL 指令：${trimmed}`
    })
  })

  if (!documentId && mode !== 'noop') {
    errors.push({
      code: 'missing-doc',
      message: '非 NOOP 命令必须提供 DOC <document-id>'
    })
  }

  if (mode === 'noop' && commands.some((command) => command.type !== 'noop')) {
    errors.push({
      code: 'unexpected-content',
      message: 'MODE NOOP 时不允许包含编辑命令'
    })
  }

  if (mode !== 'noop' && commands.length === 0) {
    errors.push({
      code: 'invalid-command',
      message: '未解析到任何 planning 编辑命令'
    })
  }

  return {
    documentId,
    mode,
    commands,
    errors
  }
}

export function applyOFPlanningEditCommands(
  document: OFPlanningDocument,
  commands: OFPlanningEditCommand[],
  options: {
    sourceDocument?: OFPlanningDocument | null
  } = {}
): OFPlanningDocument {
  const nextDocument: OFPlanningDocument = {
    sections: { ...document.sections }
  }

  commands.forEach((command) => {
    if (command.type === 'replace-section') {
      nextDocument.sections[command.sectionKey] = command.content.trim()
      return
    }

    if (command.type === 'append-section') {
      const previous = nextDocument.sections[command.sectionKey]?.trim() || ''
      nextDocument.sections[command.sectionKey] = previous
        ? `${previous}\n${command.content.trim()}`
        : command.content.trim()
      return
    }

    if (command.type === 'clear-section') {
      nextDocument.sections[command.sectionKey] = ''
      return
    }

    if (command.type === 'reset-document' && options.sourceDocument) {
      nextDocument.sections = { ...options.sourceDocument.sections }
    }
  })

  return nextDocument
}

export function listAffectedOFPlanningSectionKeys(
  commands: OFPlanningEditCommand[]
): OFPlanningSectionKey[] {
  return Array.from(
    new Set(
      commands.flatMap((command) => {
        if ('sectionKey' in command) {
          return [command.sectionKey]
        }
        return []
      })
    )
  )
}
