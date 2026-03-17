import type { OFNodeAuthoringTomlDefinition } from '../../node-definition'

export const variableAssignNodeTomlDefinition: OFNodeAuthoringTomlDefinition = {
  sectionTemplate: '[[nodes]]',
  requiredFields: ['id', 'type', 'title', 'rules'],
  optionalFields: ['description'],
  fields: [
    { key: 'id', required: true, summary: '节点唯一 id。', example: 'id = "shape_output"' },
    { key: 'type', required: true, summary: '固定为 set。', example: 'type = "set"' },
    { key: 'title', required: true, summary: '展示标题。', example: 'title = "整理输出"' },
    {
      key: 'rules',
      required: true,
      summary:
        '赋值规则列表。唯一正确写法：source.mode 为 "variable" 时，必须使用 ref.selector（数组）引用变量；source.mode 为 "constant" 时，必须使用 constant_value 提供常量。',
      example:
        'rules = [{ target_variable = "max_rounds", source = { mode = "variable", ref = { selector = ["max_rounds"] } }, target_type = "number" }, { target_variable = "round", source = { mode = "constant", constant_value = 1 }, target_type = "number" }]'
    }
  ],
  exampleBlocks: [
    [
      '[[nodes]]',
      'id = "init_state"',
      'type = "set"',
      'title = "初始化状态"',
      'rules = [',
      '  { target_variable = "target_number", source = { mode = "variable", ref = { selector = ["target_number"] } }, target_type = "number" },',
      '  { target_variable = "guess", source = { mode = "variable", ref = { selector = ["target_number"] } }, target_type = "number" },',
      '  { target_variable = "round", source = { mode = "constant", constant_value = 1 }, target_type = "number" },',
      '  { target_variable = "max_rounds", source = { mode = "variable", ref = { selector = ["max_rounds"] } }, target_type = "number" }',
      ']'
    ].join('\n')
  ],

  // ===== 节点私域建议（Set） =====
  suggestions: [
    {
      code: 'required-field-missing',
      nodeType: 'set',
      message:
        'Set 节点必填字段：rules。唯一正确写法：source.mode="variable" 时必须写 ref.selector（数组），source.mode="constant" 时必须写 constant_value。'
    },
    {
      code: 'set-variable-ref-missing',
      nodeType: 'set',
      message:
        '当 source.mode = "variable" 时，应当写 source = { mode = "variable", ref = { selector = [...] } }，并且 selector 必须是数组。'
    },
    {
      code: 'set-constant-value-missing',
      nodeType: 'set',
      message:
        '当 source.mode = "constant" 时，应当写 source = { mode = "constant", constant_value = ... }。'
    }
  ]
}
