# LuminaStudio 设置指南

## 安装依赖

项目使用 Tailwind CSS v4（已安装）。

### 1. 安装所有依赖

```bash
cd LuminaStudio
pnpm install
```

### 2. 启动开发服务器

```bash
pnpm dev
```

### 3. 构建生产版本

```bash
pnpm build
```

## Tailwind CSS v4 说明

项目使用最新的 Tailwind CSS v4，配置方式已简化：

- ✅ 不再需要 `tailwind.config.js`
- ✅ 不再需要 `postcss.config.js`
- ✅ 只需在 CSS 中使用 `@import "tailwindcss"`

## 项目结构

```
src/renderer/src/
├── views/
│   └── LuminaApp/              # 主应用
│       ├── index.vue           # 应用入口
│       ├── WelcomeScreen/      # 欢迎页
│       ├── Sidebar/            # 侧边栏
│       ├── TopBar/             # 顶部栏
│       ├── DashboardView/      # 仪表盘视图
│       ├── ReaderView/         # 阅读器视图
│       ├── GraphView/          # 图谱视图
│       └── components/         # 视图共享组件
├── components/                 # 全局通用组件（待添加）
├── assets/
│   └── main.css               # Tailwind CSS 入口
└── App.vue                    # 根组件
```

## 功能特性

### 已实现

- ✅ 欢迎屏幕（带动画背景）
- ✅ 侧边栏导航
- ✅ 顶部搜索栏
- ✅ 仪表盘视图（统计卡片 + 文献列表）
- ✅ 阅读器视图（PDF 阅读 + AI 聊天面板）
- ✅ 图谱视图（基因网络可视化）
- ✅ 有机背景动画
- ✅ 响应式设计
- ✅ Tailwind CSS 样式

### 设计原则

- 所有样式直接写在标签的 class 中（Tailwind 方式）
- 数据写死在组件中（不使用 store）
- 组件结构映射 UI 布局
- 使用定位类（Locator Class）便于调试

## 下一步

### 可添加的通用组件（components/）

- Select 下拉选择器
- Button 按钮组件
- Input 输入框组件
- Modal 模态框组件
- Tooltip 提示组件

### 可扩展的功能

- 文献管理系统
- 基因数据库集成
- AI 对话历史
- 用户设置面板
- 主题切换

## 注意事项

1. **Tailwind CSS 必须安装**：项目使用 Tailwind CSS，必须先安装依赖才能运行
2. **样式规范**：所有样式优先使用 Tailwind class，避免写 CSS
3. **组件定位**：每个组件根元素都有定位类（如 `ls-dashboard`、`ls-sidebar`）
4. **数据管理**：当前数据写死在组件中，后续可迁移到 Pinia store

## 参考

- 原型设计：`_Reference/Templete/原型设计1.html`
- 项目规范：`_Rules&&Workflows/rules/base-rules.md`
- 参考项目：`HNULS-KnowledgeDatabase`
