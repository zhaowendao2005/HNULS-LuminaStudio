import type { DatabaseSchema } from '../../types'
import { ORCHESTRAFLOW_RUNTIME_TABLES } from './tables'

export const ORCHESTRAFLOW_RUNTIME_SCHEMA: DatabaseSchema = {
  name: 'orchestraflow-runtime',
  version: 1,
  tables: ORCHESTRAFLOW_RUNTIME_TABLES
}
