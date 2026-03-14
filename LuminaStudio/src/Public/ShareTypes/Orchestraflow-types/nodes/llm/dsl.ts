import type { OFNodeDslDefinition } from '../../node-definition'

export const llmNodeDslDefinition: OFNodeDslDefinition = {
  authoringToken: 'llm',
  title: 'llm',
  summary: '调用模型，支持 prompt_template 和 structured_output。',
  sectionForm: '[node.<id>]',
  allowedKeys: ['type', 'title', 'description', 'model', 'prompt', 'struct'],
  requiredKeys: ['type', 'model', 'prompt'],
  legacyKeyReplacements: {
    desc: 'description',
    output_schema: 'struct'
  },
  examples: [
    { label: 'type', summary: '固定节点类型。', value: 'type = "llm"' },
    {
      label: 'model',
      summary: '模型标识使用 provider/model。',
      value: 'model = "openai/gpt-4.1-mini"'
    },
    {
      label: 'prompt',
      summary: '多行提示词使用三引号。',
      value: 'prompt = """\n请总结输入。\n"""'
    },
    { label: 'struct', summary: '结构化输出可选。', value: 'struct = "score:number reason:string"' }
  ]
}
