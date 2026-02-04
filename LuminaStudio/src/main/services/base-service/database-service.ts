import { app } from 'electron'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { logger } from '../logger'

// 创建模块作用域日志器
const log = logger.scope('DatabaseService')

/**
 * DatabaseService
 * 负责 SQLite 数据库的初始化、连接管理和基础操作。
 */
export class DatabaseService {
  private db: Database.Database | null = null
  private dbPath: string

  constructor() {
    ensureAppDisplayName()
    // 获取用户数据目录并创建 databases 子目录
    const userDataPath = app.getPath('userData')
    const dbDir = path.join(userDataPath, 'databases')

    // 确保目录存在
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    this.dbPath = path.join(dbDir, 'app.db')
  }

  /**
   * 初始化数据库连接并创建初始表结构
   */
  initialize(): void {
    try {
      // 打开或创建数据库
      this.db = new Database(this.dbPath)

      log.info('Database initialized', { path: this.dbPath })

      // 启用外键约束
      this.db.pragma('foreign_keys = ON')

      // 创建初始表结构
      this.createTables()
    } catch (error) {
      log.error('Failed to initialize database', error)
      throw error
    }
  }

  /**
   * 创建初始数据库表结构
   */
  private createTables(): void {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    // 示例：创建用户表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 示例：创建配置表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    log.debug('Tables created successfully')
  }

  /**
   * 获取数据库实例
   */
  getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.')
    }
    return this.db
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      log.info('Database connection closed')
    }
  }

  /**
   * 执行数据库备份
   */
  backup(backupPath: string): void {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    this.db.backup(backupPath)
    log.info('Database backed up', { path: backupPath })
  }
}

export const databaseService = new DatabaseService()
