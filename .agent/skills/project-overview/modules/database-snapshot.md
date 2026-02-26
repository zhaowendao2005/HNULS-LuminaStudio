# 数据库快照（SQLite）

> ⚠️ 本文档为快照，可能滞后于最新代码。如发现不一致，请以源码为准：
> - `main/services/database-sqlite/schema/base-config/tables.ts`
> - `main/services/database-sqlite/schema/userdata/tables.ts`

## 概述

LuminaStudio 使用 **better-sqlite3**（同步 SQLite），由 `DatabaseManager` 统一管理。数据库文件存放在 `%APPDATA%/LuminaStudio/` 下。

当前共 **2 个数据库**：

| 数据库 | 文件名 | Schema Version | 用途 |
|--------|--------|----------------|------|
| BaseConfig | `BaseConfig.db` | v1 | 模型提供商、模型配置、应用设置 |
| userdata | `userdata.db` | v2 | 对话、消息、Token 使用统计 |

---

## BaseConfig 数据库（v1）

### `_schema_version`
版本元数据表，用于 Schema 版本校验和自动迁移。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 固定为 1（CHECK 约束） |
| version | INTEGER NOT NULL | 当前 Schema 版本号 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

### `model_providers`
模型提供商配置表。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 提供商唯一 ID |
| name | TEXT NOT NULL | 显示名称 |
| protocol | TEXT NOT NULL DEFAULT 'openai' | 协议类型 |
| enabled | INTEGER NOT NULL DEFAULT 1 | 是否启用 |
| base_url | TEXT NOT NULL | API 基础 URL |
| api_key | TEXT NOT NULL | API Key |
| default_headers | TEXT | 默认请求头（JSON） |
| sort_order | INTEGER DEFAULT 0 | 排序权重 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

### `model_configs`
模型配置表（关联 provider）。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 模型唯一 ID |
| provider_id | TEXT NOT NULL | 外键 → model_providers(id) ON DELETE CASCADE |
| display_name | TEXT NOT NULL | 显示名称 |
| group_name | TEXT | 分组名（用于 UI 分组展示） |
| sort_order | INTEGER DEFAULT 0 | 排序权重 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

### `app_settings`
应用 KV 配置表。

| 字段 | 类型 | 说明 |
|------|------|------|
| key | TEXT PK | 配置键 |
| value | TEXT NOT NULL | 配置值 |
| updated_at | TEXT | 更新时间 |

---

## userdata 数据库（v2）

### `_schema_version`
同 BaseConfig，固定 id=1。

### `presets`
预设表（如"通用对话"、"编程助手"等）。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 预设唯一 ID |
| name | TEXT NOT NULL | 预设名称 |
| description | TEXT | 描述 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

### `conversations`
对话表（关联 preset）。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 对话唯一 ID |
| preset_id | TEXT NOT NULL | 外键 → presets(id) ON DELETE CASCADE |
| title | TEXT | 对话标题 |
| provider_id | TEXT NOT NULL | 使用的模型提供商 ID |
| model_id | TEXT NOT NULL | 使用的模型 ID |
| enable_thinking | INTEGER NOT NULL DEFAULT 0 | 是否启用思维链 |
| memory_rounds | INTEGER NOT NULL DEFAULT 10 | 上下文记忆轮数 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

**索引**：`idx_conversations_preset_time ON conversations(preset_id, updated_at)`

### `messages`
消息表（关联 conversation）。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 消息唯一 ID |
| conversation_id | TEXT NOT NULL | 外键 → conversations(id) ON DELETE CASCADE |
| role | TEXT NOT NULL | 角色（user / assistant） |
| text | TEXT | 纯文本内容 |
| reasoning | TEXT | 思维链内容（thinking） |
| content_json | TEXT | 结构化内容（JSON，存储 Block 数据：NodeBlock/ToolBlock 等） |
| status | TEXT DEFAULT 'final' | 消息状态（final / streaming / error） |
| error | TEXT | 错误信息 |
| created_at | TEXT | 创建时间 |

**索引**：`idx_messages_conversation_time ON messages(conversation_id, created_at)`

### `message_usage`
消息 Token 使用统计表（关联 message）。

| 字段 | 类型 | 说明 |
|------|------|------|
| message_id | TEXT PK | 外键 → messages(id) ON DELETE CASCADE |
| input_tokens | INTEGER | 输入 Token 数 |
| output_tokens | INTEGER | 输出 Token 数 |
| reasoning_tokens | INTEGER | 推理 Token 数 |
| total_tokens | INTEGER | 总 Token 数 |
| provider_metadata_json | TEXT | 提供商元数据（JSON） |

---

## Schema 管理机制

### 代码路径

```
main/services/database-sqlite/
├── database-manager.ts      # DatabaseManager：注册/初始化/版本校验/关闭
├── types.ts                 # DatabaseSchema / TableDefinition 类型
├── index.ts                 # 导出
└── schema/
    ├── base-config/
    │   ├── index.ts          # BASE_CONFIG_SCHEMA（name='BaseConfig', version=1）
    │   └── tables.ts         # 表定义数组
    └── userdata/
        ├── index.ts          # USERDATA_SCHEMA（name='userdata', version=2）
        └── tables.ts         # 表定义数组
```

### 版本校验流程

1. `DatabaseManager.initialize()` 遍历所有注册的 Schema
2. 如果数据库文件不存在 → 创建新库并执行所有 `createSQL`
3. 如果存在 → 读取 `_schema_version.version`，与 Schema 定义对比
4. 版本不匹配 → 删除旧库重建（当前策略，无增量迁移）

### 使用方式

```typescript
// 获取数据库实例
const db = databaseManager.getDatabase('userdata')
// 执行查询
const rows = db.prepare('SELECT * FROM conversations WHERE preset_id = ?').all(presetId)
```
