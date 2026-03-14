import type { OFMechanismDefinition } from './types'

export const selectorRefMechanismDefinition: OFMechanismDefinition = {
  id: 'selector-ref',
  theme: 'selector-ref',
  title: 'Selector / Ref 语义',
  summary: '统一 OFT/1 作者态 `@ref` 的路径语义，以及编译后 selector/ref 的生成规则。',
  hard_rules: [
    '作者态引用统一写成单个字符串 `@ref`，不要手写 selector / value_ref / compare_ref。',
    '`@ref` 的第一段可以是输入变量根，也可以是 `nodeId.handleId`。',
    '组合 JSON 中凡是值恰好等于 `"@ref"` 的字符串，运行时按引用解析。'
  ],
  examples: [
    { label: '输入变量', value: '@content_package' },
    { label: '节点输出字段', value: '@node_llm.llmoutput' },
    { label: '结构化输出字段', value: '@node_llm.structured_output.reason' }
  ],
  failure_modes: [
    '把旧的 selector / value_ref JSON 直接塞进 OFT/1，会导致 parser 直接拒绝。',
    '把组合 JSON 里的引用写成裸 `@x` 而不是字符串 `"@x"`，会破坏 JSON 合法性。'
  ],
  agent_render_hints: [
    'Requirement agent 需要先确认输入依赖和输出引用根。',
    'Edit agent 进行重命名时，优先做 selector root 替换，不要手改 path 文本。'
  ],
  helper_refs: [
    'normalizeOFSelector',
    'normalizeOFSelectorRef',
    'replaceOFSelectorRefRoot',
    'replaceOFVariableRefRoot'
  ],
  selector_contract: {
    representation: 'store-key-array',
    first_segment: 'store-key',
    min_items: 1,
    nested_path_supported: true,
    dots_allowed_in_first_segment: true,
    empty_segments_allowed: false,
    examples: [
      ['input'],
      ['content_package', 'config', 'process_mode'],
      ['node_llm.llmoutput'],
      ['node_llm.structured_output', 'reason']
    ]
  },
  global_invariants: [
    {
      id: 'selector-non-empty',
      level: 'error',
      scope: 'selector',
      summary: '所有 selector 必须是至少 1 段的非空字符串数组。'
    }
  ]
}

export const variableMechanismDefinition: OFMechanismDefinition = {
  id: 'variables',
  theme: 'variables',
  title: '变量系统',
  summary: '统一变量默认值、schema、loop/input/output 变量的机器约束和 agent 说明。',
  hard_rules: [
    '所有变量声明都必须显式给出 schema；不要再写裸 type/default 或 item_schema。',
    'array / object 的默认值都写在 schema 上，不再写变量级 default。',
    '节点派生输出变量只能从节点 definition 或机制 helper 生成。'
  ],
  examples: [
    {
      label: '标量默认值',
      value:
        '{ "variable": "mode", "schema": { "type": "string", "default": "batch" }, "source": { "mode": "value", "value": "batch" } }'
    },
    {
      label: '对象 schema',
      value:
        '{ "variable": "config", "schema": { "type": "object", "properties": { "mode": { "type": "string" } }, "required": ["mode"], "additionalProperties": false } }'
    }
  ],
  failure_modes: [
    '在变量上手写 type/default/item_schema 会让 schema 真相层失效。',
    '在 renderer / runtime 手工派生第二份输出变量会让 SSOT 失效。'
  ],
  agent_render_hints: [
    'Requirement agent 需要优先罗列输入变量、结构化 schema、预填默认值。',
    'Blueprint agent 只引用共享 helper 产出的变量模板，不再平行手写。'
  ],
  helper_refs: [
    'ensureOFSelectableVariables',
    'cloneOFVariables',
    'startInputVariableDefinition',
    'llmOutputVariableDefinition',
    'iterationOutputVariableDefinition',
    'loopOutputVariableDefinition',
    'variableAssignOutputVariableDefinition'
  ],
  global_invariants: [
    {
      id: 'structured-vars-require-schema',
      level: 'error',
      scope: 'variable',
      summary: '所有变量声明都必须显式声明 `schema`。'
    },
    {
      id: 'structured-vars-no-variable-default',
      level: 'error',
      scope: 'variable',
      summary: '变量不要写变量级 `default`；默认值应落在 `schema` 内。'
    }
  ]
}

export const edgeHandleMechanismDefinition: OFMechanismDefinition = {
  id: 'edge-handle',
  theme: 'edge-handle',
  title: 'Edge Handle 规则',
  summary: '统一根图与子图的 source/target handle 规则。',
  hard_rules: [
    'OFT/1 的每条边都必须写成 `node.handle -> node.handle`。',
    '不允许省略默认 handle，也不允许写旧的 edge 对象 JSON。',
    'ifelse 的 source handle 必须命中 `when` 产生的 handle 或固定 `else`。'
  ],
  examples: [
    {
      label: '普通连线',
      value:
        '{ "from": { "node": "start", "handle": "source" }, "to": { "node": "llm", "handle": "target" } }'
    },
    {
      label: 'ifelse 分支',
      value:
        '{ "from": { "node": "branch", "handle": "case_handle" }, "to": { "node": "end", "handle": "target" } }'
    }
  ],
  failure_modes: ['缺失 handle 会让编辑器、compiler、validator 对连线语义理解不一致。'],
  agent_render_hints: [
    'Blueprint agent 生成 edge 时必须总是带 handle。',
    'Edit agent 修改分支连线时先确认 handle，再改 source/target。'
  ],
  helper_refs: ['getOFEdgeSourcePortId', 'getOFEdgeTargetPortId'],
  edge_contract: {
    explicit_handles_required: true,
    default_target_handle: 'target',
    default_source_handle: 'source',
    ifelse_source_handle_rule: 'case.handleId-or-elseCase.handleId'
  },
  global_invariants: [
    {
      id: 'edge-explicit-handle',
      level: 'error',
      scope: 'edge',
      summary: '根图和子图边都必须显式写 sourceHandle / targetHandle。'
    }
  ]
}

export const containerMechanismDefinition: OFMechanismDefinition = {
  id: 'container',
  theme: 'container',
  title: 'Container 子图规则',
  summary: '统一 iteration / loop 的内部 start 注入、start_node_id、viewport 与子图约束。',
  hard_rules: [
    '作者只描述业务子图节点，不允许手写内部 start 节点。',
    '[subgraph.<container>] 只允许 `entry` 与 `edges` 两个键。',
    '子图内禁止继续嵌套 iteration 或 loop。'
  ],
  examples: [
    { label: '迭代 start 注入', value: 'iteration-start 节点会由 compiler / editor 自动维护' },
    { label: '子图 viewport', value: '{ "x": 0, "y": 0, "zoom": 1 }' }
  ],
  failure_modes: [
    '手写 start_node_id、viewport 或内部 start，会让 editor 快照与执行态脱节。',
    '子图嵌套 container 会让命名空间与运行注入规则失控。'
  ],
  agent_render_hints: [
    'Blueprint agent 只描述业务子图节点，不直接伪造内部 start 节点。',
    'Edit agent 进入子图时应保留容器 scope，退出时恢复父 scope。'
  ],
  helper_refs: ['resolveOFNodeOutputNamespace', 'normalizeOFRunnableNodeSelectorData'],
  global_invariants: [
    {
      id: 'root-graph-no-internal-start',
      level: 'error',
      scope: 'workflow',
      summary: '根图禁止出现 iteration-start 或 loop-start。'
    },
    {
      id: 'container-no-nested-container',
      level: 'error',
      scope: 'subgraph',
      summary: '容器子图内禁止再嵌套容器节点。'
    }
  ]
}

export const blueprintSyntaxMechanismDefinition: OFMechanismDefinition = {
  id: 'blueprint-syntax',
  theme: 'blueprint-syntax',
  title: 'Blueprint DSL 全局语法',
  summary: '统一 OFT/1 作者态的头部、section、workflow metadata 与全局句法。',
  hard_rules: [
    '作者态固定为 `OFT/1` section-based DSL；Runnable 只是编译结果。',
    '数组必须写成单行合法 JSON；多行文本只允许三引号字符串。',
    '旧 DSL header、旧 key、旧 type alias 一律不再兼容。'
  ],
  examples: [
    { label: '头部', value: 'OFT/1' },
    { label: 'workflow', value: '[workflow]\nname = "demo_flow"' }
  ],
  failure_modes: ['把 runnable/workflow JSON 字段写回 OFT/1，会让编辑态和执行态混淆。'],
  agent_render_hints: [
    'Requirement agent 输出 handoff 时，目标对象始终是 Blueprint。',
    'Edit agent 不直接操作 Runnable。'
  ],
  helper_refs: ['validateOFBlueprint', 'compileOFBlueprintToRunnable'],
  global_fields: [
    { path: 'workflow.name', source: 'author', required: true, summary: '[workflow] 必填键。' },
    {
      path: 'workflow.description',
      source: 'author',
      required: false,
      summary: '[workflow] 可选键。'
    },
    { path: 'workflow.author', source: 'author', required: false, summary: '[workflow] 可选键。' },
    { path: 'graph.edges', source: 'author', required: true, summary: '[graph] 必填键。' },
    {
      path: 'subgraph.entry',
      source: 'author',
      required: true,
      summary: '[subgraph.<container>] 必填键。'
    },
    {
      path: 'subgraph.edges',
      source: 'author',
      required: true,
      summary: '[subgraph.<container>] 必填键。'
    }
  ]
}

export const OF_MECHANISM_DEFINITIONS: OFMechanismDefinition[] = [
  selectorRefMechanismDefinition,
  variableMechanismDefinition,
  edgeHandleMechanismDefinition,
  containerMechanismDefinition,
  blueprintSyntaxMechanismDefinition
]
