import type { GenerationDesignGenerationMode } from '@preload/types'
import type { DesignBlueprintContextBundle } from './types'

export function buildDesignBlueprintAgentPrompt(): string {
  return [
    '你是 LuminaStudio 的规划设计 DSL 蓝图生成 Agent。',
    '',
    '你的唯一目标：把“需求分析规划稿快照 + 当前用户补充要求”转写成可被 shared parser/compiler 解析的文本 DSL 蓝图。',
    '',
    '硬性规则：',
    '- 只能输出 DSL 正文和全行注释，不要输出解释性自然语言。',
    '- 首个非注释行必须严格等于：OFT/1。',
    '- 在头部之后，必须优先写 [workflow] section，并先补 `name = \"...\"`，否则 blueprint-validation 会失败。',
    '- 只能使用“节点声明”里出现的节点类型，以及系统保底节点 start / end。',
    '- 节点字段、变量、selector、handle/link 规则必须只以 canonical authoring contract 为准。',
    '- “当前版本状态摘要”只用于了解状态与错误，不是可复制正文。',
    '- 不要回显历史 prompt、历史 assistant DSL、历史错误示例。',
    '- 不要输出 markdown 代码块。',
    '- 不要输出多行数组或多行对象。',
    '- 普通控制边只使用 source / target。',
    '- 你修改的是当前版本正文；如果用户要求重生成，就直接覆盖当前版本，不要输出“新建版本”提示。',
    '- 如果无法百分百完成，也必须输出尽可能完整的 DSL 草稿；不要回退成说明文。',
    '',
    '输出优先级：',
    '1. 先满足 canonical authoring contract',
    '2. 再满足当前需求分析规划稿摘要',
    '3. 最后参考当前版本状态摘要修正错误',
    '4. 在以上都成立时，再考虑注释可读性'
  ].join('\n')
}

export function buildDesignBlueprintAgentUserPrompt(params: {
  designDocumentId: string
  generationMode: GenerationDesignGenerationMode
  context: DesignBlueprintContextBundle
  userMessage: string
}): string {
  return [
    `design_document_id=${params.designDocumentId}`,
    `generation_mode=${params.generationMode}`,
    '',
    '## Canonical Authoring Contract',
    params.context.canonicalPromptSourceText,
    '',
    '## 当前需求分析规划稿摘要',
    params.context.planningSnapshotSummaryText,
    '',
    '## 当前版本状态摘要',
    params.context.designDocumentStateSummaryText,
    '',
    '## 当前用户输入',
    params.userMessage
  ].join('\n')
}

export function buildDesignBlueprintPromptMessages(params: {
  designDocumentId: string
  generationMode: GenerationDesignGenerationMode
  context: DesignBlueprintContextBundle
  userMessage: string
}) {
  return [
    {
      role: 'system' as const,
      content: buildDesignBlueprintAgentPrompt()
    },
    {
      role: 'user' as const,
      content: buildDesignBlueprintAgentUserPrompt(params)
    }
  ]
}
