import type { OFMechanismDefinition } from './types'

export const selectorRefMechanismDefinition: OFMechanismDefinition = {
  id: 'selector-ref',
  theme: 'selector-ref',
  title: 'Selector / Ref 语义',
  summary: '统一 selector、value_ref、compare_ref 的路径语义和改名传播规则。',
  hard_rules: [
    'selector 一旦出现，必须是至少 1 段的非空字符串数组。',
    'selector[0] 是变量存储根 key，本身允许带点；嵌套路径继续落在后续 segment。',
    '所有 value_ref / compare_ref / iterator_ref / output_ref 必须与 selector 保持同源。'
  ],
  examples: [
    { label: '开始节点 object 字段', value: '["content_package", "config", "process_mode"]' },
    { label: '节点输出字段', value: '["node_llm.llmoutput"]' },
    { label: '结构化输出字段', value: '["node_llm.structured_output", "reason"]' }
  ],
  failure_modes: [
    '空 selector 数组会让 compiler / validator 无法判断真实依赖。',
    '把完整点路径塞进 selector[0] 会破坏开始节点 object 字段寻址。'
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
    'object 变量必须声明 schema，默认值放在 schema 内部字段。',
    'array 变量直接写 JSON 数组 default，不再维护 array schema 产品语义。',
    '节点派生输出变量只能从节点 definition 或机制 helper 生成。'
  ],
  examples: [
    { label: '标量默认值', value: '{ "variable": "mode", "type": "string", "default": "batch" }' },
    {
      label: '对象 schema',
      value: '{ "variable": "config", "type": "object", "schema": { "type": "object" } }'
    }
  ],
  failure_modes: [
    '在 object 变量上手写 variable.default 会让运行前输入与 validator 语义冲突。',
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
      summary: '`object` 类型变量必须显式声明 `schema`。'
    },
    {
      id: 'structured-vars-no-variable-default',
      level: 'error',
      scope: 'variable',
      summary: '`object` 类型变量不要写变量级 `default`；默认值应落在 `schema` 内。'
    }
  ]
}

export const edgeHandleMechanismDefinition: OFMechanismDefinition = {
  id: 'edge-handle',
  theme: 'edge-handle',
  title: 'Edge Handle 规则',
  summary: '统一根图与子图的 source/target handle 规则。',
  hard_rules: [
    '所有边都必须显式声明 sourceHandle / targetHandle。',
    '非 ifelse 节点默认从 source -> target。',
    'ifelse 的 sourceHandle 必须命中 case.handleId 或 elseCase.handleId。'
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
    '容器子图必须且只能包含一个内部 start 节点，并由 start_node_id 指向。',
    '子图内禁止继续嵌套 iteration 或 loop。',
    'subgraph.viewport 与内部 start 节点都属于 system-managed 字段。'
  ],
  examples: [
    { label: '迭代 start 注入', value: 'iteration-start 节点会由 compiler / editor 自动维护' },
    { label: '子图 viewport', value: '{ "x": 0, "y": 0, "zoom": 1 }' }
  ],
  failure_modes: [
    '手写 start_node_id 或 viewport 容易让 editor 快照与执行态脱节。',
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
  summary: '统一 Blueprint 作者态的版本、workflow metadata、节点/连线/子图外壳。',
  hard_rules: [
    'Blueprint 是正式作者态；Runnable 只是编译结果。',
    'Blueprint version 固定为 2.0。',
    '节点 config 只保存作者输入，不保存 compiler 注入的 system-managed 字段。'
  ],
  examples: [
    { label: 'Blueprint 版本', value: '{ "version": "2.0" }' },
    { label: '子图', value: '{ "subgraph": { "nodes": [], "edges": [] } }' }
  ],
  failure_modes: ['把 Runnable 的派生字段写回 Blueprint，会让编辑态和执行态混淆。'],
  agent_render_hints: [
    'Requirement agent 输出 handoff 时，目标对象始终是 Blueprint。',
    'Edit agent 不直接操作 Runnable。'
  ],
  helper_refs: ['validateOFBlueprint', 'compileOFBlueprintToRunnable'],
  global_fields: [
    { path: 'id', source: 'author', required: true },
    { path: 'name', source: 'author', required: true },
    { path: 'author', source: 'author', required: true },
    { path: 'createdAt', source: 'author', required: true },
    { path: 'updatedAt', source: 'author', required: true },
    { path: 'status', source: 'author', required: true },
    { path: 'graph.nodes', source: 'author', required: true },
    { path: 'graph.edges', source: 'author', required: true }
  ]
}

export const OF_MECHANISM_DEFINITIONS: OFMechanismDefinition[] = [
  selectorRefMechanismDefinition,
  variableMechanismDefinition,
  edgeHandleMechanismDefinition,
  containerMechanismDefinition,
  blueprintSyntaxMechanismDefinition
]
