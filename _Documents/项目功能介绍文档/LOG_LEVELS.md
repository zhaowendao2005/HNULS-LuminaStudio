# 日志级别配置说明

## 📋 环境变量

### 应用日志级别

- **环境变量**: `LOG_LEVEL`
- **可选值**: `error` | `warn` | `info` | `debug`
- **默认值**: `info`
- **作用**: 控制 Electron 应用的日志输出级别

### SurrealDB 日志级别

- **环境变量**: `SURREALDB_LOG_LEVEL`
- **可选值**: `error` | `warn` | `info` | `debug` | `trace`
- **默认值**: `info`
- **作用**: 控制 SurrealDB 服务器的日志输出级别

---

## 🚀 启动命令

### 1. 默认模式（info 级别）

```bash
pnpm run dev
```

- 应用日志: info
- SurrealDB 日志: info
- 适用场景: 日常开发

### 2. Debug 模式

```bash
pnpm run dev:debug
```

- 应用日志: debug
- SurrealDB 日志: debug
- 适用场景: 调试应用逻辑和数据库操作

### 3. Trace 模式（最详细）

```bash
pnpm run dev:trace
```

- 应用日志: debug
- SurrealDB 日志: trace
- 适用场景: 深度调试 SurrealDB 内部行为

### 4. Warn 模式（最简洁）

```bash
pnpm run dev:warn
```

- 应用日志: warn
- SurrealDB 日志: warn
- 适用场景: 生产环境或只关注警告和错误

### 5. Info 模式（明确指定）

```bash
pnpm run dev:info
```

- 应用日志: info
- SurrealDB 日志: info
- 适用场景: 与默认模式相同，但明确指定

---

## 📝 日志级别说明

### 日志级别从低到高：

1. **error** - 只显示错误
   - 应用崩溃
   - 数据库连接失败
   - 严重错误

2. **warn** - 显示警告和错误
   - 潜在问题
   - 不推荐的操作
   - 性能警告

3. **info** - 显示信息、警告和错误（推荐）
   - 服务启动/关闭
   - 重要操作
   - 状态变化

4. **debug** - 显示调试信息及以上所有
   - 函数调用
   - 变量值
   - 执行流程

5. **trace** - 显示最详细的跟踪信息（仅 SurrealDB）
   - SQL 执行细节
   - 网络请求
   - 内部状态

---

## 📂 日志文件位置

### Windows

```
%APPDATA%\knowledgedatabase-src\logs\main.log
```

通常是: `C:\Users\你的用户名\AppData\Roaming\knowledgedatabase-src\logs\main.log`

### macOS

```
~/Library/Logs/knowledgedatabase-src/main.log
```

### Linux

```
~/.config/knowledgedatabase-src/logs/main.log
```

---

## 🔧 自定义配置

### 方式 1: 使用预定义命令

```bash
pnpm run dev:debug
```

### 方式 2: 手动设置环境变量（Windows PowerShell）

```powershell
$env:LOG_LEVEL="debug"
$env:SURREALDB_LOG_LEVEL="trace"
pnpm run dev
```

### 方式 3: 手动设置环境变量（Windows CMD）

```cmd
set LOG_LEVEL=debug
set SURREALDB_LOG_LEVEL=trace
pnpm run dev
```

### 方式 4: 创建 .env 文件（需要配置支持）

```env
LOG_LEVEL=debug
SURREALDB_LOG_LEVEL=trace
```

---

## 💡 使用建议

### 开发阶段

- 使用 `pnpm run dev:debug` 查看详细的调试信息
- 遇到 Schema 初始化问题时使用 `pnpm run dev:trace`

### 测试阶段

- 使用 `pnpm run dev` (默认 info 级别)
- 平衡信息量和可读性

### 生产环境

- 使用 `pnpm run dev:warn` 或更高级别
- 减少日志输出，提高性能

### 问题排查

1. 先用 `dev:debug` 查看是否有明显错误
2. 如果问题涉及数据库，使用 `dev:trace` 查看 SQL 执行细节
3. 检查日志文件获取完整历史记录

---

## 📊 日志输出示例

### Info 级别

```
[2026-01-09 19:43:14] [info]  Logger initialized with level: info
[2026-01-09 19:43:14] [info]  SurrealDBService created with config
[2026-01-09 19:43:14] [info]  Initializing SurrealDB service...
```

### Debug 级别

```
[2026-01-09 19:43:14] [info]  Logger initialized with level: debug
[2026-01-09 19:43:14] [debug] Log file: C:\Users\...\logs\main.log
[2026-01-09 19:43:14] [info]  SurrealDBService created with config
[2026-01-09 19:43:14] [debug] Starting SurrealDB: vendor\surrealdb\surreal.exe start...
[2026-01-09 19:43:16] [debug] [SurrealDB stdout] Server started on port 8000
```

### Trace 级别（SurrealDB）

```
[2026-01-09 19:43:16] [debug] [SurrealDB stdout] TRACE: Executing SQL: DEFINE TABLE user...
[2026-01-09 19:43:16] [debug] [SurrealDB stdout] TRACE: Table created successfully
[2026-01-09 19:43:16] [debug] [SurrealDB stdout] TRACE: Index created: unique_username
```

---

## ⚠️ 注意事项

1. **性能影响**: trace 和 debug 级别会产生大量日志，可能影响性能
2. **磁盘空间**: 日志文件会自动轮转，单个文件最大 10MB
3. **敏感信息**: debug/trace 级别可能包含敏感信息（密码、token），生产环境慎用
4. **跨平台**: 使用 `cross-env` 确保环境变量在 Windows/Mac/Linux 上都能正常工作

---

## 🔍 故障排查

### 问题: Schema 没有初始化

**解决方案**: 使用 trace 级别查看详细的 SQL 执行过程

```bash
pnpm run dev:trace
```

### 问题: 端口被占用

**解决方案**: 使用 debug 级别查看端口分配过程

```bash
pnpm run dev:debug
```

### 问题: 应用启动失败

**解决方案**: 查看日志文件获取完整错误堆栈

```bash
# Windows
type %APPDATA%\knowledgedatabase-src\logs\main.log
```
