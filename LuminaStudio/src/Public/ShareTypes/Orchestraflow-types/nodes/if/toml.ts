import type { OFNodeAuthoringTomlDefinition } from '../../node-definition'

export const ifNodeTomlDefinition: OFNodeAuthoringTomlDefinition = {
  sectionTemplate: '[[nodes]]',
  requiredFields: ['id', 'type', 'title', 'cases'],
  optionalFields: ['description', 'elseLabel'],
  fields: [
    { key: 'id', required: true, summary: '节点唯一 id。', example: 'id = "gate"' },
    { key: 'type', required: true, summary: '固定为 if。', example: 'type = "if"' },
    { key: 'title', required: true, summary: '展示标题。', example: 'title = "条件分流"' },
    {
      key: 'cases',
      required: true,
      summary:
        '分支数组。每个 case 都必须提供唯一的 handleId（用于连线 sourceHandle），并提供 conditions。',
      example:
        'cases = [{ label = "高分", handleId = "if", conditions = [{ variable_selector = ["summarize", "score"], operator = "gte", value = 8 }] }, { label = "中等", handleId = "elif-1", conditions = [{ variable_selector = ["summarize", "score"], operator = "gte", value = 6 }] }]'
    },
    {
      key: 'elseLabel',
      required: false,
      summary: '可选的 else 标签。',
      example: 'elseLabel = "其他情况"'
    }
  ],
  exampleBlocks: [
    [
      '[[nodes]]',
      'id = "gate"',
      'type = "if"',
      'title = "条件分流"',
      'cases = [',
      '  { label = "高分", handleId = "if", conditions = [{ variable_selector = ["summarize", "score"], operator = "gte", value = 8 }] },',
      '  { label = "中等", handleId = "elif-1", conditions = [{ variable_selector = ["summarize", "score"], operator = "gte", value = 6 }] }',
      ']',
      'elseLabel = "其他情况"',
      '',
      '[[edges]]',
      'source = "gate"',
      'sourceHandle = "if"',
      'target = "high_feedback"',
      'targetHandle = "target"',
      '',
      '[[edges]]',
      'source = "gate"',
      'sourceHandle = "elif-1"',
      'target = "mid_feedback"',
      'targetHandle = "target"',
      '',
      '[[edges]]',
      'source = "gate"',
      'sourceHandle = "else"',
      'target = "else_feedback"',
      'targetHandle = "target"'
    ].join('\n')
  ],

  // ===== 节点私域建议（If） =====
  suggestions: [
    {
      code: 'required-field-missing',
      nodeType: 'if',
      message:
        'If 节点必填字段：cases。推荐每个 case 都显式写 handleId（如 if / elif-1 / elif-2 ...），并在 edges 里用 sourceHandle 指向对应 handleId；else 分支固定用 sourceHandle = "else"。'
    },
    {
      code: 'ifelse-source-handle-not-a-branch',
      nodeType: 'if',
      message:
        'If 节点是“多出口 handle”节点：从该节点出去的每条边都必须写 sourceHandle，并且只能取 cases[].handleId 或 "else"。'
    }
  ]
}
