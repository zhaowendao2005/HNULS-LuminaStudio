import type { DatabaseSchema } from '../../types'
import { BASE_CONFIG_TABLES } from './tables'

/**
 * BaseConfig 数据库 Schema 配置
 */
export const BASE_CONFIG_SCHEMA: DatabaseSchema = {
  name: 'BaseConfig',
  version: 1,
  tables: BASE_CONFIG_TABLES
}
