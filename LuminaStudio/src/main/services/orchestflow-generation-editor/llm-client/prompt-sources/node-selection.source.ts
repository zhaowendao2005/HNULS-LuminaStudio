import {
  getOFNodeDeclarationSectionDefinition,
  listOFNodeDefinitions,
  parseOFPlanningMarkdown,
  type OFBlockEnum,
  type OFPlanningDocument
} from '@shared/Orchestraflow-types'

type PublicNodeSummary = {
  type: OFBlockEnum
  title: string
  summary: string
  capabilitySummary: string
  boundaries: string[]
  compositionHints: string[]
}

function listSelectableNodes(): PublicNodeSummary[] {
  return listOFNodeDefinitions()
    .filter((definition) => definition.meta.ai_exposed && !definition.meta.internal)
    .map((definition) => ({
      type: definition.meta.type,
      title: definition.meta.title,
      summary: definition.meta.summary,
      capabilitySummary: definition.agent?.capability_summary || '未补充',
      boundaries: definition.agent?.boundaries_zh || [],
      compositionHints: definition.agent?.composition_hints || []
    }))
}

export function buildNodeSelectionCatalogPrompt(): string {
  const nodes = listSelectableNodes()
  return [
    '## 节点选择目录',
    '以下目录只用于需求规划分析阶段做能力选型与节点声明，不是字段级 spec。',
    ...nodes.flatMap((node) => {
      return [
        `### ${node.title}`,
        `- type: ${node.type}`,
        `- 摘要: ${node.summary}`,
        `- 能力: ${node.capabilitySummary}`,
        ...node.boundaries.map((item) => `- 边界: ${item}`),
        ...node.compositionHints.map((item) => `- 组合提示: ${item}`)
      ]
    })
  ].join('\n')
}

function extractMarkdownBulletItems(markdown: string, title: string): string[] {
  const regex = new RegExp(`^##\\s+${title}\\s*$([\\s\\S]*?)(?=^##\\s+|^#\\s+|$)`, 'm')
  const match = markdown.match(regex)
  const body = match?.[1]?.trim() || ''
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim())
    .filter(Boolean)
}

function parseDeclaredNodeItems(
  document: OFPlanningDocument | null,
  sourceMarkdown: string
): string[] {
  const declarationTitle = getOFNodeDeclarationSectionDefinition().title
  const currentSection = document?.sections['design-candidate-nodes']?.trim() || ''
  if (currentSection) {
    return currentSection
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('- '))
      .map((line) => line.slice(2).trim())
      .filter(Boolean)
  }

  // 兼容旧快照：历史数据里这一节还叫“候选节点”，迁移前也允许被设计 agent 读到。
  return [
    ...extractMarkdownBulletItems(sourceMarkdown, declarationTitle),
    ...extractMarkdownBulletItems(sourceMarkdown, '候选节点')
  ]
}

export function extractDeclaredNodeTypesFromPlanningMarkdown(
  sourceMarkdown: string
): OFBlockEnum[] {
  const parsed = parseOFPlanningMarkdown(sourceMarkdown)
  const knownTypes = new Set(listSelectableNodes().map((node) => node.type))
  const declaredTypes = parseDeclaredNodeItems(parsed.document, sourceMarkdown)
    .map((item) => item.split('：')[0]?.split(':')[0]?.trim() as OFBlockEnum)
    .filter((type) => knownTypes.has(type))

  return Array.from(new Set(declaredTypes))
}

export function buildDeclaredNodesPrompt(sourceMarkdown: string): string {
  const declaredTypes = extractDeclaredNodeTypesFromPlanningMarkdown(sourceMarkdown)
  if (!declaredTypes.length) {
    return [
      '## 节点声明',
      '- 当前 planning 快照里没有识别到节点声明。',
      '- 兼容模式下允许继续参考全部节点目录，但后续新规划必须显式输出“节点声明”小节。'
    ].join('\n')
  }

  return ['## 节点声明', ...declaredTypes.map((type) => `- ${type}`)].join('\n')
}
