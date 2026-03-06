# OrchestraFlow 变量系统扩展

> 本模块只关注 `OrchestraFlow` 系统里的变量定义、变量运行时流转、变量选择器和扩展约束。
> 目标不是记录一份易过时的实现快照，而是让 AI 在扩展变量系统时知道应该先看哪里、改哪些层、哪些地方最容易改错。

## 一、先记住这套系统的四层

扩展变量系统时，不要只盯某一个节点文件。当前系统至少有四层需要一起看：

1. **共享类型层**
   - 路径：`src/Public/ShareTypes/Orchestraflow-types/index.ts`
   - 职责：定义变量 schema、节点 input/output schema、节点数据结构
2. **运行时存储层**
   - 路径：`src/utility/orchestraflow/services/variable-store.ts`
   - 职责：变量的 set/get/getBySelector
3. **节点执行层**
   - 路径：`src/utility/orchestraflow/nodes/*.ts`
   - 职责：什么时候写变量、什么时候读变量
4. **前端编辑器层**
   - 路径：`src/renderer/src/stores/orchestraflow/workflow-editor/variable-selector/*`
   - 职责：哪些变量能被选中、如何展示给用户

如果只改其中一层，变量系统通常会出现“类型加了但 UI 看不到”“UI 能选但运行时读不到”“End 节点 selector 正常但中间节点插值不支持”等问题。

---

## 二、变量定义的单一事实来源

变量定义的权威来源是：

- `src/Public/ShareTypes/Orchestraflow-types/index.ts`

关键类型：

- `OFVarType`
- `OFVariable`
- `OFNodeInput`
- `OFNodeOutput`

当前写法核心是：

```ts
export enum OFVarType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Object = 'object',
  Array = 'array'
}

export interface OFVariable {
  variable: string
  label?: string
  type?: OFVarType
  description?: string
  required?: boolean
  default?: string | number | boolean | object | any[]
  options?: string[]
  value_selector?: string[]
}
```

理解要点：

- `variable` 是运行时 key，也是跨节点传递的名字
- `label` 主要给前端展示
- `type` 主要给前端渲染和部分运行时处理
- `default` 主要由 Start 节点读取
- `value_selector` 主要由 End 节点和变量选择器使用

---

## 三、变量是怎么流转的

### 1. Start 节点负责把输入写进变量池

文件：

- `src/utility/orchestraflow/nodes/start-node.ts`

当前逻辑：

- 遍历 `input.variables`
- 从 `context.inputs[v.variable]` 取值
- 没传则回落到 `v.default`
- 再写入 `VariableStore`

结论：

- Start 节点是工作流输入变量进入运行时上下文的入口

### 2. 中间节点负责消费变量并产出新变量

当前最典型的是：

- `src/utility/orchestraflow/nodes/llm-node.ts`

这里有两种变量读取方式：

- prompt 模板中的 `{{variable_name}}`，通过 `variableStore.get(varName)` 替换
- 运行上下文 `context.inputs`，用于兜底或直接输入

输出方式：

- 遍历 `output.variables`
- 逐个 `setOutput(varName, value)` 写入 `VariableStore`

结论：

- 只要一个节点要向下游暴露变量，最终都要写进 `VariableStore`

### 3. End 节点负责按 selector 取最终结果

文件：

- `src/utility/orchestraflow/nodes/end-node.ts`

当前逻辑：

- 遍历 `output.variables`
- 如果配置了 `value_selector`，按 selector 取值
- 否则默认按 `[v.variable]` 取值

结论：

- End 节点本质上不是重新生成变量，而是从已有变量池里做一次“结果映射”

---

## 四、当前 selector 机制的真实语义

运行时 selector 解析在：

- `src/utility/orchestraflow/services/variable-store.ts`

虽然注释写了：

- `['nodeId', 'outputKey']`

但按当前实现，真正语义是：

- 第一个元素是 `VariableStore` 的 key
- 后续元素是对象路径

也就是更接近：

```ts
['summary']
['profile', 'name']
['result', 'items', '0']
```

而不是严格意义上的：

```ts
['nodeId', 'field']
```

这点非常重要，因为它决定了扩展时不能误以为系统已经有“node 级命名空间”。

---

## 五、前端变量选择器是怎么构建可选变量的

变量选择器在：

- `src/renderer/src/stores/orchestraflow/workflow-editor/variable-selector/variable-selector.store.ts`

当前策略：

1. 从目标节点反向遍历边，找到所有上游节点
2. 从上游节点里提取“可引用变量”
3. Start 节点提取 `input.variables`
4. 其它节点提取 `output.variables`
5. 若变量自身没有 `value_selector`，前端默认用 `[variable]`

结论：

- 前端“能选到什么变量”不是运行时自动推导出来的，而是变量选择器单独算出来的
- 因此变量 schema 一旦变化，变量选择器通常也要同步改

---

## 六、扩展变量系统时应遵循的顺序

如果你要给 OrchestraFlow 扩展新的变量能力，建议严格按下面顺序推进：

### 场景 1：只扩展变量元数据

例如新增：

- `placeholder`
- `ui_type`
- `schema`
- `allow_multiple`

顺序：

1. 先改 `OFVariable`
2. 再改对应节点配置 UI
3. 再改变量选择器展示逻辑
4. 如果运行时需要依赖这个字段，再改节点执行逻辑

### 场景 2：新增变量类型

例如新增：

- `json`
- `image`
- `file`

顺序：

1. 先扩展 `OFVarType`
2. 检查各节点的变量编辑表单是否支持该类型
3. 检查 `LLMNode` 或其它中间节点输出时是否真正按该类型处理
4. 检查 `EndNode` / selector / 调试输出是否仍能正确展示

### 场景 3：增强 selector 机制

例如想支持：

- 节点命名空间
- 更深层对象路径
- 数组索引
- 表达式求值

顺序：

1. 先定义 selector 的统一语义
2. 再改 `VariableStore.getBySelector()`
3. 再改前端变量选择器生成规则
4. 再改 End 节点和其它消费 selector 的节点
5. 最后补文档，防止前后端对 selector 的理解不一致

---

## 七、当前最容易踩的坑

### 1. 同名变量覆盖

当前 `VariableStore` 是：

- `Map<string, any>`

所以不同节点如果都输出 `result`，后写入的会覆盖先写入的。

如果要支持真正稳定的跨节点引用，后续可能要考虑：

- key 带节点命名空间
- 或者按 `Map<nodeId, Record<varName, any>>` 存

### 2. selector 注释与实现不一致

注释接近“按 nodeId 取”，实现实际是“按变量 key + 对象路径取”。

扩展时必须先统一语义，再写功能，否则：

- 前端生成一套 selector
- 后端按另一套方式解析

最后一定出错。

### 3. `LLMNode` 对复杂类型支持并不完整

当前 `object` / `array` 分支只是把文本内容原样塞回去，并没有真正做结构化解析。

所以：

- 新增变量类型时，不能只改枚举
- 还要确认中间节点是否真的按该类型产出值

### 4. prompt 插值和 selector 是两套机制

当前 `{{var}}` 插值走的是：

- `variableStore.get(varName)`

不是 `getBySelector()`

所以：

- 你即使增强了 `value_selector`
- prompt 模板也不会自动获得同样能力

### 5. 前端可选变量与运行时变量不是同一套代码

变量选择器是前端单独算的。

因此：

- 运行时支持了某种新变量结构
- 不代表前端能自动展示出来

---

## 八、推荐的最小改动原则

在不大改架构的前提下，优先采用下面策略：

1. 保持 `OFVariable` 仍然是统一 schema 入口
2. 保持 `VariableStore` 仍然是唯一运行时变量池
3. 保持节点自己决定“何时读变量、何时写变量”
4. 保持变量选择器只负责“展示可引用变量”，不把运行时逻辑搬到前端

也就是说，尽量是在现有四层里补强，不要一上来重写整个变量系统。

---

## 九、扩展前自检清单

动手前至少确认：

1. 我改的是变量 schema、运行时存储、节点执行逻辑，还是前端选择器？
2. 我这次改动是否需要四层一起同步？
3. 新字段是不是只在 UI 生效，还是运行时也要依赖？
4. 新类型是不是只有枚举，还是节点真的会按该类型处理？
5. selector 的语义前后端是不是一致？
6. 有没有同名变量覆盖风险？
7. prompt 插值逻辑是否也要同步扩展？

---

## 十、建议输出方式

以后如果 AI 要解释 OrchestraFlow 变量系统，建议按这个顺序：

1. 先说共享类型定义在哪里
2. 再说变量运行时怎么流转
3. 再说前端变量选择器怎么构建
4. 最后说扩展时要同步哪些层，以及当前有哪些坑
