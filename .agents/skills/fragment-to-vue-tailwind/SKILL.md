---
name: fragment-to-vue-tailwind
description: 将 UI 原型片段精准转写为 Vue + Tailwind CSS。用于用户提供 Elements 导出的 HTML 片段、局部节点模板、面板模板，或 React 组件 / JSX / TSX 片段并要求统一改写成 Vue 时；适用于需要以 demo、截图、参考组件为视觉真值，忠实复刻结构、样式和氛围，且不允许未经确认的审美优化或风格化偏移的场景。
---

# Fragment To Vue Tailwind

## 目标

- 先忠实复刻片段的结构、层级、视觉和交互暗示，再做最低限度清理。
- 将 demo、截图、参考组件、来源 HTML / JSX 视为视觉真值；默认目标不是“做一个差不多的版本”，而是“做一个视觉等价的版本”。
- 在还原度达标前，视觉优先级高于工程化抽象、风格统一和主观审美优化。
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
3. 先标出本次片段不可偏移的视觉锚点：外轮廓、主次层级、关键尺寸、间距、圆角、边框、阴影、字号字重、颜色、图标、装饰物、状态差异。
4. 为本次转写定义一个任务域名称，并确定根节点定位类。
5. 按 Vue 模板重建 DOM，优先保留原始视觉骨架、空间关系和真实交互状态。
6. 优先把样式留在标签 `class` 上，用 Tailwind 表达。
7. 仅在 Tailwind 不适合时，补充域内局部样式，并始终挂在任务域根节点下。
8. 删除 React Flow、测试钩子、无效 `false/undefined` 类名、React 专属框架壳层等噪音，但不要误删任何可见视觉锚点。
9. 输出可继续演进的 Vue 组件，而不是一次性的静态拼图；前提是视觉还原度不能因为“顺手优化”而下降。

## 输出约束

- 根节点必须同时具备：
  - 业务定位类
  - 任务域类
- demo、截图、参考组件、来源片段是视觉裁决依据；未获得用户确认前，不要自行改动整体气质、设计语言或信息密度。
- 样式表达优先级必须是：
  - 标签 class 中的 Tailwind
  - 任务域内的局部公共类
  - 已存在且语义匹配的项目样式
- 若复用项目已有 token / utility class / 组件会导致颜色、间距、圆角、阴影、排版、图标比例、换行节奏或层次关系发生可见偏差，则不要复用，改为任务域内忠实表达。
- 不要新增无前缀的全局公共类。
- 不要把祖先容器的布局假设写死到组件内部。
- 不要为了“更 Vue”过早拆碎组件；先保证片段还原度。
- 不要因为“看起来更整洁”“更像项目现有页面”“更符合你的审美”而主动改动配色、字号、字重、边框、阴影、圆角、留白、文案换行、图标位置、装饰细节。
- 来源里出现的 hover、selected、active、disabled、empty、focus、error 等可见状态，如果对视觉有影响，必须在输出中保留对应的结构或表达。
- 接受 React 输入时，不要保留 React import / hooks / JSX 运行时写法；统一落到 `template + script setup + style scoped`。
- 如果确实因宿主环境、项目约束或缺失资源而无法完全等价，还原结果里必须明确指出偏差点和原因，不能默默改样式。

## 当前样例

以下样例可作为当前 skill 的触发提示和转写参照：

- `_Reference/Templete/条件分支节点-节点本体.html`
- `_Reference/Templete/条件分支节点-节点面板.html`
- `DifySchemaEditor` 这类带 `useState`、`lucide-react`、列表编辑、Tab 切换和 JSON 文本区的 React 组件

处理这类样例时，优先保留节点头部、内容区、条件区、面板分区、图标与状态层次，不要把 React Flow 外层运行时容器当成业务 DOM 一起搬运，也不要把它们顺手统一成“更常规”的项目卡片样式。
处理 React 组件样例时，优先抽出模态框骨架、工具栏、页签、表单列表、代码编辑区这些 UI 区块；只把真实影响界面的状态和方法映射到 Vue，不要机械照搬 React hooks、导入语句和第三方库包装层。
