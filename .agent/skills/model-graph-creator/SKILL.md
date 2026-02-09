---
name: model-graph-creator
description: Create or edit LuminaStudio models (graphs), including config schema, renderer UI, main/utility wiring, provider resolution, and message rendering.
---
## 目标
本 Skill 用于**详细指导**如何在 LuminaStudio 中**新增或编辑一个模型（Model/Graph）**，保证从 UI 配置 → Main → Utility → Graph 执行 → 消息渲染完整闭环。

适用场景：
- 新建一个 LangGraph model（如 NewQaModel）
- 修改现有 Knowledge-QA 逻辑或配置
- 增加/删除某个节点或流程分支

---

## 核心数据流（必须理解）

```
Renderer UI  →  Main Service  →  Utility Process  →  Graph  →  Nodes
  配置编辑       解析/透传        运行时创建         编排逻辑    执行逻辑
```

**任何新模型必须打通这条链路**，否则 UI 配置不会生效。

---

## 一、类型与配置层（Shared Types）

### 1. 配置入口
在 `src/Public/ShareTypes/langchain-client.types.ts` 中定义 model config：

```ts
export interface KnowledgeQaModelConfig {
  planModel: KnowledgeQaModelSelectorConfig
  summaryModel: KnowledgeQaModelSelectorConfig
  retrieval: { ... }
  graph: { maxIterations: number }
}
```

**新增模型必须：**
- 新增 `XxxModelConfig` interface
- 在 `LangchainClientAgentCreateConfig.modelConfig` 中加入口

### 2. NodeKind 更新
如果新增节点，需要更新：
```ts
export type LangchainClientNodeKind = 'planning' | 'summary' | ...
```

否则 UI 无法显示节点事件。

---

## 二、Renderer 配置面板（UI 层）

### 0. 参考模板（Knowledge-QA）
新增模型时**必须先对照 Knowledge-QA 的完整链路**：

- 配置面板：  
  `src/renderer/src/views/LuminaApp/Maincontent/NormalChat/NormalChat-Maincontent/LangchainModel-Config/KnowledgeQaConfig.vue`
- 配置弹窗容器：  
  `src/renderer/src/views/LuminaApp/Maincontent/NormalChat/NormalChat-Maincontent/LangchainModel-Config/index.vue`
- 打开入口（LeftPanel → NormalChat）：  
  `src/renderer/src/views/LuminaApp/Maincontent/NormalChat/index.vue`
- Store（持久化）：  
  `src/renderer/src/stores/ai-chat/LangchainAgent-Config/knowledge-qa.ts`

**结论：新模型必须仿照 Knowledge-QA 的结构与链路。**

### 1. Store 层
在 `src/renderer/src/stores/ai-chat/` 下建立 store：

- `LangchainAgent-Config/<model>.ts`
- 保存默认配置 + update 方法

必须保证（对照 Knowledge-QA store）：

✅ **有完整默认值**（`config = ref<Config>({...})`）  
✅ **可 JSON 序列化**（避免 ref 直接透传 IPC）  
✅ **提供 update 方法**（如 updatePlanNode/updateGraph 等）  
✅ **持久化**（Pinia persist + localStorage）  

**Knowledge-QA 的持久化模板：**

```ts
export const useKnowledgeQaConfigStore = defineStore(
  'knowledge-qa-config',
  () => {
    const config = ref<KnowledgeQaModelConfig>({...})
    return { config, updatePlanNode, updateSummaryNode, ... }
  },
  {
    persist: {
      key: 'knowledge-qa-config',
      storage: localStorage
    }
  }
)
```

新增模型必须：
1. **在 store 中写 persist**  
2. **persist.key 用新模型名**（如 `'xxx-config'`）  
3. **storage 统一 localStorage**（保持一致）  

### 2. 配置页面
在 `LangchainModel-Config/` 中新增页面：

- `XxxModelConfig.vue`
- SVG 流程图
- 右侧 Drawer 交互

**页面结构必须参考 KnowledgeQaConfig.vue：**

- 左侧 SVG 流程图（节点可点击，打开右侧 Drawer）
- 右侧 Drawer（根据 activeNode 切换内容）
- 顶部“全局设置”按钮（Global Settings）

### 2.1 Drawer 的标准结构（参考 QA）

```vue
<template v-if="activeNode === 'plan'">...</template>
<template v-if="activeNode === 'summary'">...</template>
<template v-if="activeNode === 'global'">...</template>
```

建议：
- 至少保留 `global`（如 maxIterations）
- 如果存在结构节点，保留 instruction / constraint 的输入入口

### 3. 配置入口（弹窗容器）
`LangchainModel-Config/index.vue` 是**配置弹窗容器**。

当前 Knowledge-QA 只有一个配置页，因此直接渲染 `KnowledgeQaConfig`。

新增模型时需要：

1. 扩展容器，支持 `selected` 或 `type` 切换  
2. 或者增加 Tab / Selector 来选择不同配置页  

示例：

```vue
<XxxModelConfig v-if="selected === 'xxx'" />
```

### 4. 打开入口（LeftPanel → NormalChat）

Knowledge-QA 的入口链路：

```
LeftPanel 触发 open-config('knowledge-qa')
  ↓
NormalChat/index.vue 监听 open-config
  ↓
showConfigDialog = true
  ↓
LangchainModelConfig modal 显示
```

对应实现：

- `NormalChat/index.vue`
  - `handleOpenConfig(type: string)`
  - `if (type === 'knowledge-qa') showConfigDialog.value = true`
- `LangchainModel-Config/index.vue`
  - 弹窗容器

新增模型时必须补充：

✅ LeftPanel 发出 `open-config('xxx')`  
✅ NormalChat 识别 `'xxx'` 并打开弹窗  
✅ LangchainModel-Config 渲染新页面  

---

## 三、Main 层（配置解析与透传）

关键入口：
`src/main/services/ai-chat/ai-chat-service.ts`

### 1. Provider 解析
如果 model config 里引用了 providerId：

```ts
const provider = await resolveProviderConfig(providerId)
```

把 provider 注入到 config 中（保证 utility 可直接用）。

### 2. AgentCreateConfig 透传
必须把 model config 放入：

```ts
const agentCreateConfig = {
  modelConfig: {
    knowledgeQa: resolvedConfig
  }
}
```

否则 Utility 无法收到配置。

---

## 四、Utility 层（Graph 创建）

关键入口：
`src/utility/langchain-client/models/<model>/graph.ts`

### 1. 接收 config
```ts
const modelConfig = params.modelConfig?.knowledgeQa
```

必须判空，否则 throw。

### 2. Graph 逻辑
建议结构：

```
planning → execute-tools → summary → loop/END
```

注意：
- planning/summary 是结构节点
- tools 是 utils 节点

### 3. 注册工具节点
```ts
const registeredTools = [ ...utilRegistrations ]
```

### 4. emit 事件
每个节点必须 emit：
```
invoke:node-start
invoke:node-result
invoke:node-error
```

否则 UI 不显示节点。

---

## 五、消息渲染（Chat Message）

位置：
`ChatMain-Message/index.vue`

新增 nodeKind 后：
✅ 增加判断函数  
✅ 绑定对应组件  

例如：
```ts
block.start.nodeKind === 'planning'
```

如果 UI 没显示节点，第一步检查这里。

---

## 六、常见问题与排查

### 1. 配置改了但不生效
原因：
- agent 被缓存（按 conversationId）
解决：
- 重建 agent / 新建对话

### 2. UI 不显示节点
原因：
- nodeKind 未注册
- emit 未发送
解决：
- 检查 `LangchainClientNodeKind`
- 检查 emit 事件

### 3. JSON 解析错误
原因：
- LLM 输出格式不符合约束
解决：
- 强制 systemPromptConstraint
- parseJsonFromModel 容错

---

## Checklist（新增/修改 model 必做）

✅ Shared Types 新增 config  
✅ Renderer Store 默认值 + update  
✅ Renderer 配置面板 + SVG  
✅ Main 解析 provider 并透传  
✅ Utility Graph 完整实现  
✅ NodeKind 更新  
✅ ChatMain-Message 组件渲染  
✅ build / typecheck 通过  

---

## 最小闭环公式

> **配置能在 UI 编辑 → Main 透传 → Utility Graph 执行 → Message 渲染显示**
