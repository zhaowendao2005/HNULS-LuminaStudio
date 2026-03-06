# 来源扩展约定

## 目标

把 React 组件 / JSX / TSX 片段当成“来源格式”，而不是目标框架。

- 输入允许是 React
- 输出仍然固定为 `Vue SFC + Tailwind CSS`
- 任务域规则、样式边界、验收标准继续沿用本 skill 现有约定

## 适用输入

优先按本模块处理这些来源：

- `function Component() { return (...) }` 形式的 React 组件
- `const Component = () => (...)` 形式的 JSX / TSX 片段
- 带 `useState`、`useEffect`、`useMemo`、内联事件处理函数的 UI 组件
- 带 `lucide-react` 这类图标组件库、局部 mock 数据、列表编辑器、Tab 面板、模态框的中小型前端片段

## 执行顺序

1. 先把 `import`、`export default`、类型声明、React 组件壳层和 JSX 注释视为框架外壳。
2. 从 `return (...)` 和 JSX 分支中提取真实的界面骨架、状态切换点和交互锚点。
3. 只保留真正影响界面的状态、派生值和方法，再映射到 Vue `script setup`。
4. 把 JSX 写法改成 Vue 模板语法，不保留 React 专属运行时习惯。
5. 把第三方 React 依赖改成项目已有方案，或用中性占位表达其视觉和交互角色。

## React 到 Vue 的最小映射

| React 来源 | Vue 落点 |
|------|------|
| `className` | `class` |
| `onClick={fn}` | `@click="fn"` |
| `onChange={(e) => ...}` | `@change`、`@input` 或 `v-model`，按控件语义选择 |
| `{cond && <Block />}` | `v-if="cond"` |
| `{cond ? <A /> : <B />}` | `v-if / v-else` 或模板内条件表达式 |
| `{list.map((item) => (...) )}` | `v-for` |
| `useState` | `ref` / `reactive`，仅保留真实 UI 状态 |
| `useMemo` | `computed`，仅当确实存在重复派生值时保留 |
| `useEffect` | 只有确实承担生命周期副作用时才保留；纯同步衍生逻辑优先改回方法或 `computed` |
| React 图标组件 | 映射到项目已有图标组件，或保留为中性图标占位组件 |

## 状态裁剪规则

- 只保留影响界面的状态，不把每个 `useState` 都机械改成 `ref`。
- 只保留真正承载业务转换的辅助函数；纯粹为 React 写法服务的包装层直接删除。
- 允许把 `generateJsonSchema`、`parseJsonSchema` 这类数据转换逻辑原样迁移为普通函数。
- 不要把 `Date.now()`、演示用 `id` 生成、仅用于 React key 的细节误判成核心业务契约。
- 浏览器 API 只保留交互意图：例如复制、确认弹窗可以保留为 Vue 事件处理逻辑，但不要把 React 事件对象和包装函数一起照搬。

## 识别并删除的 React 噪音

默认删除这些内容，除非它们直接决定业务语义：

- `import React`、`useEffect`、`useMemo` 等未实际影响输出结构的导入
- `export default`
- 只为 TSX 书写服务的类型声明和泛型噪音
- `false`、`undefined`、`null` 分支拼出来的无效 class 或空节点
- 只为 demo 预览存在的包裹层、绝对定位舞台、浏览器调试注释

## 针对 `DifySchemaEditor` 这类 React 组件的处理提示

遇到类似你提供的 `DifySchemaEditor` 示例时，优先抽出这些稳定 UI 区块：

- 模态框外壳
- Header
- Tabs / Toolbar
- 可视化字段列表
- JSON 文本编辑区
- Footer 操作区

这类组件里，通常应该保留：

- `activeTab`
- `fields`
- `jsonText`
- `typeOptions`
- 与 Schema 转换直接相关的方法

这类组件里，通常不应原样保留：

- `lucide-react` 的具体导入语句
- React hooks 的书写形式
- 仅为 React 合成事件存在的 `e` 包装
- 只为临时 key 生成存在的实现细节

## 不要这样做

- 不要把 React 组件整体改写成 Vue JSX 或 `render()`，除非用户明确要求。
- 不要同时保留 React hooks 和 Vue `ref` / `computed` 两套状态表达。
- 不要因为来源里有可运行逻辑，就放弃对 DOM 结构和视觉骨架的忠实复刻。
- 不要把第三方 React 组件库当成必须一比一保留的实现约束；先保留视觉角色和交互角色。
