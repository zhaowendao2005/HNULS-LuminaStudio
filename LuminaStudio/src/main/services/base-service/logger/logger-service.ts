import log from 'electron-log'

/**
 * 日志级别类型
 * - error: 仅输出错误
 * - warn: 输出警告和错误
 * - info: 输出一般信息、警告和错误（默认）
 * - debug: 输出调试信息及以上
 * - verbose: 输出详细信息及以上
 * - silly: 输出所有信息
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose' | 'silly'

/**
 * 日志上下文接口
 * 用于结构化日志输出
 */
export interface LogContext {
  [key: string]: unknown
}

/**
 * LoggerService - 基于 electron-log 的日志服务
 *
 * 功能：
 * - 同时输出到 Electron 控制台和 AppData 日志文件
 * - 通过环境变量 LOG_LEVEL 控制日志级别
 * - 支持分级日志：error、warn、info、debug、verbose、silly
 * - 支持结构化上下文日志
 * - 单例模式，全局访问
 *
 * 日志文件位置：
 * - Windows: %APPDATA%\{app name}\logs\main.log
 * - macOS: ~/Library/Logs/{app name}/main.log
 * - Linux: ~/.config/{app name}/logs/main.log
 *
 * 使用方式：
 * ```typescript
 * import { logger } from '@main/services/base-service/logger'
 *
 * logger.info('Application started')
 * logger.debug('Processing data', { count: 100, type: 'batch' })
 * logger.error('Failed to connect', error)
 * ```
 */
export class LoggerService {
  private static instance: LoggerService
  private currentLevel: LogLevel

  private constructor() {
    this.currentLevel = this.getInitialLogLevel()
    this.configure()
  }

  /**
   * 获取 LoggerService 单例实例
   */
  static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService()
    }
    return LoggerService.instance
  }

  /**
   * 从环境变量获取初始日志级别
   */
  private getInitialLogLevel(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase()
    const validLevels: LogLevel[] = ['error', 'warn', 'info', 'debug', 'verbose', 'silly']

    if (envLevel && validLevels.includes(envLevel as LogLevel)) {
      return envLevel as LogLevel
    }

    // 默认：开发环境使用 debug，生产环境使用 info
    return process.env.NODE_ENV === 'development' ? 'debug' : 'info'
  }

  /**
   * 配置日志服务
   */
  private configure(): void {
    // 配置控制台输出（Electron DevTools 控制台）
    log.transports.console.level = this.currentLevel
    log.transports.console.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}'

    // 配置文件输出（AppData 目录）
    log.transports.file.level = this.currentLevel
    log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}'
    log.transports.file.maxSize = 10 * 1024 * 1024 // 10MB 自动轮转

    // 捕获未处理的异常和 Promise 拒绝
    log.catchErrors({
      showDialog: false,
      onError: (error) => {
        this.error('Uncaught exception', error)
      }
    })

    // 输出初始化信息
    this.info(`[LoggerService] Initialized with level: ${this.currentLevel}`)
    this.debug(`[LoggerService] Log file: ${this.getLogPath()}`)
    this.debug(`[LoggerService] Environment: ${process.env.NODE_ENV || 'unknown'}`)
  }

  /**
   * 格式化上下文对象为字符串
   */
  private formatContext(context?: LogContext): string {
    if (!context || Object.keys(context).length === 0) {
      return ''
    }
    try {
      return ' ' + JSON.stringify(context)
    } catch {
      return ' [Context serialization failed]'
    }
  }

  /**
   * 记录 silly 级别日志（最详细）
   */
  silly(message: string, context?: LogContext): void {
    log.silly(message + this.formatContext(context))
  }

  /**
   * 记录 verbose 级别日志
   */
  verbose(message: string, context?: LogContext): void {
    log.verbose(message + this.formatContext(context))
  }

  /**
   * 记录 debug 级别日志
   */
  debug(message: string, context?: LogContext): void {
    log.debug(message + this.formatContext(context))
  }

  /**
   * 记录 info 级别日志
   */
  info(message: string, context?: LogContext): void {
    log.info(message + this.formatContext(context))
  }

  /**
   * 记录 warn 级别日志
   */
  warn(message: string, context?: LogContext): void {
    log.warn(message + this.formatContext(context))
  }

  /**
   * 记录 error 级别日志
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const contextStr = this.formatContext(context)
    if (error instanceof Error) {
      log.error(`${message}${contextStr}`, error.message, error.stack)
    } else if (error !== undefined) {
      log.error(`${message}${contextStr}`, error)
    } else {
      log.error(message + contextStr)
    }
  }

  /**
   * 动态调整日志级别
   */
  setLevel(level: LogLevel): void {
    this.currentLevel = level
    log.transports.console.level = level
    log.transports.file.level = level
    this.info(`[LoggerService] Log level changed to: ${level}`)
  }

  /**
   * 获取当前日志级别
   */
  getLevel(): LogLevel {
    return this.currentLevel
  }

  /**
   * 获取日志文件路径
   */
  getLogPath(): string {
    return log.transports.file.getFile()?.path || ''
  }

  /**
   * 创建带有固定前缀的子日志器
   * 用于模块/服务级别的日志标识
   *
   * @example
   * const dbLogger = logger.scope('DatabaseService')
   * dbLogger.info('Connected') // 输出: [DatabaseService] Connected
   */
  scope(prefix: string): ScopedLogger {
    return new ScopedLogger(this, prefix)
  }
}

/**
 * 带有固定前缀的子日志器
 */
export class ScopedLogger {
  constructor(
    private parent: LoggerService,
    private prefix: string
  ) {}

  private format(message: string): string {
    return `[${this.prefix}] ${message}`
  }

  silly(message: string, context?: LogContext): void {
    this.parent.silly(this.format(message), context)
  }

  verbose(message: string, context?: LogContext): void {
    this.parent.verbose(this.format(message), context)
  }

  debug(message: string, context?: LogContext): void {
    this.parent.debug(this.format(message), context)
  }

  info(message: string, context?: LogContext): void {
    this.parent.info(this.format(message), context)
  }

  warn(message: string, context?: LogContext): void {
    this.parent.warn(this.format(message), context)
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    this.parent.error(this.format(message), error, context)
  }
}

// 导出单例实例
export const logger = LoggerService.getInstance()
