import type { OFNodeDslDefinition } from '../../node-definition'

export const variableAssignNodeDslDefinition: OFNodeDslDefinition = {
  authoringToken: 'set',
  title: '变量赋值',
  summary: '把变量或常量写入命名空间输出。',
  sectionForm: '[node.<id>]',
  allowedKeys: ['type', 'title', 'description', 'let'],
  requiredKeys: ['type', 'let'],
  legacyTokens: ['variable-assign'],
  legacyKeyReplacements: {
    desc: 'description',
    assignments: 'let'
  },
  examples: [
    { label: 'type', summary: '固定节点类型。', value: 'type = "set"' },
    {
      label: 'let',
      summary: '支持常量、单个引用与组合 JSON。',
      value:
        'let = ["summary:string=@draft.text","payload:object={\\"raw\\":\\"@draft.text\\",\\"score\\":\\"@review.score\\",\\"ok\\":true}"]'
    }
  ]
}
