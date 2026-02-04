import type { DatabaseSchema } from '../../types'
import { USERDATA_TABLES } from './tables'

/**
 * Userdata 数据库 Schema 配置
 * 
 * 用于存储 AI 对话、消息、thinking、工具调用等数据
 */
export const USERDATA_SCHEMA: DatabaseSchema = {
  name: 'userdata',
  version: 2,
  tables: USERDATA_TABLES
}
