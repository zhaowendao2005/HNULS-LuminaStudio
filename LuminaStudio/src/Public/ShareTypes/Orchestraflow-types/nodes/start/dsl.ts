import type { OFNodeDslDefinition } from '../../node-definition'

// 作者态只认 start token，不再把内部路径或 runtime 字段泄漏给 DSL。
export const startNodeDslDefinition: OFNodeDslDefinition = {
  authoringToken: 'start',
  title: '开始',
  summary: '定义工作流输入变量。',
  sectionForm: '[node.<id>]',
  allowedKeys: ['type', 'title', 'description', 'inputs'],
  requiredKeys: ['type', 'inputs'],
  legacyKeyReplacements: {
    desc: 'description'
  },
  examples: [
    { label: 'type', summary: '固定节点类型。', value: 'type = "start"' },
    {
      label: 'inputs',
      summary: '按输入声明名引用开始变量。',
      value: 'inputs = ["user_query","config"]'
    }
  ]
}
