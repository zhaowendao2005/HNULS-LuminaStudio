/**
 * Logger 模块
 *
 * 提供基于 electron-log 的分级日志服务
 *
 * @example
 * ```typescript
 * import { logger } from '@main/services/base-service/logger'
 *
 * // 基础用法
 * logger.info('Application started')
 * logger.debug('Processing data', { count: 100 })
 * logger.error('Failed to connect', error)
 *
 * // 创建模块作用域日志器
 * const dbLogger = logger.scope('DatabaseService')
 * dbLogger.info('Connected') // 输出: [DatabaseService] Connected
 * ```
 *
 * 日志级别（从低到高）：
 * - silly: 最详细，用于追踪
 * - verbose: 详细信息
 * - debug: 调试信息
 * - info: 一般信息（默认）
 * - warn: 警告
 * - error: 错误
 *
 * 通过环境变量设置日志级别：
 * - LOG_LEVEL=debug npm run dev
 * - 或使用预定义脚本：npm run dev:debug
 */

export { LoggerService, ScopedLogger, logger } from './logger-service'
export type { LogLevel, LogContext } from './logger-service'
