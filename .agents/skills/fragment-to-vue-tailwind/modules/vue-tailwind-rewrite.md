# Vue + Tailwind 转写

## 1. 输出形式

默认输出一个可维护的 Vue SFC，而不是静态 HTML 搬运结果。这里的“可维护”建立在视觉等价成立的前提上，不允许为了代码更漂亮而先牺牲还原度。

优先组织为：

- `template`：保留结构和视觉骨架
- `script setup`：放最少但必要的状态、枚举、事件
- `style scoped`：只放任务域内无法优雅落到标签 class 的样式

## 2. 转写原则

### 先还原，再精简

- 先做一版接近原片段 DOM 层级的 Vue 模板。
- 确认视觉骨架成立后，再删冗余包裹层。

### 视觉等价优先

- 把来源片段的整体气质、信息密度和视觉重心当成硬约束，不主动做风格漂移。
- 如果某个 Tailwind 写法更“规范”，但会让尺寸、间距、圆角、阴影、颜色、排版出现肉眼可见偏差，则不要替换。
- 不要把参考组件重写成你更熟悉的卡片、弹窗、表单、按钮范式；先让它看起来像来源，而不是像你习惯的组件库。

### 标签类优先

- 大部分尺寸、边框、排版、颜色、间距直接写在标签 `class` 上。
- 只要 Tailwind 能清楚表达，就不要再写一层语义类。

### 不照抄运行时 DOM

- 不把 React Flow 容器、随机 id、测试属性一起抄进 Vue。
- 不把 `false`、`undefined`、`data-state="closed"` 之类 classnames 产物视为真实状态来源。

## 3. 当前样例的推荐拆法

### 条件分支节点本体

可优先拆成这些视觉区块：

- 根卡片
- 顶部标题区
- 节点操作栏
- IF 条件区
- ELSE 出口区
- 左右连接点

### 条件分支节点面板

可优先拆成这些视觉区块：

- 面板根容器
- 顶部标题与工具区
- 描述区
- 页签区
- 条件编辑列表
- ELIF / ELSE 区
- 底部“下一步”区

## 4. Vue 状态建模

只提炼真正影响 UI 的状态：

- `title`
- `description`
- `conditions`
- `selectedTab`
- `showActionBar`
- `readonly`

不要把来源片段里的每个 DOM 状态都机械转成响应式变量。
但也不要把会影响视觉差异的状态偷懒合并掉；只要某个状态会改变显隐、层级、颜色、边框、文案、图标或布局，就必须保留它的表达。

## 5. 建议骨架

```vue
<template>
  <section class="wf-ifelse-node-panel frag-ifelse-node-panel isolate flex flex-col rounded-2xl border border-components-panel-border bg-components-panel-bg shadow-lg">
    <header class="flex items-center px-4 pb-1 pt-4">
      ...
    </header>

    <div class="px-4 py-2">
      ...
    </div>
  </section>
</template>

<script setup lang="ts">
interface ConditionItem {
  id: string
  label: string
  value: string
}

defineProps<{
  title: string
  conditions: ConditionItem[]
}>()
</script>

<style scoped>
.frag-ifelse-node-panel :where(.frag-condition-rail) {
  @apply relative pl-[60px];
}
</style>
```

## 6. 验收标准

完成转写后，至少检查：

- 视觉主层级是否与来源片段一致。
- 外轮廓、关键尺寸、间距、圆角、边框、阴影是否等价，而不只是“接近”。
- 字号、字重、颜色、行高、文案换行和对齐节奏是否一致。
- 图标、装饰元素、状态标记的位置和比例是否一致。
- 标签 class 是否已经承担主要样式表达。
- 局部补充样式是否都被任务域根类收住。
- 去掉宿主运行时包裹后，组件是否仍然自洽。
- 若存在无法避免的偏差，是否已经明确列出偏差点、原因和影响。
