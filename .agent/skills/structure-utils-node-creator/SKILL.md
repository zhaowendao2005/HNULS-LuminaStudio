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
## 核心原则（必须牢记）
1. **结构节点 = 通用编排**  
   任何结构节点都不绑定具体工具，否则后续每加一个工具都要重写结构节点。
2. **工具节点 = 插件执行**  
   工具节点只做业务执行 + 输出 JSON，不参与“决策”。
3. **系统参数与用户参数严格分离**  
   - 系统参数：apiKey、apiBaseUrl、abortSignal（由 nodeFactory 注入）
   - 用户参数：query、retMax（由 LLM 规划）
4. **所有节点输出必须可 JSON 解析**  
   结构节点/工具节点输出必须是稳定 JSON 字符串，否则解析失败会导致流程断裂。

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
### 2. 输入/输出接口（必须清晰且通用）
### 2. 输出接口（必须清晰）
结构节点必须定义明确、**通用**的输入/输出。

例如 Planning 节点：

```ts
export interface PlanningOutput {
  rationale: string
  toolCalls: Array<{ toolId: string; params: Record<string, unknown> }>
}
```
> ⚠️ 当前 repo 中规划输出仍使用 `toolCalls + toolId`。  
> 如果要改名为 `nodeCalls + nodeId`，必须同步更新：
> - graph.ts（执行器匹配）
> - summary.node.ts（结果消费）
> - UI Message 组件（规划展示）
> - types.ts（ToolExecutionResult）

例如 Summary 节点：

```ts
export interface SummaryOutput {
  shouldLoop: boolean
  message: string
}
```
### 3. Prompt 设计原则（大坑点）
### 3. Prompt 管理（重要！必须从 `@prompt` 导入）

**所有节点提示词统一管理在 `src/Public/Prompt/`：**

#### 结构节点提示词位置：
```
src/Public/Prompt/planning.node.prompt.ts     ← Planning 节点
src/Public/Prompt/summary.node.prompt.ts      ← Summary 节点
```

#### 工具节点 descriptor 位置：
```
src/Public/Prompt/knowledge-retrieval.node.prompt.ts  ← Knowledge descriptor
src/Public/Prompt/pubmed-search.node.prompt.ts        ← PubMed descriptor
```

#### 节点实现引用方式：
```ts
// 结构节点导入默认提示词
import { PLANNING_NODE_INSTRUCTION, getPlanningNodeConstraint } from '@prompt/planning.node.prompt'

// 在 node 实现中使用
const instruction = params.systemPromptInstruction ?? PLANNING_NODE_INSTRUCTION
const constraint = params.systemPromptConstraint ?? getPlanningNodeConstraint(maxToolCalls)
```

```ts
// 工具节点导入 descriptor
import { KNOWLEDGE_RETRIEVAL_DESCRIPTOR } from '@prompt/knowledge-retrieval.node.prompt'

export const knowledgeRetrievalReg: UtilNodeRegistration = {
  descriptor: KNOWLEDGE_RETRIEVAL_DESCRIPTOR,
  nodeFactory: ...
}
```

#### Prompt 结构设计：
- **Instruction**：业务逻辑提示（可安全修改，控制 LLM 思考方向）
- **Constraint**：格式约束提示（谨慎修改，与节点解析逻辑强绑定）

⚠️ **坑点/教训**：
- 不写 JSON 约束 → LLM 输出自然语言 → 解析失败 → 整条链路崩
- 在 prompt 里写死某个工具 → 结构节点和工具耦合 → 每次加工具都要改结构节点
- **直接在 node 代码里硬编码 prompt** → UI 默认值与节点默认值不一致 → 用户困惑

### 4. JSON 解析与容错（必须实现）
建议统一使用 `parseJsonFromModel`：

```ts
const fence = trimmed.match(/```json\\s*([\\s\\S]*?)\\s*```/i)
```

**必须支持三种情况：**
1. 纯 JSON
2. ```json code fence
3. 混杂文本

⚠️ **坑点**：如果解析失败且不兜底，会直接导致图中断。

### 5. Summary 节点的证据摘要（避免上下文爆炸）
当工具返回大段文本时，必须做 evidence digest：
- 只保留前 N 条
- 只保留前 M 字符
- 保留结构化字段（title/abstract/score）

⚠️ **教训**：未压缩会导致 prompt 超长 → LLM 调用失败或费用暴涨。

### 6. 回环逻辑（防死循环）
结构节点必须配合 graph 控制迭代：
- `shouldLoop=true` → 继续
- 达到 `maxIterations` → 强制结束

⚠️ **坑点**：没有上限 → 无限循环 → UI 卡死。

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
### 2. 系统参数 vs 用户参数（关键）
**必须分层：**

```ts
export interface SystemParams { apiKey?: string; abortSignal?: AbortSignal }
export interface UserParams { query: string; retMax?: number }
```

系统参数只能由 `nodeFactory` 注入，**不能让 LLM 生成**。

⚠️ **坑点**：把 apiKey 放进 LLM 输入 → 泄露密钥。

### 3. 实现 run()（返回 JSON 字符串）
### 2. 实现 run()（返回 JSON 字符串）
工具节点应只做业务逻辑，返回 JSON 字符串：

```ts
export async function runXxx(params: XxxParams): Promise<string> {
  // 实际执行逻辑
  return JSON.stringify(result)
}
```
### 4. 写 descriptor（给 LLM 看）——必须放在 `@prompt`

**新建文件**：`src/Public/Prompt/<tool-name>.node.prompt.ts`

```ts
import type { UtilNodeDescriptor } from './knowledge-retrieval.node.prompt'

export const PUBMED_SEARCH_DESCRIPTOR: UtilNodeDescriptor = {
  id: 'pubmed_search',
  name: 'PubMed 文献检索',
  description: '从 NCBI PubMed 数据库检索生物医学文献...',
  inputDescription: 'query: 检索词; retMax: 返回数量',
  outputDescription: 'JSON: { items: [...], total_found }'
}
```

**在工具节点注册中引用**：
```ts
import { PUBMED_SEARCH_DESCRIPTOR } from '@prompt/pubmed-search.node.prompt'

export const pubmedSearchReg: UtilNodeRegistration = {
  descriptor: PUBMED_SEARCH_DESCRIPTOR,  // 从 @prompt 导入
  nodeFactory: ...
}
```
### 5. 注册到 index.ts（nodeFactory）
**必须通过 nodeFactory 注入系统参数**，用户参数由 LLM 提供。

```ts
import { PUBMED_SEARCH_DESCRIPTOR } from '@prompt/pubmed-search.node.prompt'

export const pubmedSearchReg: UtilNodeRegistration = {
  descriptor: PUBMED_SEARCH_DESCRIPTOR,
  nodeFactory: (systemParams) => ({
    run: async (userParams) => runPubmedSearch({ ...systemParams, ...userParams })
  })
}
```
### 6. 速率限制/重试/超时（强烈建议）
- PubMed 这类 API 要区分是否有 apiKey（3/s vs 10/s）
- 超时必须设置（避免卡住）
- 对网络错误做轻量重试（最多 1-2 次）

⚠️ **坑点**：没有限流 → 瞬间被封 IP。

### 7. 输出结构稳定性
工具输出一定要包含：
- status / error / items 等稳定字段
- 即使失败也要返回结构化 JSON（而不是 throw）

⚠️ **教训**：工具抛错会导致 summary 解析不到结果 → LLM 判断失真。

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
### 额外提示
如果 UI 不显示节点，请依次检查：
1. graph.ts 是否 emit 了 `invoke:node-start/result`
2. nodeKind 是否注册在 `LangchainClientNodeKind`
3. Message 组件是否匹配该 nodeKind

---

## Checklist（必须逐项确认）

✅ 新建目录 `nodes/structure-xxx` 或 `nodes/utils-xxx`  
✅ **提示词/descriptor 放在 `src/Public/Prompt/*.node.prompt.ts`**  
✅ **节点代码从 `@prompt` 导入默认值**  
✅ `run()` 返回 JSON 字符串  
✅ descriptor 字段完整  
✅ nodeFactory 正确注入系统参数  
✅ Graph 注册 + toolCalls 执行  
✅ `LangchainClientNodeKind` 更新  
✅ UI Message 组件支持新 nodeKind  
✅ build 成功（无 TS / Vue 错误）

---
## 高频坑点 / 教训总结（务必阅读）
## 常见错误

1. **结构节点调用具体工具** → 彻底破坏解耦  
2. **descriptor 太短/不清晰** → LLM 无法正确选工具  
3. **toolCalls 输出格式变化未同步** → graph 直接崩  
4. **nodeFactory 不注入系统参数** → API Key/baseUrl 丢失  
5. **nodeKind 未注册** → UI 无节点显示  
6. **工具输出非 JSON** → summary 解析失败  
7. **缺少 evidence digest** → prompt 爆炸/超长失败  
8. **无迭代上限** → 无限 loop  
9. **把 apiKey 放在 userParams** → 密钥泄露  

---

## 最小执行范式（总结）

> **工具节点 = 执行业务 + descriptor + nodeFactory**  
> **结构节点 = 规划/总结 + 通用输入输出**  
> **Graph = 注册工具 + 调用结构节点 + 执行工具**
