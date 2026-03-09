# OrchestraFlow Definition / Variable System

> 本模块关注的是 `OrchestraFlow` 现在的 definition/registry 驱动结构，而不再把旧 helper / descriptor 入口当成主阅读路径。
> 目标是让 AI 在改 shared contract、AI schema、变量流转、变量选择器时，能先找到真正的处理层和单一事实来源。

## 一、先记住这套系统的五层

当前 OrchestraFlow 至少有五层要一起看：

1. **共享契约层**
   - 路径：`src/Public/ShareTypes/Orchestraflow-types/index.ts`
   - 职责：稳定 barrel 入口，向外导出 runnable types、definition API、authoring contract、registry helpers
2. **definition / registry 层**
   - 路径：
     - `src/Public/ShareTypes/Orchestraflow-types/node-definition.ts`
     - `src/Public/ShareTypes/Orchestraflow-types/node-definition-registry.ts`
     - `src/Public/ShareTypes/Orchestraflow-types/builtins/*.definition.ts`
   - 职责：定义 built-in 节点的 meta、defaults、variables、authoring metadata、runtime binding
3. **运行时层**
   - 路径：
     - `src/utility/orchestraflow/services/variable-store.ts`
     - `src/utility/orchestraflow/nodes/*.ts`
     - `src/utility/orchestraflow/nodes/node-factory.ts`
   - 职责：变量读写、selector 解析、节点执行
4. **AI schema 层**
   - 路径：`src/utility/orchestraflow/ai-schema/*`
   - 职责：从 shared definitions + authoring metadata 导出 AI-facing runnable workflow contract
5. **前端编辑器层**
   - 路径：`src/renderer/src/stores/orchestraflow/workflow-editor/*`
   - 职责：节点默认值、normalize、node config、变量选择器、编辑器态派生

如果只改其中一层，很容易出现“shared type 改了但 editor 没收口”“AI schema 还是旧规则”“运行时能跑但 selector 不可选”的问题。

---

## 二、单一事实来源已经从“零散 helper”切到 shared definitions

优先看这些文件：

- `src/Public/ShareTypes/Orchestraflow-types/index.ts`
- `src/Public/ShareTypes/Orchestraflow-types/core-types.ts`
- `src/Public/ShareTypes/Orchestraflow-types/node-definition.ts`
- `src/Public/ShareTypes/Orchestraflow-types/node-definition-registry.ts`
- `src/Public/ShareTypes/Orchestraflow-types/variable-definition.ts`

当前规则：

- `@shared/Orchestraflow-types` 是外部消费者的稳定入口
- `resolveOFNodeDefinition()` / `listOFNodeDefinitions()` 是标准读取入口
- built-in 节点拆在 `builtins/*.definition.ts`
- editor、AI schema、runtime binding 都应该消费 shared definitions，而不是各自维护一套业务分支

---

## 三、变量与节点规则现在怎么落地

### 1. Start / built-in definitions 负责定义变量入口与默认值

优先看：

- `src/Public/ShareTypes/Orchestraflow-types/builtins/start.definition.ts`
- `src/Public/ShareTypes/Orchestraflow-types/builtins/iteration.definition.ts`
- `src/Public/ShareTypes/Orchestraflow-types/builtins/loop.definition.ts`

这些 definition 文件现在承担：

- 节点 meta
- 默认 data shape
- 可见变量规则
- authoring metadata
- selector / output / omit 策略

### 2. Runtime 负责执行，不再充当 schema 权威

优先看：

- `src/utility/orchestraflow/nodes/start-node.ts`
- `src/utility/orchestraflow/nodes/llm-node.ts`
- `src/utility/orchestraflow/nodes/node-factory.ts`
- `src/utility/orchestraflow/services/variable-store.ts`

运行时仍负责：

- Start 把输入写进变量池
- 中间节点消费 selector 或变量值后产出新变量
- End 做最终输出映射

但“哪些字段存在、哪些字段系统托管、哪些字段应省略”这类约束，优先来源已经是 shared definitions。

### 3. AI schema builder 已开始 definition-driven

优先看：

- `src/utility/orchestraflow/ai-schema/builder.ts`
- `src/utility/orchestraflow/ai-schema/registry.ts`
- `src/utility/orchestraflow/ai-schema/runtime-binding-registry.ts`

当前状态：

- `prompt_markdown` / `annotated_workflow_jsonc` 已从 definition authoring metadata 渲染关键规则
- `compiler.ts` 仍是内部辅助生成器
- bundle 还没做到完全零硬编码，example scaffold 仍有少量手写逻辑

### 4. Renderer variable selector 现在按 definition 提供变量

优先看：

- `src/renderer/src/stores/orchestraflow/workflow-editor/workflow-editor.store.ts`
- `src/renderer/src/stores/orchestraflow/workflow-editor/variable-selector/variable-selector.store.ts`

当前规则：

- editor 的 addNode / normalize 走 shared definition 默认值
- variable selector 通过 `definition.variables.getSelectableVariables` 收口可选变量
- node config store 负责把 `NodeData` 显式转换成具体 config 结构

---

## 四、selector 的真实语义仍然要先核对 runtime

selector 的最终解释权仍在：

- `src/utility/orchestraflow/services/variable-store.ts`

当前应理解为：

- 第一个 segment 是变量池 key
- 后续 segment 是对象路径

所以扩展 selector 时，仍然要同步检查：

1. shared definition 的 selector policy
2. runtime `getBySelector()` 语义
3. renderer variable selector 生成逻辑
4. AI schema builder 的文档描述

---

## 五、推荐阅读顺序

如果任务落在 OrchestraFlow，建议按这个顺序打开：

1. `src/Public/ShareTypes/Orchestraflow-types/index.ts`
2. `src/Public/ShareTypes/Orchestraflow-types/node-definition-registry.ts`
3. `src/Public/ShareTypes/Orchestraflow-types/builtins/start.definition.ts`
4. `src/Public/ShareTypes/Orchestraflow-types/builtins/iteration.definition.ts`
5. `src/Public/ShareTypes/Orchestraflow-types/builtins/loop.definition.ts`
6. `src/utility/orchestraflow/ai-schema/builder.ts`
7. `src/renderer/src/stores/orchestraflow/workflow-editor/workflow-editor.store.ts`
8. `src/renderer/src/stores/orchestraflow/workflow-editor/variable-selector/variable-selector.store.ts`

---

## 六、最容易踩的坑

### 1. 重新在调用层手写业务规则

常见坏味道：

- renderer store 自己写节点 type 分支
- AI schema 再维护一份独立 descriptor
- runtime 节点之外的地方手动拼 derived fields

优先做法：

- 先补 shared definition
- 再让调用层消费 definition

### 2. 绕过 barrel 入口做 deep import

外部消费者应该优先从：

- `@shared/Orchestraflow-types`

获取公开 API。否则容易把私有实现路径固化到别的层。

### 3. 只改变量结构，不改 selector / AI schema / editor

变量结构变化至少要检查：

1. shared definitions
2. runtime variable store
3. AI schema builder
4. renderer variable selector

### 4. 把 lint 规则当成收尾装饰

现在已经有 OrchestraFlow 定向规则：

- `pnpm lint:orchestraflow`

这不是可选装饰，而是用来防止 legacy entrypoint、deep import、调用层手写业务分支回流的。

---

## 七、扩展时的最小顺序

### 场景 1：新增或修改 built-in 节点字段

1. 先改 `builtins/*.definition.ts`
2. 再检查 shared barrel 是否需要补导出
3. 再看 editor / AI schema / runtime 是否只需消费新 metadata
4. 最后跑 `pnpm lint:orchestraflow`

### 场景 2：增强变量能力

1. 先改 shared variable / definition contracts
2. 再核对 `variable-store.ts`
3. 再核对 `variable-selector.store.ts`
4. 再核对 AI schema 文档输出

### 场景 3：处理旧入口迁移

1. 先确认能否直接改成 `@shared/Orchestraflow-types`
2. 再看是否命中了本地 ESLint 规则
3. 不要新增新的 legacy helper 作为过渡常态

---

## 八、建议输出方式

以后如果 AI 要解释 OrchestraFlow，建议按这个顺序：

1. 先说 shared barrel 和 definition registry 在哪里
2. 再说 built-in definition 如何描述节点规则
3. 再说 runtime / AI schema / renderer 分别怎么消费这些定义
4. 最后说扩展时要同步哪些层，以及该跑哪些检查
