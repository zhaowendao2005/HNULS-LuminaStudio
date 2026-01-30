# 数据库操作和日志使用示例

## 📚 概述

本项目已集成 SurrealDB SDK，提供类型安全的数据库操作和自动日志记录功能。

## 🎯 架构说明

- **服务器启动**：使用 `surreal.exe` 启动 SurrealDB 服务器
- **Schema 初始化**：使用 `surreal.exe` 执行 SQL 创建表结构
- **数据操作**：使用 `surrealdb.js` SDK 进行 CRUD 操作
- **日志记录**：所有通过 SDK 的操作自动记录到 `operation_log` 表

## 📋 可用的 IPC 通道

### User 操作

```typescript
// 创建用户
await window.api.invoke('database:createuser', {
  username: 'testuser',
  email: 'test@example.com',
  password_hash: 'hashed_password',
  is_active: true
})

// 获取所有用户
const users = await window.api.invoke('database:getusers')

// 获取单个用户
const user = await window.api.invoke('database:getuser', 'user_id')

// 更新用户
await window.api.invoke('database:updateuser', 'user_id', {
  email: 'newemail@example.com'
})

// 删除用户
await window.api.invoke('database:deleteuser', 'user_id')
```

### Document 操作

```typescript
// 创建文档
await window.api.invoke('database:createdocument', {
  title: '测试文档',
  content: '文档内容',
  tags: ['测试', '示例']
})

// 获取所有文档
const documents = await window.api.invoke('database:getdocuments')

// 获取单个文档
const document = await window.api.invoke('database:getdocument', 'doc_id')

// 更新文档
await window.api.invoke('database:updatedocument', 'doc_id', {
  title: '更新后的标题'
})

// 删除文档
await window.api.invoke('database:deletedocument', 'doc_id')
```

### 通用查询

```typescript
// 执行原始 SQL 查询
const result = await window.api.invoke(
  'database:query',
  'SELECT * FROM user WHERE is_active = $active',
  { active: true }
)
```

### 日志查询

```typescript
// 获取所有操作日志
const logs = await window.api.invoke('database:getlogs')

// 获取最近 10 条日志
const recentLogs = await window.api.invoke('database:getlogs', {
  limit: 10
})

// 获取特定表的日志
const userLogs = await window.api.invoke('database:getlogs', {
  table: 'user'
})

// 获取特定操作的日志
const createLogs = await window.api.invoke('database:getlogs', {
  action: 'CREATE'
})

// 组合查询
const filteredLogs = await window.api.invoke('database:getlogs', {
  table: 'user',
  action: 'UPDATE',
  limit: 20
})
```

### 状态查询

```typescript
// 获取数据库连接状态
const status = await window.api.invoke('database:getstatus')
// 返回: { connected: true, serverRunning: true, serverUrl: 'http://127.0.0.1:8000' }
```

## 🔍 在 Surrealist 中查看日志

### 连接配置

- **Endpoint**: `http://127.0.0.1:8000`
- **Authentication**: Root
- **Username**: `root`
- **Password**: `root`
- **Namespace**: `knowledge`
- **Database**: `main`

### 查询日志

```sql
-- 查看所有日志
SELECT * FROM operation_log ORDER BY timestamp DESC;

-- 查看最近 10 条日志
SELECT * FROM operation_log ORDER BY timestamp DESC LIMIT 10;

-- 查看特定表的操作
SELECT * FROM operation_log WHERE table_name = 'user' ORDER BY timestamp DESC;

-- 查看特定操作类型
SELECT * FROM operation_log WHERE action = 'CREATE' ORDER BY timestamp DESC;

-- 查看今天的日志
SELECT * FROM operation_log
WHERE timestamp >= time::floor(time::now(), 1d)
ORDER BY timestamp DESC;

-- 统计各操作类型的数量
SELECT action, count() as total
FROM operation_log
GROUP BY action;

-- 统计各表的操作数量
SELECT table_name, count() as total
FROM operation_log
GROUP BY table_name;
```

## 📊 日志表结构

```typescript
interface OperationLog {
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'SELECT' | 'QUERY'
  table_name: string
  query: string // JSON 字符串，包含操作参数
  params: object | null // 操作参数对象
  result_count: number | null // 结果数量
  timestamp: Date
  source: string // 固定为 'electron_backend'
}
```

## 🎨 前端使用示例

### Vue 3 组件示例

```vue
<template>
  <div>
    <h2>用户列表</h2>
    <button @click="loadUsers">刷新</button>
    <ul>
      <li v-for="user in users" :key="user.id">{{ user.username }} - {{ user.email }}</li>
    </ul>

    <h2>操作日志</h2>
    <button @click="loadLogs">查看日志</button>
    <ul>
      <li v-for="log in logs" :key="log.id">
        {{ log.action }} - {{ log.table_name }} - {{ new Date(log.timestamp).toLocaleString() }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const users = ref([])
const logs = ref([])

async function loadUsers() {
  users.value = await window.api.invoke('database:getusers')
}

async function loadLogs() {
  logs.value = await window.api.invoke('database:getlogs', { limit: 20 })
}
</script>
```

## ⚙️ 配置说明

### 启用/禁用日志记录

日志记录默认启用。如果需要临时禁用（例如批量操作时），可以在后端代码中：

```typescript
const queryService = surrealDBService.getQueryService()
queryService.setLogging(false) // 禁用日志
// ... 执行操作
queryService.setLogging(true) // 重新启用
```

## 🚀 启动命令

```bash
# 默认模式
pnpm run dev

# Debug 模式（查看详细日志）
pnpm run dev:debug

# Trace 模式（查看最详细的日志）
pnpm run dev:trace
```

## 📝 注意事项

1. **日志记录范围**：只记录通过 Electron 后端 SDK 的操作，不记录 Surrealist 或直接 CLI 的操作
2. **性能影响**：日志记录是异步的，对性能影响极小
3. **日志清理**：目前没有自动清理机制，需要手动在 Surrealist 中执行 `DELETE FROM operation_log WHERE ...`
4. **递归避免**：查询日志时自动禁用日志记录，避免无限递归

## 🔧 故障排查

### QueryService 未连接

如果看到 "QueryService is not connected" 错误：

1. 检查 SurrealDB 服务器是否正常启动
2. 查看日志中是否有 "QueryService connected" 消息
3. 检查端口 8000 是否被占用

### 类型错误

SDK 提供完整的 TypeScript 类型支持，如果遇到类型错误：

1. 确保安装了 `surrealdb.js`
2. 重启 TypeScript 服务器
3. 检查 `tsconfig.json` 配置
