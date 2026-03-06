---
name: fragment-to-vue-tailwind
description: 将 UI 原型片段精准转写为 Vue + Tailwind CSS。用于用户提供 Elements 导出的 HTML 片段、局部节点模板、面板模板，或 React 组件 / JSX / TSX 片段并要求统一改写成 Vue 时；适用于需要尽量原汁原味复刻结构和视觉、优先使用标签 class 表达样式、并把补充样式严格收敛在单个任务域内以降低上级或全局样式干扰的场景。
---

# Fragment To Vue Tailwind

## 目标

- 先忠实复刻片段的结构、层级、视觉和交互暗示，再做最低限度清理。
- 始终输出 `Vue SFC + Tailwind CSS`，不要切换目标框架。
- 将一次转写定义为一个“任务域”，把新增样式限制在该域根节点之下。
- 允许复用项目已有 token / utility class，但不要依赖不可控的祖先样式才能成立。

## 模块索引

| 模块 | 文件 | 何时阅读 |
|------|------|----------|
| 来源片段规整 | `modules/source-fragment-normalization.md` | 拿到 Elements HTML、节点截图导出的 DOM、React 组件 / JSX / TSX 时 |
| 任务域与样式边界 | `modules/task-domain-scope.md` | 需要定义根类、局部公共样式、隔离全局影响时 |
| Vue + Tailwind 转写 | `modules/vue-tailwind-rewrite.md` | 开始把片段改成 Vue SFC 时 |
| 来源扩展约定 | `modules/source-extension.md` | 来源是 React 组件 / JSX / TSX，或需要判断哪些 React 逻辑该保留到 Vue 时 |

## 默认执行顺序

1. 先判断来源是静态片段还是 React 组件；如果是 React，先阅读 `modules/source-extension.md`。
2. 阅读来源片段，拆出“真实业务结构”和“运行时噪音”。
3. 为本次转写定义一个任务域名称，并确定根节点定位类。
4. 按 Vue 模板重建 DOM，优先保留原始视觉骨架、空间关系和真实交互状态。
5. 优先把样式留在标签 `class` 上，用 Tailwind 表达。
6. 仅在 Tailwind 不适合时，补充域内局部样式，并始终挂在任务域根节点下。
7. 删除 React Flow、测试钩子、无效 `false/undefined` 类名、React 专属框架壳层等噪音。
8. 输出可继续演进的 Vue 组件，而不是一次性的静态拼图。

## 输出约束

- 根节点必须同时具备：
  - 业务定位类
  - 任务域类
- 样式表达优先级必须是：
  - 标签 class 中的 Tailwind
  - 任务域内的局部公共类
  - 已存在且语义匹配的项目样式
- 不要新增无前缀的全局公共类。
- 不要把祖先容器的布局假设写死到组件内部。
- 不要为了“更 Vue”过早拆碎组件；先保证片段还原度。
- 接受 React 输入时，不要保留 React import / hooks / JSX 运行时写法；统一落到 `template + script setup + style scoped`。

## 当前样例

以下样例可作为当前 skill 的触发提示和转写参照：

- `_Reference/Templete/条件分支节点-节点本体.html`
- `_Reference/Templete/条件分支节点-节点面板.html`
- `DifySchemaEditor` 这类带 `useState`、`lucide-react`、列表编辑、Tab 切换和 JSON 文本区的 React 组件

处理这类样例时，优先保留节点头部、内容区、条件区、面板分区、图标与状态层次，不要把 React Flow 外层运行时容器当成业务 DOM 一起搬运。
处理 React 组件样例时，优先抽出模态框骨架、工具栏、页签、表单列表、代码编辑区这些 UI 区块；只把真实影响界面的状态和方法映射到 Vue，不要机械照搬 React hooks、导入语句和第三方库包装层。
