# LuminaStudio 项目结构

## 概述
LuminaStudio 是一个基于 Electron + Vue 3 + TypeScript 的桌面应用项目。

## 目录结构

```
LuminaStudio/
├── src/
│   ├── main/                    # 主进程
│   │   ├── ipc/                # IPC 处理器（按业务域拆分）
│   │   │   ├── index.ts        # 统一注册入口
│   │   │   └── README.md
│   │   ├── services/           # 业务逻辑层
│   │   │   └── README.md
│   │   └── index.ts            # 主进程入口
│   │
│   ├── preload/                 # 预加载脚本
│   │   ├── api/                # API 层（按业务域拆分）
│   │   │   ├── utils-api.ts
│   │   │   └── README.md
│   │   ├── bridge/             # Bridge 层（聚合暴露）
│   │   │   ├── index.ts
│   │   │   └── README.md
│   │   ├── types/              # 跨进程类型定义（唯一权威来源）
│   │   │   ├── base.types.ts
│   │   │   ├── index.ts
│   │   │   └── README.md
│   │   ├── index.ts            # Preload 入口
│   │   └── index.d.ts          # 类型声明
│   │
│   ├── renderer/                # 渲染进程
│   │   └── src/
│   │       ├── components/     # 全局通用组件
│   │       │   └── README.md
│   │       ├── views/          # 页面视图（映射 UI 布局）
│   │       │   └── README.md
│   │       ├── stores/         # Pinia 状态管理（SSOT）
│   │       │   └── README.md
│   │       ├── service/        # 服务层（可选）
│   │       │   └── README.md
│   │       ├── composables/    # 组合式函数（可选）
│   │       │   └── README.md
│   │       ├── types/          # 公共类型
│   │       │   └── README.md
│   │       ├── assets/         # 静态资源
│   │       ├── App.vue
│   │       └── main.ts
│   │
│   └── utility/                 # Utility Process（独立子进程）
│       └── README.md
│
├── resources/                   # 应用资源
├── build/                       # 构建配置
├── electron.vite.config.ts     # Vite 配置
├── tsconfig.json               # TypeScript 配置
├── tsconfig.node.json          # Node 环境 TS 配置
├── tsconfig.web.json           # Web 环境 TS 配置
├── package.json
└── PROJECT_STRUCTURE.md        # 本文档
```

## 路径别名

### Main & Preload & Utility
- `@main/*` → `src/main/*`
- `@preload/*` → `src/preload/*`
- `@preload/types` → `src/preload/types`
- `@utility/*` → `src/utility/*`

### Renderer
- `@renderer/*` → `src/renderer/src/*`
- `@preload/types` → `src/preload/types`

## 核心原则

### 1. 目录职责清晰
- 每个目录都有明确的职责，参见各目录下的 README.md
- 禁止在顶层随意堆放未归类文件

### 2. 类型系统
- `src/preload/types/` 是跨进程类型的唯一权威来源
- 局部私有类型就近放置
- 跨域复用的类型必须提升到公共类型目录

### 3. 单一事实来源（SSOT）
- Pinia store 是业务数据的唯一权威来源
- 避免在多处复制状态导致不一致

### 4. 定位类规范
- 每个组件根容器必须包含定位类
- 格式：`{页面简写}-{功能区域}`
- 定位类无样式意义，仅用于快速定位代码

### 5. Tailwind 优先
- 页面私有组件优先直接使用 Tailwind class
- 公共组件适度封装，保持可读性

## 开发流程

### 添加新功能
1. 在 `src/main/services/` 创建业务逻辑
2. 在 `src/main/ipc/` 创建 IPC handler
3. 在 `src/preload/types/` 定义跨进程类型
4. 在 `src/preload/api/` 创建 API 层
5. 在 `src/preload/bridge/` 注册 API
6. 在 `src/renderer/src/stores/` 创建状态管理
7. 在 `src/renderer/src/views/` 创建页面视图

### 类型同步
- 修改 `src/preload/types/` 后，确保 `index.ts` 导出
- `src/preload/index.d.ts` 会自动同步类型到渲染进程

## 参考文档
- 详细规范：`_Rules&&Workflows/rules/base-rules.md`
- 各目录职责：查看对应目录下的 `README.md`
