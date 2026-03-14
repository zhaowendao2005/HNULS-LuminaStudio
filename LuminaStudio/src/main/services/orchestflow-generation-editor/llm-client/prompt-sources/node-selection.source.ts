import {
  getOFNodeDeclarationSectionDefinition,
  listOFAuthoringNodeDefinitions,
  parseOFPlanningMarkdown,
  type OFNodeAuthoringToken,
  type OFPlanningDocument
} from '@shared/Orchestraflow-types'

type PublicNodeSummary = {
  authoringToken: OFNodeAuthoringToken
  title: string
  summary: string
  capabilitySummary: string
  boundaries: string[]
  compositionHints: string[]
}

function listSelectableNodes(): PublicNodeSummary[] {
  return listOFAuthoringNodeDefinitions()
    .filter((definition) => definition.llmSpec.exposed)
    .map((definition) => ({
      authoringToken: definition.llmSpec.authoringToken,
      title: definition.llmSpec.title,
      summary: definition.llmSpec.summary,
      capabilitySummary: definition.llmSpec.capability_summary,
      boundaries: definition.llmSpec.boundaries_zh || [],
      compositionHints: definition.llmSpec.composition_hints || []
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
        `- type: ${node.authoringToken}`,
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
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, '').trim())
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
      .filter((line) => /^[-*]\s+/.test(line))
      .map((line) => line.replace(/^[-*]\s+/, '').trim())
      .filter(Boolean)
  }

  return extractMarkdownBulletItems(sourceMarkdown, declarationTitle)
}

export function extractDeclaredNodeTypesFromPlanningMarkdown(
  sourceMarkdown: string
): OFNodeAuthoringToken[] {
  const parsed = parseOFPlanningMarkdown(sourceMarkdown)
  const knownTypes = new Set(listSelectableNodes().map((node) => node.authoringToken))
  const declaredTypes = parseDeclaredNodeItems(parsed.document, sourceMarkdown)
    .map((item) => item.split('：')[0]?.split(':')[0]?.trim() as OFNodeAuthoringToken)
    .filter((type) => knownTypes.has(type))

  return Array.from(new Set(declaredTypes))
}

export function buildDeclaredNodesPrompt(sourceMarkdown: string): string {
  const declaredTypes = extractDeclaredNodeTypesFromPlanningMarkdown(sourceMarkdown)
  if (!declaredTypes.length) {
    return ['## 节点声明', '- 当前 planning 快照里没有识别到合法的节点声明。'].join('\n')
  }

  return ['## 节点声明', ...declaredTypes.map((type) => `- ${type}`)].join('\n')
}
