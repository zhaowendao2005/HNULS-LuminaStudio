import type { OFNodeDslDefinition } from '../../node-definition'

export const ifNodeDslDefinition: OFNodeDslDefinition = {
  authoringToken: 'if',
  title: '条件分支',
  summary: '按条件选择分支 handle。',
  sectionForm: '[node.<id>]',
  allowedKeys: ['type', 'title', 'description', 'when', 'else_label'],
  requiredKeys: ['type', 'when'],
  legacyTokens: ['ifelse'],
  legacyKeyReplacements: {
    desc: 'description',
    conditions: 'when',
    cases: 'when',
    elseCase: 'else_label'
  },
  examples: [
    { label: 'type', summary: '固定节点类型。', value: 'type = "if"' },
    {
      label: 'when',
      summary: '二元条件与一元聚合条件都写在 when 数组内。',
      value: 'when = ["@review.score >= 8 => pass","@review_flags all_true => all_pass"]'
    },
    { label: 'else_label', summary: '可选自定义 else 标签。', value: 'else_label = "FALLBACK"' }
  ],
  warnings_zh: [
    '只允许使用 `when = [...]` 作者态写法，不要写旧的 `conditions/cases/elseCase` JSON 结构。'
  ]
}
