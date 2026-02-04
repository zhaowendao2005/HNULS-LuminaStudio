import type Database from 'better-sqlite3'

/**
 * 表结构定义
 */
export interface TableDefinition {
  /** 表名 */
  name: string
  /** 创建表的 SQL 语句 */
  createSQL: string
}

/**
 * 数据库 Schema 配置
 */
export interface DatabaseSchema {
  /** 数据库名称（对应文件名） */
  name: string
  /** Schema 版本号 */
  version: number
  /** 表结构定义列表 */
  tables: TableDefinition[]
}

/**
 * 数据库实例包装
 */
export interface DatabaseInstance {
  /** 数据库名称 */
  name: string
  /** better-sqlite3 数据库实例 */
  db: Database.Database
  /** 数据库文件路径 */
  path: string
}
