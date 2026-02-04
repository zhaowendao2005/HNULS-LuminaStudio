import { app } from 'electron'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { logger } from '../logger'

// 创建模块作用域日志器
const log = logger.scope('SqliteTestService')

/**
 * SqliteTestService
 * 专门用于测试 SQLite 是否可用，验证 better-sqlite3 模块功能
 */
export class SqliteTestService {
  private db: Database.Database | null = null
  private dbPath: string

  constructor() {
    // 获取用户数据目录并创建 databases/test 子目录
    const userDataPath = app.getPath('userData')
    const dbDir = path.join(userDataPath, 'databases', 'test')

    // 确保目录存在
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    this.dbPath = path.join(dbDir, 'sqlitetest.db')
  }

  /**
   * 初始化测试数据库连接并创建测试表结构
   */
  initialize(): void {
    try {
      // 打开或创建数据库
      this.db = new Database(this.dbPath)

      log.info('SQLite test database initialized', { path: this.dbPath })

      // 启用外键约束
      this.db.pragma('foreign_keys = ON')

      // 创建测试表结构
      this.createTables()
    } catch (error) {
      log.error('Failed to initialize SQLite test database', error)
      throw error
    }
  }

  /**
   * 创建测试数据库表结构
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

    log.debug('Test tables created successfully')
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
      log.info('SQLite test database connection closed')
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
    log.info('SQLite test database backed up', { path: backupPath })
  }
}

export const sqliteTestService = new SqliteTestService()
