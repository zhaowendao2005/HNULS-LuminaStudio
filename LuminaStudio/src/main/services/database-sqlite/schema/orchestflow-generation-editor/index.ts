import type { DatabaseSchema } from '../../types'
import { ORCHESTFLOW_GENERATION_EDITOR_TABLES } from './tables'

/**
 * GenerateView 独立数据库 schema。
 *
 * 注意：这里按你的要求保留 orchestflow 拼写，最终生成的文件名会是：
 * orchestflow-generation-editor.db
 */
export const ORCHESTFLOW_GENERATION_EDITOR_SCHEMA: DatabaseSchema = {
  name: 'orchestflow-generation-editor',
  version: 3,
  tables: ORCHESTFLOW_GENERATION_EDITOR_TABLES
}
