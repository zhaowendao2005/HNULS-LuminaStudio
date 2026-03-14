import type { OFNodeDslDefinition } from '../../node-definition'

export const endNodeDslDefinition: OFNodeDslDefinition = {
  authoringToken: 'end',
  title: '结束',
  summary: '映射最终输出变量。',
  sectionForm: '[node.<id>]',
  allowedKeys: ['type', 'title', 'description', 'outputs'],
  requiredKeys: ['type', 'outputs'],
  legacyKeyReplacements: {
    desc: 'description'
  },
  examples: [
    { label: 'type', summary: '固定节点类型。', value: 'type = "end"' },
    {
      label: 'outputs-ref',
      summary: '纯引用输出。',
      value: 'outputs = ["summary:string <- @summary.text"]'
    },
    {
      label: 'outputs-composite',
      summary: '组合 object/array 输出，引用使用 `"@path"` 占位。',
      value:
        'outputs = ["result:object <- {\\"content\\":\\"@final_text.output\\",\\"report\\":\\"@audit.output\\",\\"ok\\":true}"]'
    }
  ]
}
