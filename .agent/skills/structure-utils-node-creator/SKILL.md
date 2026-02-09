---
name: structure-utils-node-creator
description: Create new nodes with the Structure/Utils split in LuminaStudio, including descriptors, registration, graph wiring, message rendering, and prompt/IO design.
---
## 目标
本 Skill 用于**详细指导**如何在 LuminaStudio 中新增一个节点，且**严格区分**两类节点：

- **Structure Node（结构节点）**：通用编排逻辑（planning/summary 类），不绑定具体工具。
- **Utils Node（工具节点）**：插件化工具（knowledge/pubmed 类），通过 descriptor 自描述。

强调：**结构节点不要感知工具节点**，只消费 descriptor 与通用结果格式；工具节点只负责“执行 + 返回 JSON 字符串”。

---

## 目录结构与职责

```
src/utility/langchain-client/nodes/
  structure-*/        # 结构节点（planning/summary 等）
  utils-*/            # 工具节点（knowledge/pubmed 等）
  types.ts            # descriptor / registration / execution result 类型
```

核心文件：

- `nodes/types.ts`
  - `UtilNodeDescriptor`
  - `UtilNodeRegistration`
  - `ToolExecutionResult`
- `nodes/structure-*/`
  - 结构节点实现：`runPlanning` / `runSummary` 等
- `nodes/utils-*/`
  - 工具节点实现 + 注册：`index.ts`
- `models/*/graph.ts`
  - Graph 组装：注册工具、调用结构节点、执行工具

---

## 结构节点（Structure Node）创建指南

### 1. 选择目录
新结构节点统一放在：
```
src/utility/langchain-client/nodes/structure-<name>/
```

### 2. 输出接口（必须清晰）
结构节点必须定义明确、**通用**的输入/输出。

例如 Planning 节点：

```ts
export interface PlanningOutput {
  rationale: string
  toolCalls: Array<{ toolId: string; params: Record<string, unknown> }>
}
```

例如 Summary 节点：

```ts
export interface SummaryOutput {
  shouldLoop: boolean
  message: string
}
```

### 3. Prompt 设计原则
- **Instruction**：说明节点职责
- **Constraint**：强制 JSON 输出格式
- **不要硬编码具体工具名**（保持通用）

### 4. 结构节点职责边界（必须遵守）
- ✅ 负责：LLM 调用、JSON 解析、错误兜底
- ✅ 负责：通用输入输出（toolCalls / shouldLoop）
- ❌ 禁止：直接调用工具节点
- ❌ 禁止：耦合 knowledge/pubmed 等具体工具

---

## 工具节点（Utils Node）创建指南

### 1. 选择目录
```
src/utility/langchain-client/nodes/utils-<name>/
```

### 2. 实现 run()（返回 JSON 字符串）
工具节点应只做业务逻辑，返回 JSON 字符串：

```ts
export async function runXxx(params: XxxParams): Promise<string> {
  // 实际执行逻辑
  return JSON.stringify(result)
}
```

### 3. 写 descriptor（给 LLM 看）
descriptor 必须包含：
- id（nodeKind）
- name（人类可读名）
- description（详细用途）
- inputDescription（输入参数说明）
- outputDescription（输出格式说明）

示例：

```ts
descriptor: {
  id: 'pubmed_search',
  name: 'PubMed 文献检索',
  description: '...',
  inputDescription: 'query: 检索词; retMax: 返回数量',
  outputDescription: 'JSON: { items: [...], total_found }'
}
```

### 4. 注册到 index.ts（nodeFactory）
**必须通过 nodeFactory 注入系统参数**，用户参数由 LLM 提供。

```ts
export const pubmedSearchReg: UtilNodeRegistration = {
  descriptor: { ... },
  nodeFactory: (systemParams) => ({
    run: async (userParams) => runPubmedSearch({ ...systemParams, ...userParams })
  })
}
```

---

## Graph 中的集成步骤（重要）

### 1. 注册工具节点
在 `models/<model>/graph.ts` 中：

```ts
const registeredTools = [
  {
    ...knowledgeRetrievalReg,
    nodeFactory: (systemParams) =>
      knowledgeRetrievalReg.nodeFactory({ ...系统参数... })
  },
  {
    ...pubmedSearchReg,
    nodeFactory: (systemParams) =>
      pubmedSearchReg.nodeFactory({ ...系统参数... })
  }
]
```

### 2. Planning 传入 descriptor
```ts
runPlanning({
  availableTools: registeredTools.map((r) => r.descriptor),
  ...
})
```

### 3. 工具执行器
遍历 `toolCalls`，根据 `toolId` 查找注册表并执行：

```ts
const reg = registeredTools.find((r) => r.descriptor.id === call.toolId)
const node = reg.nodeFactory({ abortSignal })
const resultText = await node.run(call.params)
```

### 4. Summary 消费 ToolExecutionResult[]
```ts
runSummary({ results: toolResults })
```

---

## UI / Message List 对接要点

新增节点后，消息列表需要能显示：

1. 新节点 nodeKind 必须在 `LangchainClientNodeKind` union 中注册
2. `ChatMain-Message/index.vue` 中需要增加 nodeKind 判断与组件渲染

例如：
```ts
block?.start?.nodeKind === 'pubmed_search'
```

---

## Checklist（必须逐项确认）

✅ 新建目录 `nodes/structure-xxx` 或 `nodes/utils-xxx`  
✅ `run()` 返回 JSON 字符串  
✅ descriptor 字段完整  
✅ nodeFactory 正确注入系统参数  
✅ Graph 注册 + toolCalls 执行  
✅ `LangchainClientNodeKind` 更新  
✅ UI Message 组件支持新 nodeKind  
✅ build 成功（无 TS / Vue 错误）  

---

## 常见错误

1. **结构节点直接调用工具** → 破坏解耦
2. **descriptor 缺字段** → LLM 无法理解工具用途
3. **toolCalls 格式不规范** → graph 无法执行
4. **nodeFactory 未注入系统参数** → API Key / baseUrl 丢失
5. **nodeKind 未注册** → UI 不显示节点

---

## 最小执行范式（总结）

> **工具节点 = 执行业务 + descriptor + nodeFactory**  
> **结构节点 = 规划/总结 + 通用输入输出**  
> **Graph = 注册工具 + 调用结构节点 + 执行工具**
