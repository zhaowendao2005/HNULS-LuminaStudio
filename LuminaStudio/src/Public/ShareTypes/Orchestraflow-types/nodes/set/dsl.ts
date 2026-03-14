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
      summary: '每个目标变量都显式声明 schema 与 source。',
      value:
        'let = [{"variable":"summary","schema":{"type":"string"},"source":{"mode":"ref","ref":"@draft.text"}},{"variable":"payload","schema":{"type":"object","properties":{"raw":{"type":"string"},"score":{"type":"number"},"ok":{"type":"boolean"}},"required":["raw","score","ok"],"additionalProperties":false},"source":{"mode":"value","value":{"raw":"@draft.text","score":"@review.score","ok":true}}}]'
    }
  ]
}
