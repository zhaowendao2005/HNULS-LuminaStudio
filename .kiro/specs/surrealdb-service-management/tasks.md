# 实现计划：SurrealDB 服务管理系统

## 概述

本计划将 SurrealDB 服务管理系统的设计转化为可执行的编码任务。采用增量开发方式，每个任务都建立在前一个任务的基础上，确保代码始终可运行。

## 任务列表

- [x] 1. 安装依赖并设置项目基础
  - 安装 `electron-log` 依赖
  - 验证 `vendor/surrealdb/surreal-v2.4.0.windows-amd64.exe` 存在
  - _需求: 1.1, 1.2, 6.1_

- [x] 2. 实现日志服务
  - [x] 2.1 创建 LoggerService 基于 electron-log
    - 创建 `src/main/services/logger/logger-service.ts`
    - 实现单例模式
    - 配置控制台和文件输出
    - 支持环境变量 `LOG_LEVEL` 控制日志级别
    - _需求: 6.1, 6.2, 6.3, 6.4, 6.5, 6.8, 6.9_
  - [x] 2.2 创建 logger 模块导出
    - 创建 `src/main/services/logger/index.ts`
    - _需求: 6.9_

- [x] 3. 实现类型定义和配置
  - [x] 3.1 创建类型定义文件
    - 创建 `src/main/services/surrealdb-service/types.ts`
    - 定义 ServerStatus 枚举
    - 定义 ServerEvent 类型
    - 定义 EventHandler 类型
    - 定义 ISurrealDBService 接口
    - _需求: 7.1-7.4, 9.6, 9.7_
  - [x] 3.2 创建配置定义文件
    - 创建 `src/main/services/surrealdb-service/config.ts`
    - 定义 SurrealDBConfig 接口
    - 定义 DEFAULT_CONFIG 常量
    - 实现 loadConfigFromEnv 函数
    - _需求: 10.1, 10.2, 10.3, 10.7_

- [x] 4. 实现事件钩子系统
  - [x] 4.1 创建 HookSystem 类
    - 创建 `src/main/services/surrealdb-service/hook-system.ts`
    - 继承 EventEmitter
    - 实现 on/off/emit 方法
    - 实现错误隔离（监听器错误不影响其他监听器）
    - _需求: 7.10, 7.11, 7.12_

- [x] 5. 实现端口管理器
  - [x] 5.1 创建 PortManager 类
    - 创建 `src/main/services/surrealdb-service/port-manager.ts`
    - 实现 isPortAvailable 方法（使用 net 模块）
    - 实现 allocatePort 方法（默认 8000，范围 8000-8100）
    - 实现 findProcessOnPort 方法（Windows netstat）
    - 实现 isSurrealDBProcess 方法（Windows tasklist）
    - 实现 killProcess 方法（Windows taskkill）
    - 实现 waitForPortRelease 方法（处理 TIME_WAIT）
    - 实现 releasePort 方法
    - _需求: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 11.1, 11.2, 11.3, 11.4, 11.5, 11.11_

- [x] 6. Checkpoint - 验证基础组件
  - 确保 LoggerService、HookSystem、PortManager 可以独立工作
  - 如有问题请询问用户

- [x] 7. 实现 Schema 定义
  - [x] 7.1 创建 Schema 类型和基础表
    - 创建 `src/main/services/surrealdb-service/schema/tables.ts`
    - 定义 TableDefinition 接口
    - 创建示例用户表定义（userTable）
    - _需求: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 7.2 创建 Schema 导出
    - 创建 `src/main/services/surrealdb-service/schema/index.ts`
    - 导出 schemas 数组
    - _需求: 5.6, 5.7_

- [x] 8. 实现模式管理器
  - [x] 8.1 创建 SchemaManager 类
    - 创建 `src/main/services/surrealdb-service/schema-manager.ts`
    - 实现 initializeSchema 方法
    - 实现 importSchema 方法（通过 surreal sql 命令执行）
    - 实现 validateSchema 方法
    - 实现 getSchemaDefinitions 方法（从 TypeScript 模块加载）
    - _需求: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.9_

- [x] 9. 实现错误处理器
  - [x] 9.1 创建 ErrorHandler 类
    - 创建 `src/main/services/surrealdb-service/error-handler.ts`
    - 实现 handleStartupError 方法
    - 实现 handleRuntimeError 方法
    - 实现 handleShutdownError 方法
    - _需求: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x] 10. 实现 SurrealDB 核心服务
  - [x] 10.1 创建 SurrealDBService 类基础结构
    - 创建 `src/main/services/surrealdb-service/surrealdb-service.ts`
    - 实现构造函数（初始化依赖组件）
    - 实现 getSurrealExePath 方法（开发/生产环境路径）
    - 实现 getServerUrl 方法
    - 实现 getCredentials 方法
    - 实现 isRunning 方法
    - 实现 getStatus 方法
    - _需求: 1.1, 1.2, 1.3, 9.4, 9.5, 9.6, 9.7_

  - [x] 10.2 实现服务器启动逻辑
    - 实现 initialize 方法（验证 exe 存在、分配端口）
    - 实现 buildStartArgs 方法（构建命令行参数）
    - 实现 startServerProcess 方法（spawn 进程）
    - 实现 waitForServerReady 方法（使用 is-ready 命令）
    - 实现 checkServerReady 方法
    - 实现 start 方法（协调启动流程）
    - _需求: 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 8.2_
  - [x] 10.3 实现服务器关闭逻辑
    - 实现 shutdown 方法（SIGINT + 超时强制终止）
    - 实现 waitForProcessExit 方法
    - 实现 cleanup 方法
    - 实现信号处理器注册（SIGINT、SIGTERM）
    - _需求: 1.5, 1.6, 1.7, 11.7, 11.8, 11.9_
  - [x] 10.4 实现事件订阅接口
    - 实现 on 方法
    - 实现 off 方法
    - 集成 HookSystem 发出所有生命周期事件
    - _需求: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9_

- [x] 11. 创建模块导出
  - [x] 11.1 创建 surrealdb-service 模块导出
    - 创建 `src/main/services/surrealdb-service/index.ts`
    - 导出 SurrealDBService
    - 导出类型定义
    - _需求: 9.1_
  - [x] 11.2 更新 services 总导出
    - 修改 `src/main/services/index.ts`
    - 添加 SurrealDBService 导出
    - 添加 LoggerService 导出
    - _需求: 9.1_

- [x] 12. Checkpoint - 验证 SurrealDB 服务
  - 确保 SurrealDBService 可以独立启动和关闭
  - 验证端口分配和清理逻辑
  - 如有问题请询问用户

- [x] 13. 集成到 AppService
  - [x] 13.1 修改 AppService 集成 SurrealDB
    - 修改 `src/main/services/base-service/app-service.ts`
    - 添加 SurrealDBService 实例
    - 在 initialize 中启动 SurrealDB（窗口创建前）
    - 在 shutdown 中关闭 SurrealDB（窗口关闭后）
    - 注册 SurrealDB 事件监听器
    - _需求: 9.1, 9.2, 9.3_

- [x] 14. 更新 Electron Builder 配置
  - [x] 14.1 修改打包配置
    - 修改 `electron-builder.yml`
    - 添加 vendor/surrealdb 到 extraResources
    - _需求: 1.3_

- [x] 15. 最终验证
  - 运行 `pnpm run dev` 验证开发环境
  - 验证 SurrealDB 服务正常启动
  - 验证日志输出到控制台和文件
  - 验证应用关闭时服务正确清理
  - 如有问题请询问用户

## 注意事项

- 任务按顺序执行，每个任务都依赖前面的任务
- Checkpoint 任务用于验证阶段性成果
- 所有代码使用 TypeScript 编写
- 遵循现有项目的代码风格和架构模式
- 测试任务标记为可选（*），可根据需要跳过
