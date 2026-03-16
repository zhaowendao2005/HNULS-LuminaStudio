import type { DatabaseSchema } from '../../types'
import { ORCHESTFLOW_GENERATION_EDITOR_TABLES } from './tables'

export const ORCHESTFLOW_GENERATION_EDITOR_SCHEMA: DatabaseSchema = {
  name: 'orchestflow-generation-editor',
  version: 8,
  tables: ORCHESTFLOW_GENERATION_EDITOR_TABLES
}
