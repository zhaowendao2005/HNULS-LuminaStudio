import type { OFNodeAuthoringTomlDefinition } from '../../node-definition'

export const llmNodeTomlDefinition: OFNodeAuthoringTomlDefinition = {
  sectionTemplate: '[[nodes]]',
  requiredFields: ['id', 'type', 'title', 'model', 'prompt'],
  optionalFields: ['description', 'struct'],
  fields: [
    { key: 'id', required: true, summary: '节点唯一 id。', example: 'id = "summarize"' },
    { key: 'type', required: true, summary: '固定为 llm。', example: 'type = "llm"' },
    { key: 'title', required: true, summary: '展示标题。', example: 'title = "总结模型"' },
    {
      key: 'model',
      required: true,
      summary: '模型标识，格式为 provider/model。',
      example: 'model = "openai/gpt-4.1-mini"'
    },
    {
      key: 'prompt',
      required: true,
      summary: '提示词内容。',
      example: 'prompt = """\n请总结输入内容。\n"""',
      multiline: true
    },
    {
      key: 'struct',
      required: false,
      summary: '可选的结构化输出字段定义。',
      example: 'struct = "summary:string score:number"'
    }
  ],
  exampleBlocks: [
    [
      '[[nodes]]',
      'id = "summarize"',
      'type = "llm"',
      'title = "总结模型"',
      'model = "openai/gpt-4.1-mini"',
      'prompt = """',
      '请总结 {{user_query}}，并给出 1 到 10 的评分。',
      '"""',
      'struct = "summary:string score:number"'
    ].join('\n')
  ],

  // ===== 节点私域建议（LLM） =====
  suggestions: [
    {
      code: 'required-field-missing',
      nodeType: 'llm',
      message:
        'LLM 节点常见必填字段：model 与 prompt。请确认 model="provider/model"，prompt 使用 """ 多行字符串更清晰。'
    }
  ]
}
