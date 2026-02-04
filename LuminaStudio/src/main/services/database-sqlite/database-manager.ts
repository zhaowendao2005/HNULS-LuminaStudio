import { app } from 'electron'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { logger } from '../logger'
import type { DatabaseSchema, DatabaseInstance } from './types'
import { BASE_CONFIG_SCHEMA } from './schema/base-config'

const log = logger.scope('DatabaseManager')

/**
 * DatabaseManager
 *
 * 管理多个 SQLite 数据库实例的生命周期
 * 职责：
 * - 注册数据库 Schema
 * - 启动时校验/重建数据库
 * - 提供统一的数据库访问接口
 * - 应用退出时关闭所有连接
 */
export class DatabaseManager {
  private databases: Map<string, DatabaseInstance> = new Map()
  private schemas: Map<string, DatabaseSchema> = new Map()
  private dbDir: string

  constructor() {
    const userDataPath = app.getPath('userData')
    this.dbDir = path.join(userDataPath, 'databases')

    // 注册所有数据库 Schema
    this.registerSchema(BASE_CONFIG_SCHEMA)
  }

  /**
   * 注册数据库 Schema
   */
  private registerSchema(schema: DatabaseSchema): void {
    this.schemas.set(schema.name, schema)
    log.debug(`Schema registered: ${schema.name} (version ${schema.version})`)
  }

  /**
   * 初始化所有注册的数据库
   */
  initialize(): void {
    // 确保 databases 目录存在
    if (!fs.existsSync(this.dbDir)) {
      fs.mkdirSync(this.dbDir, { recursive: true })
      log.info('Database directory created', { path: this.dbDir })
    }

    // 初始化所有注册的数据库
    for (const [name, schema] of this.schemas) {
      try {
        this.initializeDatabase(schema)
        log.info(`Database initialized: ${name}`)
      } catch (error) {
        log.error(`Failed to initialize database: ${name}`, error)
        throw error
      }
    }
  }

  /**
   * 初始化单个数据库
   */
  private initializeDatabase(schema: DatabaseSchema): void {
    const dbPath = path.join(this.dbDir, `${schema.name}.db`)
    const exists = fs.existsSync(dbPath)

    // 如果数据库不存在，直接创建
    if (!exists) {
      log.info(`Creating new database: ${schema.name}`, { path: dbPath })
      this.createDatabase(schema, dbPath)
      return
    }

    // 数据库存在，校验版本和表结构
    log.debug(`Validating existing database: ${schema.name}`)
    const isValid = this.validateDatabase(schema, dbPath)

    if (!isValid) {
      log.warn(`Database validation failed, rebuilding: ${schema.name}`)
      // 删除旧数据库文件
      fs.unlinkSync(dbPath)
      // 重新创建
      this.createDatabase(schema, dbPath)
    } else {
      // 校验通过，打开数据库
      const db = new Database(dbPath)
      db.pragma('foreign_keys = ON')

      this.databases.set(schema.name, {
        name: schema.name,
        db,
        path: dbPath
      })

      log.info(`Database validated and opened: ${schema.name}`)
    }
  }

  /**
   * 创建新数据库
   */
  private createDatabase(schema: DatabaseSchema, dbPath: string): void {
    const db = new Database(dbPath)
    db.pragma('foreign_keys = ON')

    // 创建所有表
    for (const table of schema.tables) {
      db.exec(table.createSQL)
      log.debug(`Table created: ${table.name}`)
    }

    // 插入版本信息（仅针对 _schema_version 表）
    const hasVersionTable = schema.tables.some((t) => t.name === '_schema_version')
    if (hasVersionTable) {
      db.prepare('INSERT OR REPLACE INTO _schema_version (id, version) VALUES (1, ?)').run(
        schema.version
      )
      log.debug(`Schema version set: ${schema.version}`)
    }

    this.databases.set(schema.name, {
      name: schema.name,
      db,
      path: dbPath
    })

    log.info(`Database created successfully: ${schema.name}`, { path: dbPath })
  }

  /**
   * 校验数据库版本和表结构
   */
  private validateDatabase(schema: DatabaseSchema, dbPath: string): boolean {
    let db: Database.Database | null = null

    try {
      db = new Database(dbPath)
      db.pragma('foreign_keys = ON')

      // 1. 检查版本
      const hasVersionTable = schema.tables.some((t) => t.name === '_schema_version')
      if (hasVersionTable) {
        const versionRow = db.prepare('SELECT version FROM _schema_version WHERE id = 1').get() as
          | { version: number }
          | undefined

        if (!versionRow) {
          log.warn('Version table exists but no version record found')
          return false
        }

        if (versionRow.version !== schema.version) {
          log.warn(`Version mismatch: expected ${schema.version}, got ${versionRow.version}`)
          return false
        }

        log.debug(`Version validated: ${versionRow.version}`)
      }

      // 2. 检查所有表是否存在
      for (const table of schema.tables) {
        const tableExists = db
          .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
          .get(table.name)

        if (!tableExists) {
          log.warn(`Table missing: ${table.name}`)
          return false
        }

        log.debug(`Table validated: ${table.name}`)
      }

      return true
    } catch (error) {
      log.error('Database validation error', error)
      return false
    } finally {
      if (db) {
        db.close()
      }
    }
  }

  /**
   * 获取数据库实例
   */
  getDatabase(name: string): Database.Database {
    const instance = this.databases.get(name)
    if (!instance) {
      throw new Error(`Database not found: ${name}. Did you forget to initialize?`)
    }
    return instance.db
  }

  /**
   * 关闭所有数据库连接
   */
  close(): void {
    for (const [name, instance] of this.databases) {
      try {
        instance.db.close()
        log.info(`Database closed: ${name}`)
      } catch (error) {
        log.error(`Failed to close database: ${name}`, error)
      }
    }
    this.databases.clear()
  }
}

export const databaseManager = new DatabaseManager()
