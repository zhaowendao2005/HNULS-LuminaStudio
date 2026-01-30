# SurrealDB 服务管理系统 - 文件架构

## 完整目录结构

```
KnowledgeDatabase-src/
│
├── vendor/                                   # 第三方可执行文件（开发环境）
│   └── surrealdb/
│       └── surreal-v2.4.0.windows-amd64.exe  # SurrealDB 可执行文件 ✓ 已存在
│
├── src/
│   └── main/                                 # Electron 主进程
│       │
│       ├── index.ts                          # 应用入口 ✓ 已存在
│       │
│       ├── services/                         # 服务层
│       │   │
│       │   ├── base-service/                 # 基础服务 ✓ 已存在
│       │   │   ├── app-service.ts            # 应用服务 🔧 需修改
│       │   │   ├── window-service.ts         # 窗口服务 ✓ 已存在
│       │   │   └── index.ts                  # 导出 ✓ 已存在
│       │   │
│       │   ├── logger/                       # 日志服务 📁 目录已存在
│       │   │   ├── logger-service.ts         # 日志服务实现（基于 electron-log）✨ 新建 (~80 行)
│       │   │   └── index.ts                  # 导出 ✨ 新建 (~5 行)
│       │   │
│       │   ├── surrealdb-service/            # SurrealDB 服务 📁 目录已存在
│       │   │   │
│       │   │   ├── surrealdb-service.ts      # 核心服务 ✨ 新建 (~300 行)
│       │   │   ├── port-manager.ts           # 端口管理器 ✨ 新建 (~200 行)
│       │   │   ├── schema-manager.ts         # 模式管理器 ✨ 新建 (~150 行)
│       │   │   ├── hook-system.ts            # 事件钩子系统 ✨ 新建 (~50 行)
│       │   │   ├── types.ts                  # 类型定义 ✨ 新建 (~80 行)
│       │   │   ├── config.ts                 # 配置定义 ✨ 新建 (~40 行)
│       │   │   ├── error-handler.ts          # 错误处理 ✨ 新建 (~80 行)
│       │   │   ├── index.ts                  # 导出 ✨ 新建 (~10 行)
│       │   │   │
│       │   │   └── schema/                   # 模式文件目录 📁 目录已存在
│       │   │       ├── index.ts              # Schema 导出 ✨ 新建 (~15 行)
│       │   │       ├── tables.ts             # 基础表定义 ✨ 新建 (~100 行)
│       │   │       ├── user.ts               # 用户表（可选示例） ✨ 新建 (~30 行)
│       │   │       └── document.ts           # 文档表（可选示例） ✨ 新建 (~40 行)
│       │   │
│       │   ├── index.ts                      # 服务导出 🔧 需修改
│       │   └── README.md                     # 服务文档 ✓ 已存在
│       │
│       └── ipc/                              # IPC 处理器 ✓ 已存在
│           ├── base-handler.ts               # ✓ 已存在
│           ├── index.ts                      # ✓ 已存在
│           ├── test-handler.ts               # ✓ 已存在
│           └── README.md                     # ✓ 已存在
│
├── data/                                     # 数据库文件目录 🔄 运行时创建
│   └── knowledge.db/                         # SurrealDB 数据文件
│
├── package.json                              # 项目配置 ✓ 已存在
├── electron-builder.yml                      # 打包配置 🔧 需修改
└── tsconfig.json                             # TypeScript 配置 ✓ 已存在
```

**日志文件位置**（由 electron-log 自动管理）：
- Windows: `%APPDATA%\{app name}\logs\main.log`
- macOS: `~/Library/Logs/{app name}/main.log`
- Linux: `~/.config/{app name}/logs/main.log`

## 图例说明

- ✓ **已存在**：文件/目录已经存在，无需修改
- 🔧 **需修改**：文件已存在，需要修改以集成新功能
- ✨ **新建**：需要创建的新文件
- 📁 **目录已存在**：目录结构已存在，但内容为空或需要添加文件
- 🔄 **运行时创建**：应用运行时自动创建的目录

## 文件统计

### 需要新建的文件

| 文件 | 预估行数 | 复杂度 | 优先级 |
|------|---------|--------|--------|
| logger-service.ts | ~80 | 低 | 高 |
| surrealdb-service.ts | ~300 | 高 | 高 |
| port-manager.ts | ~200 | 高 | 高 |
| schema-manager.ts | ~150 | 中 | 中 |
| hook-system.ts | ~50 | 低 | 中 |
| types.ts | ~80 | 低 | 高 |
| config.ts | ~40 | 低 | 高 |
| error-handler.ts | ~80 | 中 | 中 |
| index.ts (各模块) | ~30 | 低 | 高 |
| schema/index.ts | ~15 | 低 | 中 |
| schema/tables.ts | ~100 | 中 | 中 |
| schema/user.ts | ~30 | 低 | 低 |
| schema/document.ts | ~40 | 低 | 低 |

**总计**：约 1,100 行代码

### 需要安装的依赖

```bash
pnpm add electron-log
```

### 需要修改的文件

| 文件 | 修改内容 | 影响范围 |
|------|---------|---------|
| app-service.ts | 集成 SurrealDBService | 约 50 行新增 |
| services/index.ts | 导出新服务 | 约 5 行新增 |
| electron-builder.yml | 添加资源打包配置 | 约 10 行新增 |

## 核心模块依赖关系

```
AppService (修改)
    ↓
SurrealDBService (新建)
    ├── PortManager (新建)
    ├── SchemaManager (新建)
    ├── HookSystem (新建)
    ├── LoggerService (新建)
    ├── Config (新建)
    ├── Types (新建)
    └── ErrorHandler (新建)
```

## 实现顺序建议

### 阶段 1：基础设施（优先级：高）
1. ✨ `logger-service.ts` - 日志服务（基于 electron-log）
2. ✨ `types.ts` - 类型定义
3. ✨ `config.ts` - 配置定义

### 阶段 2：核心组件（优先级：高）
4. ✨ `hook-system.ts` - 事件系统
5. ✨ `port-manager.ts` - 端口管理
6. ✨ `error-handler.ts` - 错误处理

### 阶段 3：服务层（优先级：高）
7. ✨ `schema-manager.ts` - 模式管理
8. ✨ `surrealdb-service.ts` - 核心服务

### 阶段 4：集成（优先级：高）
9. 🔧 `app-service.ts` - 集成到应用
10. ✨ 各模块的 `index.ts` - 导出
11. 🔧 `services/index.ts` - 统一导出

### 阶段 5：Schema 定义（优先级：中）
12. ✨ `schema/tables.ts` - 表定义类型和基础表
13. ✨ `schema/index.ts` - Schema 导出
14. 🔧 `electron-builder.yml` - 打包配置

## 测试文件（可选）

```
src/main/services/
├── logger/__tests__/
│   └── logger-service.test.ts
├── surrealdb-service/__tests__/
│   ├── surrealdb-service.test.ts
│   ├── port-manager.test.ts
│   ├── schema-manager.test.ts
│   ├── hook-system.test.ts
│   └── integration.test.ts
```

## 生产环境打包后的结构

```
app/
├── resources/
│   └── vendor/
│       └── surrealdb/
│           └── surreal-v2.4.0.windows-amd64.exe
├── app.asar                    # 应用代码（包含编译后的 schema）
└── ...
```

## 用户数据目录结构（运行时）

```
%APPDATA%/KnowledgeDatabase/    # Windows（由 electron-log 和应用自动管理）
├── data/
│   └── knowledge.db/           # SurrealDB 数据文件
└── logs/
    └── main.log                # 日志文件（electron-log 自动管理）
```

## 关键路径说明

### 开发环境路径
- **SurrealDB 可执行文件**：`{projectRoot}/vendor/surrealdb/surreal-v2.4.0.windows-amd64.exe`
- **数据库文件**：`{projectRoot}/data/knowledge.db`
- **模式文件**：TypeScript 模块，通过 `import` 加载
- **日志文件**：控制台输出 + AppData 日志文件

### 生产环境路径
- **SurrealDB 可执行文件**：`{process.resourcesPath}/vendor/surrealdb/surreal-v2.4.0.windows-amd64.exe`
- **数据库文件**：`{app.getPath('userData')}/data/knowledge.db`
- **模式文件**：编译到 app.asar 中，通过 `import` 加载
- **日志文件**：由 electron-log 自动管理（见上方日志文件位置）

## 注意事项

1. **路径解析**：所有路径都需要根据环境（开发/生产）动态解析
2. **权限**：确保应用对数据目录和日志目录有读写权限
3. **打包**：surreal.exe 需要正确打包到 resources 目录
4. **模式文件**：TypeScript schema 文件会被编译到 app.asar，通过动态 import 加载
5. **数据迁移**：升级时需要考虑数据库迁移策略

## Schema 使用示例

### 添加新表的完整流程

**步骤 1**：创建新的表定义文件

```typescript
// schema/category.ts
import { TableDefinition } from './tables';

export const categoryTable: TableDefinition = {
  name: 'category',
  sql: `
    DEFINE TABLE category SCHEMAFULL;
    
    DEFINE FIELD name ON category TYPE string
      ASSERT $value != NONE AND string::len($value) >= 1;
    
    DEFINE FIELD description ON category TYPE string
      DEFAULT '';
    
    DEFINE FIELD parent ON category TYPE option<record(category)>;
    
    DEFINE FIELD created_at ON category TYPE datetime
      DEFAULT time::now();
    
    DEFINE INDEX unique_name ON category COLUMNS name UNIQUE;
    DEFINE INDEX idx_parent ON category COLUMNS parent;
  `
};
```

**步骤 2**：在 index.ts 中注册

```typescript
// schema/index.ts
import { userTable, documentTable } from './tables';
import { categoryTable } from './category';  // 导入新表

export const schemas = [
  userTable.sql,
  documentTable.sql,
  categoryTable.sql  // 添加到数组
];

export default schemas;

// 导出供其他地方使用
export { userTable, documentTable, categoryTable };
```

**步骤 3**：重启应用，自动导入

应用启动时会自动检测并导入新的 schema 定义。

### Schema 定义最佳实践

1. **一个文件一个表**：便于维护和查找
2. **使用 SCHEMAFULL**：强制类型检查
3. **添加 ASSERT 约束**：数据验证
4. **使用 DEFAULT 值**：简化插入操作
5. **创建必要索引**：提升查询性能
6. **导出 TableDefinition**：供其他模块使用
