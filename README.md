# HNULS Knowledge Database

一个基于 Electron + Vue 3 + TypeScript 的现代化知识库管理系统，使用 SurrealDB 作为底层数据库，提供文档管理、知识图谱、RAG（检索增强生成）等功能。

## ✨ 特性

- 📚 **知识库管理** - 创建、组织和管理多个知识库
- 📄 **文档管理** - 支持多种视图模式（卡片、列表、树形）
- 🗺️ **知识图谱** - 可视化文档之间的关系
- 🤖 **RAG 功能** - 检索增强生成，智能问答
- 🎨 **现代化 UI** - 基于 Tailwind CSS 的美观界面
- 🔍 **全文搜索** - 快速检索知识库内容
- 📊 **数据统计** - 文档数量、分块统计等
- 🔐 **类型安全** - 完整的 TypeScript 支持
- 📝 **操作日志** - 完整的数据库操作审计

## 🛠️ 技术栈

### 前端
- **框架**: Vue 3 (Composition API)
- **状态管理**: Pinia
- **样式**: Tailwind CSS 4.x
- **构建工具**: Vite + Electron Vite
- **类型检查**: TypeScript + Vue TSC

### 后端
- **运行时**: Electron
- **数据库**: SurrealDB
- **日志**: electron-log
- **IPC 通信**: Electron IPC

### 开发工具
- **包管理**: pnpm
- **代码规范**: ESLint + Prettier
- **构建**: electron-builder

## 📋 系统要求

- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0
- **操作系统**: Windows 10+, macOS 10.15+, Linux

## 🚀 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
# 默认模式（info 日志级别）
pnpm dev

# Debug 模式（详细日志）
pnpm dev:debug

# Trace 模式（最详细日志）
pnpm dev:trace

# Warn 模式（仅警告和错误）
pnpm dev:warn
```

### 构建应用

```bash
# Windows
pnpm build:win

# macOS
pnpm build:mac

# Linux
pnpm build:linux

# 仅构建不打包
pnpm build:unpack
```

## 📁 项目结构

```
KnowledgeDatabase-src/
├── src/
│   ├── main/              # Electron 主进程
│   │   ├── index.ts      # 应用入口
│   │   ├── ipc/          # IPC 处理器
│   │   └── services/     # 业务服务
│   │       ├── surrealdb-service/    # SurrealDB 服务
│   │       ├── knowledgeBase-library/ # 知识库元数据服务
│   │       └── logger/               # 日志服务
│   ├── preload/          # 预加载脚本
│   │   ├── api/          # API 定义
│   │   └── bridge/       # IPC 桥接
│   └── renderer/         # Vue 渲染进程
│       └── src/
│           ├── views/    # 页面视图
│           ├── components/ # 组件
│           ├── stores/   # Pinia 状态管理
│           └── service/  # 前端服务层
├── vendor/               # 第三方资源
│   └── surrealdb/        # SurrealDB 可执行文件
├── dist/                 # 构建输出
└── out/                  # 编译输出
```

## 🎯 核心功能

### 知识库管理

- 创建、编辑、删除知识库
- 自定义知识库颜色和图标
- 文档和分块统计
- 元数据管理

### 文档视图

- **卡片视图**: 可视化文档卡片展示
- **列表视图**: 紧凑的列表展示
- **树形视图**: 层级结构展示

### 数据库操作

项目集成了 SurrealDB SDK，提供类型安全的数据库操作：

```typescript
// 创建文档
await window.api.invoke('database:createdocument', {
  title: '测试文档',
  content: '文档内容',
  tags: ['测试', '示例']
})

// 查询文档
const documents = await window.api.invoke('database:getdocuments')

// 执行自定义查询
const result = await window.api.invoke(
  'database:query',
  'SELECT * FROM document WHERE tags CONTAINS $tag',
  { tag: '测试' }
)
```

更多示例请参考 [`_Docs/USAGE_EXAMPLE.md`](./_Docs/USAGE_EXAMPLE.md)

### 日志系统

项目提供完整的日志记录功能：

- **应用日志**: 记录应用运行状态
- **数据库日志**: 记录所有数据库操作
- **日志级别**: error, warn, info, debug, trace

日志文件位置：
- Windows: `%APPDATA%\knowledgedatabase-src\logs\main.log`
- macOS: `~/Library/Logs/knowledgedatabase-src/main.log`
- Linux: `~/.config/knowledgedatabase-src/logs/main.log`

详细配置请参考 [`_Docs/LOG_LEVELS.md`](./_Docs/LOG_LEVELS.md)

## 🔧 开发指南

### 代码规范

```bash
# 代码格式化
pnpm format

# 代码检查
pnpm lint

# 类型检查
pnpm typecheck
```

### 推荐 IDE 配置

- [VSCode](https://code.visualstudio.com/)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

### 服务层架构

项目采用服务层架构设计：

- **单一职责**: 每个服务只负责一个业务域
- **依赖注入**: 服务间通过构造函数注入依赖
- **异步优先**: 所有 I/O 操作使用 async/await
- **错误处理**: 统一的错误处理和日志记录

## 📊 数据库配置

### SurrealDB 连接信息

- **Endpoint**: `http://127.0.0.1:8000`
- **Namespace**: `knowledge`
- **Database**: `main`
- **Authentication**: Root (开发环境)

### 使用 Surrealist 查看数据

1. 下载 [Surrealist](https://github.com/StarlaneStudios/surrealdb.studio)
2. 连接到 `http://127.0.0.1:8000`
3. 使用 Root 认证（用户名: `root`, 密码: `root`）
4. 选择 Namespace: `knowledge`, Database: `main`

## 🐛 故障排查

### SurrealDB 服务未启动

检查端口 8000 是否被占用，查看日志文件获取详细错误信息。

### 数据库连接失败

1. 确认 SurrealDB 服务正在运行
2. 检查防火墙设置
3. 查看应用日志文件

### 类型错误

1. 运行 `pnpm typecheck` 检查类型
2. 重启 TypeScript 服务器
3. 确认所有依赖已正确安装

## 📝 许可证

本项目采用 MIT 许可证。

## 👥 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 联系方式

如有问题或建议，请通过 Issue 联系我们。

---

**HNULS LabHub** - 知识库管理系统
