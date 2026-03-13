import {
  OF_PLANNING_SECTION_DEFINITIONS,
  getOFNodeDeclarationSectionDefinition
} from '@shared/Orchestraflow-types'

export function buildPlanningOutputContractPrompt(): string {
  const nodeDeclaration = getOFNodeDeclarationSectionDefinition()
  return [
    '## Planning 输出契约',
    '- 顶层标题只能是：# 需求分析、# 设计交接。',
    '- 所有二级标题必须严格来自共享定义，不允许改名或新增别名。',
    '- 设计交接中的节点声明小节是后续 design agent 的 authoritative source。',
    '- 节点声明必须只写真实存在的共享节点类型，不允许虚构节点。',
    '',
    '## 固定小节',
    ...OF_PLANNING_SECTION_DEFINITIONS.map((definition) => {
      const roleHint =
        definition.semanticRole === 'node-declaration'
          ? '（必须给下游 design agent 读取的节点声明）'
          : ''
      return `- ${definition.rootTitle} / ${definition.title} ${roleHint}`.trim()
    }),
    '',
    `## 节点声明写法`,
    `- 小节标题必须是：## ${nodeDeclaration.title}`,
    '- 每条使用 markdown 列表项，例如：',
    '- start：接收输入',
    '- llm：生成回复正文',
    '- end：输出最终结果'
  ].join('\n')
}

export function buildPlanningEditCapabilityPrompt(params: {
  currentDocumentMarkdown: string
  sourceDocumentMarkdown: string
}): string {
  const nodeDeclaration = getOFNodeDeclarationSectionDefinition()
  return [
    '## Planning Framework',
    '- 只能修改 planning 文档正文，不能改根标题、二级标题、层级、顺序。',
    '- 节点声明小节仍是 authoritative source，不允许改成别名标题。',
    '- 合法小节如下：',
    ...OF_PLANNING_SECTION_DEFINITIONS.map((definition) => {
      return `- ${definition.key} => ${definition.rootTitle} / ${definition.title}`
    }),
    '',
    '## 节点声明要求',
    `- ${nodeDeclaration.key} 的标题必须保持为“${nodeDeclaration.title}”。`,
    '- 节点声明项必须只写共享节点类型，不允许写 JSON、DSL、伪 schema。',
    '',
    '## Current Planning Document',
    params.currentDocumentMarkdown || '(empty)',
    '',
    '## Source Planning Document',
    params.sourceDocumentMarkdown || '(empty)'
  ].join('\n')
}
