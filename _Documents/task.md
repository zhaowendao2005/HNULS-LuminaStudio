# OrchestraFlow ReAct 生成系统总计划

## Summary
本专项的目标是把现有 OrchestraFlow 从“共享定义驱动的工作流编辑器 + AI Schema 复制链路”升级为“可持久化、可回滚、可预览、可确认编译的 ReAct 工作流生成系统”，同时保留现有空白创建与手工 AI Schema 链路。  
核心策略是分三层做：先固化共享基座与 NodeSpec，再实现生成态 Session / OpLog / Phase Engine，最后接入 Grid 入口与独立生成页，并补齐交接文档、参考索引、UI/产品设计文档。

## 子域划分与设计
| 子域 | 所属层 | 设计结论 | 产出 |
|---|---|---|---|
| NodeSpec 基座 | Shared | 以现有 `OFNodeDefinition` 为唯一事实源扩展，不另起并行 descriptor | 稳定的节点元数据、ports、side effects、container spec、system-managed fields |
| 变量引用基座 | Shared | 正式统一为 `OFVariableRef` / `OFValueSource`，`path` 只是展示字段 | selector/ref/value source 统一规范与兼容迁移 |
| 稳定命名空间 | Shared | 新增稳定 `output_namespace`，不再依赖 `title` 作为引用根 | 标题可改、引用不漂移 |
| Port / Link Spec | Shared + Runtime | 把 `data output` 和 `control output` 分开建模，边永远连到稳定 port id | `source/target` 与 ifelse branch handle 的正式契约 |
| Generation Graph State | Shared + Utility | 生成态图独立于正式 runnable workflow，不直接拿 editor graph 当 session 真相 | 生成专用节点快照、边、checkpoint、preview |
| OpLog / Checkpoint / Rollback | Shared + Main | session 落盘持久化，utility 负责纯计算，main 负责保存与恢复 | 可回滚、可续跑、可审计的 session |
| DSL / Semantic Edit | Utility | Phase 之间统一走紧凑 DSL，内部转为 op log，不做文本 diff | `WIRE_BATCH`、`CONFIG_BATCH`、`EDIT_BATCH` 解析与应用 |
| Context / Reachability | Utility | 严禁把全量 JSON 直接喂给模型，只注入 summary + 当前 phase 所需上下文 | Graph summary、变量可达图、互斥分支隔离 |
| Phase Orchestration | Utility | 严格 `PLAN -> WIRE -> CONFIG -> VALIDATE`，每阶段可配置模型 | phase engine、model routing、validation repair 回路 |
| Session Persistence | Main | session 单独存目录，workflow 继续存现有目录 | `session create/get/list/delete/confirm` 服务 |
| Confirm Compile | Main + Utility | 用户确认前不写正式 workflow，确认后才编译校验落盘 | 可打开现有编辑器的正式 workflow 文件 |
| Grid / Generator UX | Renderer | Grid 加智能生成入口，生成页独立承载，不用暗色主题 | 新的生成工作台、session 恢复、确认跳转编辑器 |
| 文档与交接 | Docs | 专项文档必须与代码同步交付，供换对话继续推进 | 总计划、参考索引、UI/产品设计、基座设计说明 |

## 文件修改 Tree
```text
D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\_Documents\
└── OrchestraFlow-Agent\
    ├── 00-master-plan.md                         [新增]
    ├── 01-reference-index.md                     [新增]
    ├── 02-ui-product-design.md                   [新增]
    ├── 03-node-spec-foundation.md                [新增]
    └── 04-generation-session-contract.md         [新增]

D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\src\Public\ShareTypes\Orchestraflow-types\
├── index.ts                                      [修改]
├── core-types.ts                                 [修改]
├── contract.ts                                   [修改]
├── node-definition.ts                            [修改]
├── node-definition-registry.ts                   [修改]
├── selector-utils.ts                             [修改]
├── variable-definition.ts                        [修改]
├── ai-schema.ts                                  [修改]
├── generation-session.ts                         [新增]
├── generation-oplog.ts                           [新增]
├── generation-graph.ts                           [新增]
├── generation-phase.ts                           [新增]
├── generation-preview.ts                         [新增]
├── generation-validation.ts                      [新增]
└── builtins\
    ├── start.definition.ts                       [修改]
    ├── llm.definition.ts                         [修改]
    ├── ifelse.definition.ts                      [修改]
    ├── iteration.definition.ts                   [修改]
    ├── loop.definition.ts                        [修改]
    ├── variable-assign.definition.ts             [修改]
    └── end.definition.ts                         [修改]

D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\src\utility\orchestraflow\
├── messages.types.ts                             [修改]
├── entry.ts                                      [修改]
├── README.md                                     [修改]
├── ai-schema\
│   ├── builder.ts                                [修改]
│   ├── compiler.ts                               [修改]
│   └── validator.ts                              [修改]
├── generation\
│   ├── phase-orchestrator.ts                     [新增]
│   ├── graph-state-reducer.ts                    [新增]
│   ├── graph-summary.ts                          [新增]
│   ├── variable-reachability.ts                  [新增]
│   ├── dsl-parser.ts                             [新增]
│   ├── semantic-edit-engine.ts                   [新增]
│   ├── compile-session-to-workflow.ts            [新增]
│   ├── model-router.ts                           [新增]
│   └── generation-engine.test.ts                 [新增]
└── manager\
    └── workflow-instance-manager.ts              [修改]

D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\src\main\
├── ipc\
│   └── orchestraflow-handler.ts                  [修改]
└── services\
    ├── orchestraflow\
    │   ├── orchestraflow-ai-schema-service.ts    [修改]
    │   ├── orchestraflow-workflow-service.ts     [修改]
    │   └── orchestraflow-workflow-json.ts        [修改]
    ├── orchestraflow-bridge\
    │   └── orchestraflow-bridge-service.ts       [修改]
    └── orchestraflow-generation\
        ├── README.md                             [新增]
        ├── orchestraflow-generation-service.ts   [新增]
        ├── generation-session-repository.ts      [新增]
        ├── generation-session-service.ts         [新增]
        ├── generation-compile-service.ts         [新增]
        └── generation-service.test.ts            [新增]

D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\src\preload\
├── api\
│   └── orchestraflow-api.ts                      [修改]
└── types\
    └── orchestraflow.types.ts                    [修改]

D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\src\renderer\src\
├── stores\
│   └── orchestraflow\
│       ├── workflow-list\
│       │   ├── workflow-list.store.ts            [修改]
│       │   └── workflow-list.datasource.ts       [修改]
│       └── workflow-generation\
│           ├── workflow-generation.store.ts      [新增]
│           ├── workflow-generation.datasource.ts [新增]
│           └── workflow-generation.store.test.ts [新增]
└── views\
    └── LuminaApp\
        └── Maincontent\
            └── OrchestraFlowView\
                ├── index.vue                     [修改]
                ├── GridView\
                │   ├── index.vue                 [修改]
                │   ├── CreateWorkflowCard.vue    [修改]
                │   ├── GenerateWorkflowCard.vue  [新增]
                │   └── GenerationSessionCard.vue [新增]
                └── GeneratorView\
                    ├── index.vue                 [新增]
                    ├── PhaseHeader.vue           [新增]
                    ├── PromptTimelinePanel.vue   [新增]
                    ├── TopologyPreviewPanel.vue  [新增]
                    ├── InspectorPanel.vue        [新增]
                    ├── PlanPreviewPanel.vue      [新增]
                    ├── ValidationReportPanel.vue [新增]
                    └── ModelConfigPanel.vue      [新增]
```

## 分阶段 TODO
| 阶段 | 核心任务 | 完成定义 |
|---|---|---|
| P0 文档与索引 | 建 `_Documents/OrchestraFlow-Agent` 交接包，写总计划、索引、UI/产品设计、NodeSpec 基座文档 | 新对话可仅靠文档和索引恢复上下文 |
| P1 Shared 基座 | 扩 `NodeSpec`、ports、stable namespace、side effects、generation shared types | shared 层能表达生成系统全部契约 |
| P2 引用与链接基座 | 收口 selector/ref/value source；把 handle/control ports 正式建模；补 legacy normalize 规则 | 标题变更、branch handle、selector path 都有稳定规则 |
| P3 Utility 生成引擎 | 实现 reducer、DSL parser、semantic edit、summary、reachability、phase orchestrator、model router | session 可从 prompt 推进到 preview/validation |
| P4 Main 服务与持久化 | 实现 session repository、session service、confirm compile service、bridge 扩展 | session 可创建、保存、恢复、删除、确认编译 |
| P5 IPC / Preload | 扩展 orchestraflow IPC 与 preload API | renderer 能完整驱动生成流程 |
| P6 Renderer Grid + Generator | 新增 Grid 智能生成入口、session 卡片、独立生成页、确认跳转 editor | 用户可从 Grid 发起/恢复生成并进入 editor |
| P7 Compile 与回流 | confirm 时编译为正式 workflow JSON，落到现有目录，打开 editor | workflow 文件可被现有编辑器直接消费 |
| P8 测试与收尾 | 补单测、集成测试、lint、typecheck、专项 README 更新 | 改动符合规则且可交付 |

## 关键接口与行为约束
- `NodeSpec` 扩展项必须包含 `sideEffects`、`ports`、`output_namespace policy`、`container rules`、`system_managed_fields`。
- 生成态必须新增 `OFGenerationSession`、`OFGenerationGraphState`、`OFGenerationOpLogEntry`、`OFGenerationCheckpoint`、`OFGenerationValidationReport`、`OFGenerationPhaseModelConfig`。
- `window.api.orchestraflow` 必须新增：
  - `listGenerationSessions`
  - `getGenerationSession`
  - `createGenerationSession`
  - `sendGenerationPrompt`
  - `advanceGenerationPhase`
  - `rollbackGenerationCheckpoint`
  - `updateGenerationPhaseModels`
  - `confirmGenerationSession`
  - `deleteGenerationSession`
- session 持久化目录与 workflow 目录分离；workflow 文件仍为正式 `OFRunnableWorkflow JSON`。
- utility 生成引擎默认无长期内存真相；main 保存 session 快照，utility 接收快照并返回新快照或 delta。
- `title` 不再是引用锚点；新系统用稳定 `output_namespace` 生成 selector root。
- ifelse 的 `handleId` 与 control port id 必须稳定，不允许由文案 label 驱动。
- container 节点的内部 start、`start_node_id`、viewport、派生 output 全部系统管理。

## UI / 产品设计文档
### 产品目标
- 让用户在 OrchestraFlow Grid 中直接发起“描述需求 -> 预览方案 -> 生成草稿 -> 进入编辑”的流程。
- 降低“空白画布起步”的门槛，同时保留高级用户的手工编辑权。
- 生成过程必须是可恢复、可解释、可回滚的，而不是一次性黑箱生成。

### 页面与信息架构
- `GridView` 保留现有浅色卡片广场，新增 `GenerateWorkflowCard` 作为第一屏入口。
- `GridView` 顶部 tab 调整为 `全部` / `生成会话`，`全部` 显示空白创建卡 + 智能生成卡 + 工作流卡；`生成会话` 显示可恢复 session 卡片。
- `OrchestraFlowView/index.vue` 视图模式扩展为 `grid | generator | editor`。
- `GeneratorView` 使用三栏工作台：
  - 左栏：需求输入、会话消息、阶段进度、checkpoint 时间线。
  - 中栏：Plan preview、拓扑预览、当前 phase 主操作区。
  - 右栏：Graph summary、可达变量、OpLog、Validation report、Phase model 配置。
- 用户流固定为：
  - Grid 发起
  - Plan preview 确认
  - Wire/Config/Validate 自动推进与人工修正
  - 最终确认
  - 编译落盘
  - 打开 editor

### 视觉风格
- 禁止暗色主题；主基调沿用当前 OrchestraFlow/Grid 的浅色系统。
- 视觉锚点以当前 [GridView/index.vue](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\src\renderer\src\views\LuminaApp\Maincontent\OrchestraFlowView\GridView\index.vue)、[panel-theme.ts](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\src\renderer\src\views\LuminaApp\Maincontent\OrchestraFlowView\EditorView\PanelLayer\FloatingPanel\panel-theme.ts)、[DashboardView/index.vue](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\src\renderer\src\views\LuminaApp\Maincontent\DashboardView\index.vue) 为准。
- 采用 `minimalist-frontend-design-rules`：高密度、清晰层级、深色次要文本、轻控件、少卡片套卡片。
- 颜色语义固定：
  - 计划/成功：emerald
  - 拓扑/结构：cyan
  - 模型/LLM：indigo
  - 警告/修复：amber
  - 错误/阻断：rose
- 允许轻量 OrganicBackground 氛围层，但仅用于页级背景，不能干扰三栏工作台内容区。
- 所有新 Vue 页面根元素必须带 `of-` 定位类。

### 关键交互
- 生成中状态必须可见，且每个 phase 都有明确状态标记：`idle / running / waiting-confirm / failed / completed`。
- 回滚是一级能力，不隐藏在二级菜单。
- Validate 报告必须显示“问题类型 + 受影响节点 + 建议修复动作”。
- Confirm 按钮仅在 validation 通过且 preview 固定后可用。
- 成功反馈使用顶部中心轻量浮层，不用重型对话框。

## 参考资料索引
### 权威与规则
- [AGENTS.md](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\AGENTS.md)
- [project-overview skill](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\.agents\skills\project-overview\SKILL.md)
- [minimalist-frontend-design-rules skill](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\.agents\skills\minimalist-frontend-design-rules\SKILL.md)

### OrchestraFlow 现有架构
- [LuminaStudio/README.md](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\README.md)
- [utility/orchestraflow/README.md](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\src\utility\orchestraflow\README.md)
- [utility/orchestraflow/ai-schema/README.md](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\src\utility\orchestraflow\ai-schema\README.md)

### Shared 基座源码
- [node-definition.ts](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\src\Public\ShareTypes\Orchestraflow-types\node-definition.ts)
- [core-types.ts](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\src\Public\ShareTypes\Orchestraflow-types\core-types.ts)
- [selector-utils.ts](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\src\Public\ShareTypes\Orchestraflow-types\selector-utils.ts)
- [variable-definition.ts](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\src\Public\ShareTypes\Orchestraflow-types\variable-definition.ts)
- [ifelse.definition.ts](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\src\Public\ShareTypes\Orchestraflow-types\builtins\ifelse.definition.ts)
- [iteration.definition.ts](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\src\Public\ShareTypes\Orchestraflow-types\builtins\iteration.definition.ts)

### Runtime / 编译 / 校验
- [variable-store.ts](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\src\utility\orchestraflow\services\variable-store.ts)
- [graph-executor.ts](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\src\utility\orchestraflow\services\graph-executor.ts)
- [compiler.ts](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\src\utility\orchestraflow\ai-schema\compiler.ts)
- [builder.ts](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\src\utility\orchestraflow\ai-schema\builder.ts)
- [validator.ts](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\src\utility\orchestraflow\ai-schema\validator.ts)

### 入口与 UI 锚点
- [OrchestraFlowView/index.vue](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\src\renderer\src\views\LuminaApp\Maincontent\OrchestraFlowView\index.vue)
- [GridView/index.vue](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\src\renderer\src\views\LuminaApp\Maincontent\OrchestraFlowView\GridView\index.vue)
- [CreateWorkflowCard.vue](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\src\renderer\src\views\LuminaApp\Maincontent\OrchestraFlowView\GridView\CreateWorkflowCard.vue)
- [workflow-editor-ui.store.ts](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\src\renderer\src\stores\orchestraflow\workflow-editor\workflow-editor-ui.store.ts)
- [panel-theme.ts](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\src\renderer\src\views\LuminaApp\Maincontent\OrchestraFlowView\EditorView\PanelLayer\FloatingPanel\panel-theme.ts)
- [_Reference demo](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\_Reference\Templete\工作流生成界面demo.html)

### 校验与规范
- [eslint.config.mjs](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\eslint.config.mjs)
- [orchestraflow-plugin.mjs](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\scripts\eslint\orchestraflow-plugin.mjs)
- [tsconfig.web.json](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\tsconfig.web.json)
- [tsconfig.node.json](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\LuminaStudio\tsconfig.node.json)

### 已知缺口
- project-overview skill 中提到的 `modules/info-channels.md`、`database-snapshot.md`、`langchain-agent-map.md`、`orchestraflow-variable-system.md` 当前仓库内未检出，本专项索引不依赖它们。
- 根目录 [README.md](D:\code\Large-scale-integrated-project\HNULS-LabHub\HNULS-LuminaStudio\README.md) 内容与当前 LuminaStudio/OrchestraFlow 现状不一致，不作为本专项权威参考。

## 测试计划与验收
- Shared 层单测必须覆盖：
  - `output_namespace` 稳定且不随 title 改名漂移
  - selector/ref/value source 兼容迁移正确
  - ifelse handle / control port 约束正确
  - iteration/loop container spec 与内部 start 注入规则正确
- Utility 层单测必须覆盖：
  - `WIRE_BATCH / CONFIG_BATCH / EDIT_BATCH` 解析
  - `MUTATE / PATCH / SPLICE / REWIRE` 应用
  - graph summary 与 variable reachability
  - checkpoint rollback
  - phase 状态机与每阶段模型配置
- Main 层测试必须覆盖：
  - session create/get/list/delete
  - session 持久化恢复
  - confirm compile 成功生成正式 workflow 文件
  - confirm 前不会污染 workflow 目录
- Renderer 层测试必须覆盖：
  - Grid 智能生成入口
  - session 恢复入口
  - generator -> confirm -> editor 跳转
  - 旧的空白创建与复制 AI Schema 功能无回归
- 收尾命令：
  - `pnpm lint:orchestraflow`
  - `pnpm test:orchestraflow`
  - `pnpm exec tsc -p tsconfig.json --noEmit`

## Assumptions
- 旧系统必须保留，不删空白创建和复制 AI Schema。
- 生成 session 与正式 workflow 双轨持久化是硬约束。
- utility 负责生成计算，main 负责 session 真相与文件持久化。
- 生成态 graph 与最终 runnable workflow 是两套表示，confirm 时才编译收敛。
- `output_namespace` 默认取稳定系统值，不再绑 `title`。
- 新页面全部遵循当前浅色 Lumina 风格，不做暗色版。
- 专项文档是交付物的一部分，后续换对话必须以 `_Documents/OrchestraFlow-Agent` 为主入口继续。
