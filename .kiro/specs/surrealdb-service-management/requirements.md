# 需求文档

## 简介

本文档定义了基于 Electron 的知识库应用程序中 SurrealDB 服务管理系统的需求。该系统管理 SurrealDB 服务器进程的生命周期，处理数据库初始化和模式验证，提供全面的日志记录功能，并确保适当的端口管理以避免冲突。

## 术语表

- **SurrealDB_Service（SurrealDB 服务）**: 负责管理 SurrealDB 服务器进程生命周期的服务
- **Schema_Manager（模式管理器）**: 处理数据库模式初始化和验证的组件
- **Logger_Service（日志服务）**: 提供多个严重级别的结构化日志记录的全局日志服务
- **Port_Manager（端口管理器）**: 管理端口分配和冲突检测的组件
- **Server_Process（服务器进程）**: SurrealDB 可执行进程（surreal.exe）
- **Development_Mode（开发模式）**: 从源代码运行的应用程序，使用 vendor 目录
- **Production_Mode（生产模式）**: 作为打包可执行文件运行的应用程序，使用 resources 目录
- **Schema_Template（模式模板）**: 存储在模式文件中的预定义数据库模式结构
- **Hook（钩子）**: 用于监控和响应服务事件的回调机制

## 需求

### 需求 1：SurrealDB 服务器生命周期管理

**用户故事：** 作为开发者，我希望应用程序自动管理 SurrealDB 服务器生命周期，以便数据库在需要时始终可用，并在关闭时正确清理。

#### 验收标准

1. WHEN 应用程序启动时，THE SurrealDB_Service SHALL 根据环境定位正确的 surreal.exe 路径
2. WHEN 处于 Development_Mode 时，THE SurrealDB_Service SHALL 使用路径 `vendor/surrealdb/surreal-v2.4.0.windows-amd64.exe`
3. WHEN 处于 Production_Mode 时，THE SurrealDB_Service SHALL 使用路径 `resources/vendor/surrealdb/surreal-v2.4.0.windows-amd64.exe`
4. WHEN 启动服务器时，THE SurrealDB_Service SHALL 使用适当的命令行参数执行 surreal.exe
5. WHEN 应用程序关闭时，THE SurrealDB_Service SHALL 向 Server_Process 发送 SIGINT 信号以实现优雅关闭
6. IF Server_Process 在 5 秒内未终止，THEN THE SurrealDB_Service SHALL 强制终止进程
7. WHEN Server_Process 终止时，THE SurrealDB_Service SHALL 清理所有相关资源

### 需求 2：SurrealDB 服务器配置

**用户故事：** 作为开发者，我希望 SurrealDB 服务器以适当的配置启动，以便它能够安全运行并持久化存储数据。

#### 验收标准

1. WHEN 启动服务器时，THE SurrealDB_Service SHALL 使用基于文件的存储和 RocksDB 后端
2. WHEN 启动服务器时，THE SurrealDB_Service SHALL 将数据库路径指定为 `surrealkv:./data/knowledge.db`
3. WHEN 启动服务器时，THE SurrealDB_Service SHALL 配置用户名和密码进行身份验证
4. WHEN 启动服务器时，THE SurrealDB_Service SHALL 绑定到 Port_Manager 分配的端口
5. WHEN 启动服务器时，THE SurrealDB_Service SHALL 启用适当日志级别的日志记录
6. WHEN 启动服务器时，THE SurrealDB_Service SHALL 使用 `--no-banner` 标志隐藏启动横幅
7. WHEN 服务器成功启动时，THE SurrealDB_Service SHALL 使用 `is-ready` 命令验证就绪状态

### 需求 3：端口管理

**用户故事：** 作为开发者，我希望应用程序自动管理端口分配，以避免端口冲突，并在需要时能够运行多个实例。

#### 验收标准

1. WHEN 应用程序启动时，THE Port_Manager SHALL 尝试分配默认端口 8000
2. IF 默认端口不可用，THEN THE Port_Manager SHALL 在 8000-8100 范围内查找下一个可用端口
3. WHEN 分配端口时，THE Port_Manager SHALL 通过尝试绑定来验证端口未被使用
4. WHEN 应用程序关闭时，THE Port_Manager SHALL 释放已分配的端口
5. WHEN 检查端口可用性时，THE Port_Manager SHALL 处理 TCP 和 UDP 协议
6. IF 范围内没有可用端口，THEN THE Port_Manager SHALL 抛出带有描述性消息的错误

### 需求 4：数据库模式初始化和验证

**用户故事：** 作为开发者，我希望数据库模式能够自动初始化和验证，以便数据库结构始终与应用程序需求保持一致。

#### 验收标准

1. WHEN 服务器就绪时，THE Schema_Manager SHALL 检查数据库模式是否存在
2. IF 模式不存在，THEN THE Schema_Manager SHALL 从模板文件导入模式
3. WHEN 导入模式时，THE Schema_Manager SHALL 从 `schema` 目录读取所有 `.surql` 文件
4. WHEN 导入模式时，THE Schema_Manager SHALL 使用 `import` 命令执行模式文件
5. IF 模式存在，THEN THE Schema_Manager SHALL 根据模板验证模式
6. WHEN 验证模式时，THE Schema_Manager SHALL 比较表定义、字段定义和索引定义
7. IF 模式与模板不同，THEN THE Schema_Manager SHALL 用模板覆盖模式
8. WHEN 覆盖模式时，THE Schema_Manager SHALL 在修改前备份现有模式
9. WHEN 模式操作完成时，THE Schema_Manager SHALL 记录操作结果

### 需求 5：模式模板定义

**用户故事：** 作为开发者，我希望使用 SurrealQL 文件定义数据库模式，以便数据库结构可以进行版本控制和维护。

#### 验收标准

1. THE Schema_Template SHALL 存储在 `schema` 目录内的 `.surql` 文件中
2. WHEN 定义表时，THE Schema_Template SHALL 使用带有 SCHEMAFULL 模式的 `DEFINE TABLE` 语句
3. WHEN 定义字段时，THE Schema_Template SHALL 使用带有类型规范的 `DEFINE FIELD` 语句
4. WHEN 定义索引时，THE Schema_Template SHALL 使用带有适当列的 `DEFINE INDEX` 语句
5. WHEN 定义约束时，THE Schema_Template SHALL 在字段定义中使用 `ASSERT` 子句
6. THE Schema_Template SHALL 支持多个模式文件以便于组织
7. WHEN 加载模式文件时，THE Schema_Manager SHALL 按字母顺序处理文件

### 需求 6：全局日志服务

**用户故事：** 作为开发者，我希望有一个具有多个严重级别的集中式日志服务，以便我可以跟踪应用程序行为并有效调试问题。

#### 验收标准

1. THE Logger_Service SHALL 提供以下级别的日志方法：debug、info、warn、error、fatal
2. WHEN 记录消息时，THE Logger_Service SHALL 包含时间戳、级别、来源和消息
3. WHEN 记录消息时，THE Logger_Service SHALL 将输出格式化为结构化 JSON 或纯文本
4. WHEN 处于 Development_Mode 时，THE Logger_Service SHALL 将日志输出到控制台并带有彩色格式
5. WHEN 处于 Production_Mode 时，THE Logger_Service SHALL 将日志写入轮转日志文件
6. WHEN 写入文件时，THE Logger_Service SHALL 每天或当文件大小超过 10MB 时轮转日志
7. WHEN 轮转日志时，THE Logger_Service SHALL 保留最近 7 个日志文件
8. THE Logger_Service SHALL 支持可配置的最小日志级别过滤
9. THE Logger_Service SHALL 在整个应用程序中作为单例访问

### 需求 7：服务事件钩子

**用户故事：** 作为开发者，我希望为服务事件注册钩子，以便我可以监控和响应 SurrealDB 服务状态变化和日志事件。

#### 验收标准

1. WHEN SurrealDB_Service 启动时，THE Hook 系统 SHALL 发出 `server:starting` 事件
2. WHEN SurrealDB_Service 就绪时，THE Hook 系统 SHALL 发出 `server:ready` 事件
3. WHEN SurrealDB_Service 遇到错误时，THE Hook 系统 SHALL 发出 `server:error` 事件
4. WHEN SurrealDB_Service 关闭时，THE Hook 系统 SHALL 发出 `server:shutdown` 事件
5. WHEN Schema_Manager 初始化模式时，THE Hook 系统 SHALL 发出 `schema:initialized` 事件
6. WHEN Schema_Manager 验证模式时，THE Hook 系统 SHALL 发出 `schema:validated` 事件
7. WHEN Schema_Manager 覆盖模式时，THE Hook 系统 SHALL 发出 `schema:overwritten` 事件
8. WHEN Server_Process 输出到 stdout 时，THE Hook 系统 SHALL 发出带有输出内容的 `server:stdout` 事件
9. WHEN Server_Process 输出到 stderr 时，THE Hook 系统 SHALL 发出带有输出内容的 `server:stderr` 事件
10. THE Hook 系统 SHALL 允许为每种事件类型注册多个监听器
11. WHEN 发出事件时，THE Hook 系统 SHALL 异步调用所有已注册的监听器
12. WHEN 监听器抛出错误时，THE Hook 系统 SHALL 记录错误并继续调用其他监听器

### 需求 8：错误处理和恢复

**用户故事：** 作为开发者，我希望系统能够优雅地处理错误并尝试恢复，以便应用程序保持稳定并提供有用的错误信息。

#### 验收标准

1. IF 找不到 surreal.exe 文件，THEN THE SurrealDB_Service SHALL 抛出包含预期路径的错误
2. IF 服务器在 30 秒内未能启动，THEN THE SurrealDB_Service SHALL 抛出超时错误
3. IF 服务器进程崩溃，THEN THE SurrealDB_Service SHALL 记录崩溃并发出错误事件
4. IF 模式导入失败，THEN THE Schema_Manager SHALL 记录错误并抛出异常
5. IF 端口分配失败，THEN THE Port_Manager SHALL 抛出包含可用端口信息的错误
6. WHEN 发生错误时，THE Logger_Service SHALL 记录完整的错误堆栈跟踪
7. WHEN 发生关键错误时，THE SurrealDB_Service SHALL 在抛出异常前尝试清理资源

### 需求 9：服务集成

**用户故事：** 作为开发者，我希望 SurrealDB 服务与 Electron 应用程序生命周期无缝集成，以便在需要时可以使用数据库操作。

#### 验收标准

1. THE SurrealDB_Service SHALL 在 AppService 初始化阶段进行初始化
2. WHEN AppService 启动时，THE SurrealDB_Service SHALL 在创建窗口之前启动
3. WHEN AppService 关闭时，THE SurrealDB_Service SHALL 在关闭窗口之后关闭
4. THE SurrealDB_Service SHALL 公开服务器 URL 供其他服务使用
5. THE SurrealDB_Service SHALL 公开身份验证凭据供其他服务使用
6. THE SurrealDB_Service SHALL 提供检查服务器是否正在运行的方法
7. THE SurrealDB_Service SHALL 提供获取当前服务器状态的方法

### 需求 10：配置管理

**用户故事：** 作为开发者，我希望配置 SurrealDB 服务设置，以便我可以针对不同的环境和用例调整行为。

#### 验收标准

1. THE SurrealDB_Service SHALL 从配置文件或环境变量读取配置
2. WHEN 未提供配置时，THE SurrealDB_Service SHALL 使用合理的默认值
3. THE 配置 SHALL 包括：数据库路径、端口范围、用户名、密码、日志级别
4. THE 配置 SHALL 包括：模式目录路径、备份目录路径
5. WHEN 配置更改时，THE SurrealDB_Service SHALL 验证新配置
6. IF 配置无效，THEN THE SurrealDB_Service SHALL 抛出验证错误
7. THE 配置 SHALL 支持特定环境的覆盖（开发环境 vs 生产环境）


### 需求 11：防止服务重复启动

**用户故事：** 作为开发者，我希望系统能够在任何场景下保证 SurrealDB 服务不会重复启动，以便避免端口冲突、资源浪费和数据不一致问题。

#### 验收标准

1. WHEN 应用程序启动时，THE SurrealDB_Service SHALL 在启动新服务器前检查目标端口是否已被占用
2. IF 目标端口已被占用，THEN THE SurrealDB_Service SHALL 识别占用该端口的进程 PID
3. IF 占用端口的进程是之前的 SurrealDB 实例，THEN THE SurrealDB_Service SHALL 尝试优雅关闭该进程
4. IF 优雅关闭在 5 秒内未成功，THEN THE SurrealDB_Service SHALL 强制终止占用端口的进程
5. WHEN 清理残余进程后，THE SurrealDB_Service SHALL 验证端口已释放后再启动新服务器
6. WHEN 绑定端口时，THE SurrealDB_Service SHALL 配置 Socket 选项以允许地址重用（SO_REUSEADDR）
7. WHEN 监听系统关闭信号时，THE SurrealDB_Service SHALL 注册 SIGINT 和 SIGTERM 信号处理器
8. WHEN 接收到关闭信号时，THE SurrealDB_Service SHALL 执行优雅关闭流程并显式释放端口
9. WHEN 启动 Server_Process 时，THE SurrealDB_Service SHALL 确保子进程与父进程生命周期绑定
10. IF 父进程异常终止，THEN THE 操作系统 SHALL 自动清理子进程及其占用的端口
11. WHEN 检测到端口处于 TIME_WAIT 状态时，THE SurrealDB_Service SHALL 等待最多 2 秒后重试绑定
12. IF 端口清理和重试后仍无法启动，THEN THE SurrealDB_Service SHALL 记录详细错误信息并抛出异常
