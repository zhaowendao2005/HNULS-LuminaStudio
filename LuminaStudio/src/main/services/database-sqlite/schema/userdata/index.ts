import type { DatabaseSchema } from '../../types'
import { USERDATA_TABLES } from './tables'

export const USERDATA_SCHEMA: DatabaseSchema = {
  name: 'userdata',
  // 20: 完成 normal-chat request-trace 单源切换。
  version: 20,
  tables: USERDATA_TABLES
}
