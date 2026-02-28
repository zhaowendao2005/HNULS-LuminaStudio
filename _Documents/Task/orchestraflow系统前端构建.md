Let me first load project skills and research the Dify workflow components, then study the LuminaStudio project structure.



Let me systematically study both the Dify workflow components and the LuminaStudio project structure.







Now let me study the LuminaStudio project structure deeply — views, stores, routing, and the existing patterns.









Let me continue studying the Dify workflow entry, store, operator, and the app listing/creation pages.

Let me study the Dify app listing page (Grid view) and the operator/panel components more closely.

Let me continue studying the critical components — the panel structure, debug/preview, variable inspect, and the LuminaStudio existing patterns.

Let me study the LuminaStudio DashboardView and existing store patterns, plus the Dify app main page for the grid view.


---

# OrchestraFlow (OF) — 工作流系统前端搬运规划

## 一、背景与目标

将 Dify 的 Workflow 系统的**前端交互与 UI** 移植到 LuminaStudio（Vue 3 + Pinia + TailwindCSS），使用 **VueFlow** 替代 ReactFlow。系统名 **OrchestraFlow**，简写 **OF**，定位类前缀 `of-`。

**范围**：
- 仅前端，不涉及后端/Utility Process
- 节点仅实现 Start / LLM / End 三种
- 系统级 UI 全量搬运（Header、Operator、Panel、Debug、Variable Inspect 等）
- 数据与逻辑全部使用 mock

---

## 二、Dify 源码结构映射（参考源）

以下为 Dify `web/app/components/` 下需要参考的核心模块：

| Dify 源目录 | 功能 | 搬运优先级 |
|---|---|---|
| `apps/list.tsx` + `apps/app-card.tsx` + `apps/new-app-card.tsx` | 应用列表页（Grid 视图）| P0 |
| `app/create-app-modal/` | 创建应用弹窗 | P0 |
| [workflow/index.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/index.tsx:0:0-0:0) | 编辑器主入口（ReactFlow 容器） | P0 |
| [workflow/types.ts](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/types.ts:0:0-0:0) | 核心类型定义（BlockEnum, Node, Edge, etc.） | P0 |
| [workflow/store/workflow/](cci:9://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/store/workflow:0:0-0:0) | 编辑器状态管理（15 个 Zustand slice） | P0 |
| [workflow/header/](cci:9://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/header:0:0-0:0) | 编辑器顶部工具栏（19 个文件） | P0 |
| [workflow/operator/](cci:9://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/operator:0:0-0:0) | 底部操作栏（ZoomInOut, MiniMap, UndoRedo） | P0 |
| [workflow/panel/](cci:9://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/panel:0:0-0:0) | 右侧面板（节点配置、调试预览、环境变量等） | P0 |
| [workflow/nodes/_base/](cci:9://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/nodes/_base:0:0-0:0) | 节点基础组件（handles, resizer, 通用 UI） | P0 |
| [workflow/nodes/start/](cci:9://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/nodes/start:0:0-0:0) | Start 节点 | P0 |
| [workflow/nodes/llm/](cci:9://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/nodes/llm:0:0-0:0) | LLM 节点 | P0 |
| [workflow/nodes/end/](cci:9://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/nodes/end:0:0-0:0) | End 节点 | P0 |
| [workflow/hooks/](cci:9://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/hooks:0:0-0:0) | 37 个自定义 hooks | P1 |
| [workflow/run/](cci:9://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/run:0:0-0:0) | 运行/测试面板 | P1 |
| [workflow/variable-inspect/](cci:9://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/variable-inspect:0:0-0:0) | 变量检查面板 | P1 |
| [workflow/block-selector/](cci:9://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/block-selector:0:0-0:0) | 节点选择器面板 | P1 |
| [workflow/utils/](cci:9://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/utils:0:0-0:0) | 工具函数（布局、初始化等） | P1 |
| [workflow/custom-edge.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/custom-edge.tsx:0:0-0:0) + [custom-connection-line.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/custom-connection-line.tsx:0:0-0:0) | 自定义连线 | P1 |
| [workflow/help-line/](cci:9://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/help-line:0:0-0:0) | 对齐辅助线 | P2 |
| [workflow/note-node/](cci:9://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/note-node:0:0-0:0) | 便签节点 | P3 (暂不搬) |
| [workflow/workflow-preview/](cci:9://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/workflow-preview:0:0-0:0) | 工作流只读预览 | P3 (暂不搬) |

---

## 三、LuminaStudio 目标目录结构

### 3.1 Views 层

```
views/LuminaApp/Maincontent/OrchestraFlowView/
├── index.vue                          # OF 主视图容器（路由切换 Grid ↔ Editor）
├── GridView/                          # 工作流列表页（Grid 视图）
│   ├── index.vue                      # of-grid-view 页面入口
│   ├── WorkflowCard.vue               # 单个工作流卡片（对标 Dify AppCard）
│   ├── CreateWorkflowCard.vue         # "创建工作流" 入口卡片（对标 NewAppCard）
│   └── CreateWorkflowModal/           # 创建工作流弹窗
│       └── index.vue                  # 弹窗：名称 + 描述 + 图标（仅 orchestraflow 类型）
├── EditorView/                        # 工作流编辑器页面
│   ├── index.vue                      # of-editor 编辑器主入口（VueFlow 容器）
│   ├── Header/                        # 编辑器顶部工具栏
│   │   ├── index.vue                  # of-editor-header
│   │   ├── EditingTitle.vue           # 工作流名称编辑
│   │   ├── RunAndHistory.vue          # 运行 & 历史按钮
│   │   ├── TestRunMenu.vue            # 测试运行菜单
│   │   ├── UndoRedo.vue              # 撤销/重做
│   │   ├── Checklist.vue             # 检查清单
│   │   ├── EnvButton.vue             # 环境变量按钮
│   │   ├── GlobalVariableButton.vue  # 全局变量按钮
│   │   └── RunMode.vue               # 运行模式选择
│   ├── Operator/                      # 底部操作栏
│   │   ├── index.vue                  # of-editor-operator
│   │   ├── ZoomInOut.vue             # 缩放控制
│   │   ├── Control.vue               # 指针/手模式切换
│   │   └── AddBlock.vue              # 添加节点按钮
│   ├── Panel/                         # 右侧面板区
│   │   ├── index.vue                  # of-editor-panel 面板容器
│   │   ├── NodePanel/                # 节点配置面板
│   │   │   └── index.vue
│   │   ├── DebugAndPreview/          # 调试预览面板
│   │   │   ├── index.vue
│   │   │   ├── ChatWrapper.vue
│   │   │   ├── UserInput.vue
│   │   │   └── Empty.vue
│   │   ├── InputsPanel.vue           # 输入参数面板
│   │   └── EnvPanel/                 # 环境变量面板
│   │       └── index.vue
│   ├── Nodes/                         # 节点组件
│   │   ├── _base/                    # 节点基础组件
│   │   │   ├── BaseNode.vue          # 通用节点壳（对标 _base/node.tsx）
│   │   │   ├── NodeHandle.vue        # 连接点
│   │   │   ├── NodeResizer.vue       # 节点尺寸调整
│   │   │   └── components/           # 共享子组件
│   │   │       ├── NodeTitle.vue
│   │   │       ├── NodeDescription.vue
│   │   │       ├── OutputVarList.vue
│   │   │       └── ErrorHandle.vue
│   │   ├── StartNode/                # 开始节点
│   │   │   ├── Node.vue              # 画布节点渲染
│   │   │   ├── Panel.vue             # 右侧配置面板
│   │   │   ├── default.ts            # 默认值与元数据
│   │   │   └── types.ts
│   │   ├── LLMNode/                  # LLM 节点
│   │   │   ├── Node.vue
│   │   │   ├── Panel.vue
│   │   │   ├── default.ts
│   │   │   ├── types.ts
│   │   │   └── components/           # LLM 特有子组件
│   │   │       ├── ModelSelector.vue
│   │   │       ├── PromptEditor.vue
│   │   │       ├── ContextConfig.vue
│   │   │       └── MemoryConfig.vue
│   │   └── EndNode/                  # 结束节点
│   │       ├── Node.vue
│   │       ├── Panel.vue
│   │       ├── default.ts
│   │       └── types.ts
│   ├── BlockSelector/                # 节点选择器
│   │   └── index.vue
│   ├── VariableInspect/              # 变量检查面板
│   │   ├── index.vue
│   │   └── Trigger.vue
│   ├── RunPanel/                     # 运行/测试面板
│   │   ├── index.vue
│   │   ├── TracingPanel.vue
│   │   ├── ResultPanel.vue
│   │   └── StatusDisplay.vue
│   ├── ContextMenus/                 # 右键菜单
│   │   ├── NodeContextMenu.vue
│   │   ├── PanelContextMenu.vue
│   │   └── SelectionContextMenu.vue
│   ├── CustomEdge.vue                # 自定义连线
│   ├── CustomConnectionLine.vue      # 连线引导线
│   └── HelpLine.vue                  # 对齐辅助线
└── composables/                      # OF 专用 composables
    ├── useWorkflow.ts                # 工作流全局逻辑
    ├── useNodesInteractions.ts       # 节点交互
    ├── useEdgesInteractions.ts       # 连线交互
    ├── useShortcuts.ts               # 快捷键
    ├── useWorkflowHistory.ts         # 撤销/重做
    └── useWorkflowRun.ts            # 运行/测试
```

### 3.2 Stores 层

```
stores/orchestraflow/
├── workflow-list/                     # 工作流列表（Grid 视图数据源）
│   ├── workflow-list.store.ts
│   ├── workflow-list.datasource.ts
│   ├── workflow-list.types.ts
│   └── workflow-list.mock.ts
├── workflow-editor/                   # 编辑器核心状态
│   ├── workflow-editor.store.ts       # 主 store（整合以下子模块）
│   ├── workflow-editor.datasource.ts
│   ├── workflow-editor.types.ts
│   ├── workflow-editor.mock.ts
│   └── slices/                        # 状态切片（对标 Dify store/workflow/ 15 个 slice）
│       ├── node-slice.ts              # 节点状态
│       ├── panel-slice.ts             # 面板状态
│       ├── layout-slice.ts            # 布局尺寸
│       ├── workflow-slice.ts          # 工作流元数据
│       ├── history-slice.ts           # 撤销/重做历史
│       ├── env-variable-slice.ts      # 环境变量
│       ├── form-slice.ts             # 表单状态
│       └── tool-slice.ts             # 工具状态
└── workflow-run/                      # 运行/测试状态
    ├── workflow-run.store.ts
    ├── workflow-run.types.ts
    └── workflow-run.mock.ts
```

### 3.3 Types 层（preload/types）

```
src/preload/types/
└── orchestraflow.types.ts             # OF 跨进程类型定义
    - OFWorkflowMeta                   # 工作流元数据（id, name, desc, icon, timestamps）
    - OFBlockEnum                      # 节点类型枚举（Start, LLM, End）
    - OFNode / OFEdge                  # 节点/连线类型
    - OFNodeRunningStatus             # 节点运行状态
    - OFWorkflowRunningStatus         # 工作流运行状态
    - OFVariable / OFInputVar         # 变量类型
    - OFModelConfig                   # 模型配置
    - OFPromptItem / OFMemory         # Prompt 相关
```

---

## 四、依赖安装

| 包名 | 用途 | 备注 |
|---|---|---|
| `@vue-flow/core` | VueFlow 核心 | 替代 ReactFlow |
| `@vue-flow/background` | 背景网格 | |
| `@vue-flow/minimap` | 小地图 | |
| `@vue-flow/controls` | 缩放控制 | |
| `@vue-flow/node-resizer` | 节点尺寸调整 | |

---

## 五、详细搬运 TODO（按阶段划分）

### 阶段 0：基础设施搭建

| # | 任务 | 对标 Dify | 产出 |
|---|---|---|---|
| 0.1 | 安装 VueFlow 及插件 | — | `package.json` 更新 |
| 0.2 | Sidebar 新增 "OrchestraFlow" Tab | [Sidebar/index.vue](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/LuminaStudio/src/renderer/src/views/LuminaApp/Sidebar/index.vue:0:0-0:0) 新增图标 | 新 sidebar item |
| 0.3 | 主视图容器路由 | [LuminaApp/index.vue](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/LuminaStudio/src/renderer/src/views/LuminaApp/index.vue:0:0-0:0) 新增 `activeTab === 'orchestraflow'` | `OrchestraFlowView/index.vue` |
| 0.4 | 创建 `stores/orchestraflow/` 目录结构 | — | 空 store 文件骨架 |
| 0.5 | 创建 `preload/types/orchestraflow.types.ts` | [workflow/types.ts](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/types.ts:0:0-0:0) | 核心类型定义 |

### 阶段 1：Grid 视图（工作流列表页）

| # | 任务 | 对标 Dify 源 | 关键细节 |
|---|---|---|---|
| 1.1 | `GridView/index.vue` 页面骨架 | `apps/list.tsx` | 顶部 Tab（仅"全部"+"OrchestraFlow"），搜索框，Grid 布局 |
| 1.2 | `CreateWorkflowCard.vue` | `apps/new-app-card.tsx` | 左上角"创建工作流"卡片，点击弹出创建弹窗。**注意**：Dify 有多种应用类型（Workflow/Chat/Agent/Completion），我们**仅保留一个** orchestraflow 选项 |
| 1.3 | `CreateWorkflowModal/index.vue` | `app/create-app-modal/index.tsx` | 全屏弹窗：名称输入、描述输入、图标选择。**简化**：去掉 Dify 的多应用类型选择，只保留名称+描述+图标 |
| 1.4 | `WorkflowCard.vue` | `apps/app-card.tsx` | 卡片展示：图标、名称、作者、修改时间、描述。右键菜单：编辑、复制、删除、导出。**点击进入编辑器** |
| 1.5 | `workflow-list.store.ts` | — | CRUD 操作，分页，搜索/筛选，全部 mock |
| 1.6 | `workflow-list.mock.ts` | — | 3-5 条 mock 工作流数据 |

**Grid 视图搬运要点**：
- Dify 的 `apps/list.tsx` 有 Tab 筛选（全部/Workflow/Chat/Agent/Completion）→ 我们仅保留 "全部" + "OrchestraFlow" 两个 Tab
- Dify 的 `new-app-card.tsx` 是一个特殊卡片放在 Grid 首位 → 复刻这个交互
- Dify 的 `app-card.tsx` 有复杂的操作菜单 → 简化为：编辑、复制、删除
- 搜索功能用 debounce 500ms（同 Dify）

### 阶段 2：编辑器主框架

| # | 任务 | 对标 Dify 源 | 关键细节 |
|---|---|---|---|
| 2.1 | `EditorView/index.vue` VueFlow 容器 | [workflow/index.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/index.tsx:0:0-0:0) | VueFlow 实例，Background, MiniMap, Controls。注册自定义节点/连线类型 |
| 2.2 | `CustomEdge.vue` | [workflow/custom-edge.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/custom-edge.tsx:0:0-0:0) | 自定义贝塞尔连线，hover 高亮，删除按钮 |
| 2.3 | `CustomConnectionLine.vue` | [workflow/custom-connection-line.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/custom-connection-line.tsx:0:0-0:0) | 拖拽中的连线引导 |
| 2.4 | `workflow-editor.store.ts` 基础版 | [workflow/store/workflow/index.ts](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/store/workflow/index.ts:0:0-0:0) | 先实现 node-slice, panel-slice, layout-slice, workflow-slice |
| 2.5 | `workflow-editor.mock.ts` | [workflow/utils/workflow-init.ts](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/utils/workflow-init.ts:0:0-0:0) | 默认工作流：Start → LLM → End 三节点 + 两条连线 |
| 2.6 | 编辑器与 Grid 视图间的导航 | — | 从 Grid 点击卡片 → 加载 mock 数据 → 进入编辑器；编辑器左上角返回 → 回到 Grid |

**编辑器容器搬运要点**：
- Dify [workflow/index.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/index.tsx:0:0-0:0) 是一个 ~350 行的 React 组件 → 拆分为 Vue `setup` 逻辑
- Dify 使用 `ReactFlowProvider > WorkflowHistoryProvider > DatasetsDetailProvider` 嵌套 → 我们用 VueFlow 的 `provide/inject` 模式
- `nodeTypes` 映射：`{ custom: CustomNode, ... }` → VueFlow 的 `<template #node-custom="nodeProps">`
- `edgeTypes` 映射同理
- Dify 的 `controlMode`（Pointer/Hand）→ VueFlow 的 `panOnDrag` / `selectionOnDrag` 配置
- 背景用 `@vue-flow/background`，设置 gap=14, size=2（同 Dify）

### 阶段 3：编辑器 Header

| # | 任务 | 对标 Dify 源 | 关键细节 |
|---|---|---|---|
| 3.1 | `Header/index.vue` | [workflow/header/index.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/header/index.tsx:0:0-0:0) | 顶部栏容器，左中右三区布局 |
| 3.2 | `EditingTitle.vue` | [header/editing-title.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/header/editing-title.tsx:0:0-0:0) | 工作流名称 inline 编辑 |
| 3.3 | `UndoRedo.vue` | [header/undo-redo.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/header/undo-redo.tsx:0:0-0:0) | 撤销/重做按钮 + Ctrl+Z/Y |
| 3.4 | `RunAndHistory.vue` | [header/run-and-history.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/header/run-and-history.tsx:0:0-0:0) | "运行" 按钮 + 历史记录下拉 |
| 3.5 | `TestRunMenu.vue` | [header/test-run-menu.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/header/test-run-menu.tsx:0:0-0:0) | 测试运行菜单（单步/全量） |
| 3.6 | `Checklist.vue` | [header/checklist.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/header/checklist.tsx:0:0-0:0) | 工作流检查清单（校验节点配置） |
| 3.7 | `EnvButton.vue` | [header/env-button.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/header/env-button.tsx:0:0-0:0) | 环境变量按钮 |
| 3.8 | `GlobalVariableButton.vue` | [header/global-variable-button.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/header/global-variable-button.tsx:0:0-0:0) | 全局变量按钮 |
| 3.9 | `RunMode.vue` | [header/run-mode.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/header/run-mode.tsx:0:0-0:0) | 运行模式选择 |

**Header 搬运要点**：
- Dify Header 有 3 种模式：Normal / Restoring / ViewHistory → 我们先只做 Normal
- [editing-title.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/header/editing-title.tsx:0:0-0:0) 是一个 contentEditable 的 inline 编辑 → Vue 等价实现
- [run-and-history.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/header/run-and-history.tsx:0:0-0:0) 右侧运行按钮 → mock 运行逻辑
- [checklist.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/header/checklist.tsx:0:0-0:0) 有复杂的校验逻辑（18KB）→ 简化为仅校验 3 个节点是否配置完整

### 阶段 4：编辑器 Operator（底部操作栏）

| # | 任务 | 对标 Dify 源 | 关键细节 |
|---|---|---|---|
| 4.1 | `Operator/index.vue` | [workflow/operator/index.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/operator/index.tsx:0:0-0:0) | 底部栏容器，含 UndoRedo + MiniMap + ZoomInOut |
| 4.2 | `ZoomInOut.vue` | [operator/zoom-in-out.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/operator/zoom-in-out.tsx:0:0-0:0) | 缩放百分比显示，+/- 按钮，fit-view 按钮 |
| 4.3 | `Control.vue` | [operator/control.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/operator/control.tsx:0:0-0:0) | 左侧：指针/手模式切换 |
| 4.4 | `AddBlock.vue` | [operator/add-block.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/operator/add-block.tsx:0:0-0:0) | 添加节点按钮 → 打开 BlockSelector |

**Operator 搬运要点**：
- Dify 的 Operator 使用 ReactFlow 的 `<MiniMap>` → VueFlow 的 `@vue-flow/minimap`
- ZoomInOut 需要 `useVueFlow` 的 `zoomIn()` / `zoomOut()` / `fitView()`
- [more-actions.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/operator/more-actions.tsx:0:0-0:0)（9KB）→ 简化，只保留基础操作

### 阶段 5：节点系统

| # | 任务 | 对标 Dify 源 | 关键细节 |
|---|---|---|---|
| 5.1 | `_base/BaseNode.vue` | [nodes/_base/node.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/nodes/_base/node.tsx:0:0-0:0) (13KB) | 通用节点外壳：标题栏、图标、连接 handles、选中高亮、运行状态指示 |
| 5.2 | `_base/NodeHandle.vue` | [_base/components/](cci:9://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/nodes/_base/components:0:0-0:0) 相关 | Source/Target handle 组件 |
| 5.3 | `_base/components/NodeTitle.vue` | `_base/components/title.tsx` | 节点标题 + 图标 |
| 5.4 | `_base/components/OutputVarList.vue` | `_base/components/output-var-list.tsx` | 输出变量列表展示 |
| 5.5 | `StartNode/Node.vue` | [nodes/start/node.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/nodes/start/node.tsx:0:0-0:0) (1.5KB) | 开始节点画布渲染：显示输入变量列表 |
| 5.6 | `StartNode/Panel.vue` | [nodes/start/panel.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/nodes/start/panel.tsx:0:0-0:0) (3.3KB) | 开始节点配置面板：添加/编辑输入变量 |
| 5.7 | `StartNode/default.ts` | [nodes/start/default.ts](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/nodes/start/default.ts:0:0-0:0) | 默认值、元数据、校验函数 |
| 5.8 | `LLMNode/Node.vue` | [nodes/llm/node.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/nodes/llm/node.tsx:0:0-0:0) (1KB) | LLM 节点画布渲染：显示模型名称、prompt 预览 |
| 5.9 | `LLMNode/Panel.vue` | [nodes/llm/panel.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/nodes/llm/panel.tsx:0:0-0:0) (12.3KB) | LLM 配置面板：模型选择、Prompt 编辑、上下文、记忆 |
| 5.10 | `LLMNode/components/` | [nodes/llm/components/](cci:9://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/nodes/llm/components:0:0-0:0) (32 个文件) | ModelSelector, PromptEditor, ContextConfig, MemoryConfig → **重点简化**，仅保留核心交互 |
| 5.11 | `LLMNode/default.ts` | [nodes/llm/default.ts](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/nodes/llm/default.ts:0:0-0:0) (4KB) | 默认配置 |
| 5.12 | `EndNode/Node.vue` | [nodes/end/node.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/nodes/end/node.tsx:0:0-0:0) (1.8KB) | 结束节点画布渲染：显示输出变量 |
| 5.13 | `EndNode/Panel.vue` | [nodes/end/panel.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/nodes/end/panel.tsx:0:0-0:0) (1.3KB) | 结束节点配置面板：定义输出变量 |
| 5.14 | `EndNode/default.ts` | [nodes/end/default.ts](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/nodes/end/default.ts:0:0-0:0) (1.2KB) | 默认值 |

**节点搬运要点**：
- Dify 每个节点有固定结构：[node.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/run/node.tsx:0:0-0:0)（画布渲染）、[panel.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/nodes/llm/panel.tsx:0:0-0:0)（右侧配置）、[default.ts](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/nodes/end/default.ts:0:0-0:0)（默认值/校验）、[types.ts](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/LuminaStudio/src/renderer/src/stores/ai-chat/types.ts:0:0-0:0)、[use-config.ts](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/nodes/end/use-config.ts:0:0-0:0)（配置 hook）
- [_base/node.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/nodes/_base/node.tsx:0:0-0:0) 是 13KB 的大组件 → 需仔细拆分为 Vue 组件
- [_base/components/](cci:9://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/nodes/_base/components:0:0-0:0) 有 130 个文件 → 只搬运 Start/LLM/End 实际用到的
- **LLM 节点最复杂**：[panel.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/nodes/llm/panel.tsx:0:0-0:0) 12KB，[components/](cci:9://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/LuminaStudio/src/renderer/src/components:0:0-0:0) 32 个文件 → 建议先搬核心 4-5 个组件（ModelSelector, PromptEditor, ContextConfig, MemoryConfig）

### 阶段 6：Panel 系统（右侧面板）

| # | 任务 | 对标 Dify 源 | 关键细节 |
|---|---|---|---|
| 6.1 | `Panel/index.vue` | [workflow/panel/index.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/panel/index.tsx:0:0-0:0) (5KB) | 面板容器：ResizeObserver 跟踪宽度，条件渲染 NodePanel / EnvPanel / DebugPreview |
| 6.2 | `Panel/NodePanel/index.vue` | [workflow/nodes/](cci:9://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/nodes:0:0-0:0) 的 Panel 组件分发 | 根据选中节点类型动态渲染对应 Panel 组件 |
| 6.3 | `Panel/DebugAndPreview/index.vue` | [panel/debug-and-preview/index.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/panel/debug-and-preview/index.tsx:0:0-0:0) (5.8KB) | 调试预览面板 |
| 6.4 | `Panel/DebugAndPreview/ChatWrapper.vue` | [panel/debug-and-preview/chat-wrapper.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/panel/debug-and-preview/chat-wrapper.tsx:0:0-0:0) (7.5KB) | 聊天调试界面 |
| 6.5 | `Panel/InputsPanel.vue` | [panel/inputs-panel.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/panel/inputs-panel.tsx:0:0-0:0) (4KB) | 输入参数表单 |
| 6.6 | `Panel/EnvPanel/index.vue` | [panel/env-panel/](cci:9://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/panel/env-panel:0:0-0:0) (4 个文件) | 环境变量管理面板 |

### 阶段 7：Variable Inspect + Block Selector

| # | 任务 | 对标 Dify 源 | 关键细节 |
|---|---|---|---|
| 7.1 | `VariableInspect/index.vue` | `variable-inspect/index.tsx + panel.tsx` | 变量检查面板（底部展开） |
| 7.2 | `VariableInspect/Trigger.vue` | [variable-inspect/trigger.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/variable-inspect/trigger.tsx:0:0-0:0) | 触发按钮 |
| 7.3 | `BlockSelector/index.vue` | [workflow/block-selector/](cci:9://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/block-selector:0:0-0:0) (34 个文件) | **大幅简化**：仅列出 Start/LLM/End 三种节点，搜索可省略 |

### 阶段 8：运行/测试系统

| # | 任务 | 对标 Dify 源 | 关键细节 |
|---|---|---|---|
| 8.1 | `RunPanel/index.vue` | [workflow/run/index.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/run/index.tsx:0:0-0:0) (6.5KB) | 运行面板主入口 |
| 8.2 | `RunPanel/TracingPanel.vue` | [run/tracing-panel.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/run/tracing-panel.tsx:0:0-0:0) (6.3KB) | 节点执行追踪 |
| 8.3 | `RunPanel/ResultPanel.vue` | [run/result-panel.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/run/result-panel.tsx:0:0-0:0) (6KB) | 运行结果展示 |
| 8.4 | `RunPanel/StatusDisplay.vue` | [run/status.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/run/status.tsx:0:0-0:0) (8.2KB) | 节点运行状态展示 |
| 8.5 | `workflow-run.store.ts` | — | mock 运行状态流转 |

### 阶段 9：右键菜单 + 快捷键

| # | 任务 | 对标 Dify 源 | 关键细节 |
|---|---|---|---|
| 9.1 | `ContextMenus/NodeContextMenu.vue` | [node-contextmenu.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/node-contextmenu.tsx:0:0-0:0) (1.3KB) | 节点右键：复制/粘贴/删除/运行此节点 |
| 9.2 | `ContextMenus/PanelContextMenu.vue` | [panel-contextmenu.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/panel-contextmenu.tsx:0:0-0:0) (4.1KB) | 画布右键：粘贴/选择全部/添加节点 |
| 9.3 | `ContextMenus/SelectionContextMenu.vue` | [selection-contextmenu.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/selection-contextmenu.tsx:0:0-0:0) (16.7KB) | 多选右键：对齐/复制/删除 → **简化** |
| 9.4 | Composables: `useShortcuts.ts` | [hooks/use-shortcuts.ts](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/hooks/use-shortcuts.ts:0:0-0:0) (6.8KB) | Ctrl+C/V/Z/Y/A/D, Delete 等 |

---

## 六、Composables 搬运映射（hooks → composables）

| Dify Hook | Vue Composable | 优先级 | 备注 |
|---|---|---|---|
| [use-workflow.ts](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/hooks/use-workflow.ts:0:0-0:0) (15KB) | `useWorkflow.ts` | P0 | 工作流全局逻辑、连接校验 |
| [use-nodes-interactions.ts](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/hooks/use-nodes-interactions.ts:0:0-0:0) (67KB) | `useNodesInteractions.ts` | P0 | **最大文件**，节点拖拽/连接/删除/复制等 → 需拆分 |
| [use-edges-interactions.ts](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/hooks/use-edges-interactions.ts:0:0-0:0) (6.4KB) | `useEdgesInteractions.ts` | P0 | 连线交互 |
| [use-shortcuts.ts](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/hooks/use-shortcuts.ts:0:0-0:0) (6.8KB) | `useShortcuts.ts` | P1 | 快捷键 |
| [use-workflow-history.ts](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/hooks/use-workflow-history.ts:0:0-0:0) (6KB) | `useWorkflowHistory.ts` | P1 | 撤销/重做 |
| [use-workflow-run.ts](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/hooks/use-workflow-run.ts:0:0-0:0) + [use-workflow-start-run.tsx](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/hooks/use-workflow-start-run.tsx:0:0-0:0) | `useWorkflowRun.ts` | P1 | 运行逻辑（mock） |
| [use-checklist.ts](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/hooks/use-checklist.ts:0:0-0:0) (18KB) | — | P2 | 检查清单校验 → 简化 |
| [use-helpline.ts](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/hooks/use-helpline.ts:0:0-0:0) (6.4KB) | — | P2 | 对齐辅助线 |
| 其余 30+ hooks | 按需 | P2-P3 | |

---

## 七、Mock 数据设计

### 7.1 工作流列表 Mock
```ts
// 3-5 条工作流
{
  id: 'of-wf-001',
  name: '客户服务自动回复',
  description: '根据用户问题自动生成回复',
  icon: '🤖',
  iconBackground: '#FFEAD5',
  author: '赵文道',
  createdAt: 1740000000,
  updatedAt: 1740086400,
  status: 'draft',
  nodeCount: 3,
  tags: ['客服', '自动化']
}
```

### 7.2 默认工作流图 Mock
```ts
// Start(0,0) → LLM(250,0) → End(500,0) 三节点
nodes: [
  { id: 'start-1', type: 'start', position: { x: 0, y: 200 }, data: { title: '开始', type: 'start', ... } },
  { id: 'llm-1', type: 'llm', position: { x: 350, y: 200 }, data: { title: 'LLM', type: 'llm', model: { provider: 'openai', name: 'gpt-4' }, ... } },
  { id: 'end-1', type: 'end', position: { x: 700, y: 200 }, data: { title: '结束', type: 'end', ... } },
]
edges: [
  { id: 'e-start-llm', source: 'start-1', target: 'llm-1' },
  { id: 'e-llm-end', source: 'llm-1', target: 'end-1' },
]
```

### 7.3 运行结果 Mock
```ts
{
  status: 'succeeded',
  elapsed_time: 2.34,
  total_tokens: 156,
  tracing: [
    { nodeId: 'start-1', status: 'succeeded', elapsed_time: 0.01 },
    { nodeId: 'llm-1', status: 'succeeded', elapsed_time: 2.30, outputs: { text: '...' } },
    { nodeId: 'end-1', status: 'succeeded', elapsed_time: 0.03 },
  ]
}
```

---

## 八、搬运时的关键差异对照

| 维度 | Dify (React) | LuminaStudio (Vue 3) |
|---|---|---|
| 流程图库 | ReactFlow | @vue-flow/core |
| 状态管理 | Zustand (slice 模式) | Pinia (store + datasource 模式) |
| 样式 | Tailwind + CSS Modules | Tailwind (inline class) |
| 组件模式 | `memo()` + hooks | `<script setup>` + composables |
| 国际化 | react-i18next | vue-i18n (若有) 或硬编码中文 |
| 动态导入 | `next/dynamic` | `defineAsyncComponent` |
| 右键菜单 | 自定义 absolute div | 同方案或用 headless UI |
| Portal | `createPortal` | `<Teleport>` |

---

## 九、阶段里程碑

| 里程碑 | 交付物 | 预估工作量 |
|---|---|---|
| **M0** 基础设施 | Sidebar + 路由 + 空页面 + 类型 + Store 骨架 | 0.5 天 |
| **M1** Grid 视图 | 可用的工作流列表 + 创建/删除/搜索 (全 mock) | 1.5 天 |
| **M2** 编辑器骨架 | VueFlow 画布 + 3 个节点渲染 + 自定义连线 + 拖拽交互 | 2 天 |
| **M3** 编辑器 Header + Operator | 完整的顶部/底部工具栏 | 1.5 天 |
| **M4** 节点 Panel 系统 | 选中节点 → 右侧配置面板（Start/LLM/End） | 2 天 |
| **M5** 系统面板 | Debug/Preview + Env + Variable Inspect | 2 天 |
| **M6** 运行系统 | Mock 运行 + 追踪面板 + 状态流转动画 | 1.5 天 |
| **M7** 交互完善 | 右键菜单 + 快捷键 + 撤销重做 + 对齐辅助线 | 1.5 天 |
| **总计** | | **~12.5 天** |

---

## 十、注意事项与风险

1. **VueFlow vs ReactFlow API 差异**：VueFlow 的 API 与 ReactFlow 不完全对等，需逐一验证 `isValidConnection`、`onConnect`、自定义 handle 等特性
2. **LLM 节点 Panel 复杂度**：Dify 的 LLM 节点有 32 个子组件、13KB 的 [use-config.ts](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/nodes/end/use-config.ts:0:0-0:0) → 最大程度原汁原味还原
3. **67KB 的 [use-nodes-interactions.ts](cci:7://file:///d:/code/Large-scale-integrated-project/HNULS-LabHub/HNULS-LuminaStudio/_Reference/dify-main/web/app/components/workflow/hooks/use-nodes-interactions.ts:0:0-0:0)**：这是 Dify 最大的单文件 → 必须拆分为多个 composable
4. **Store 设计**：Dify 用 Zustand slice 组合模式 → Pinia 没有原生 slice，建议用 composable 函数模拟 slice 逻辑，在主 store 中组合
5. **定位类**：所有组件根元素必须带 `of-` 前缀定位类（如 `of-grid-view`、`of-editor`、`of-editor-header`）
6. **不写后端**：所有数据操作（CRUD、运行）全部走 mock datasource，接口预留给后续 IPC 对接