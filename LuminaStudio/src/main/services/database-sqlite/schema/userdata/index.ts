import type { DatabaseSchema } from '../../types'
import { USERDATA_TABLES } from './tables'

export const USERDATA_SCHEMA: DatabaseSchema = {
  name: 'userdata',
  // 21: normal-chat 新增知识库检索 / KG 检索 functioncall 配置字段。
  version: 21,
  tables: USERDATA_TABLES
}
