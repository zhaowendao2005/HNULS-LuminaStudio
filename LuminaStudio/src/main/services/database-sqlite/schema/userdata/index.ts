import type { DatabaseSchema } from '../../types'
import { USERDATA_TABLES } from './tables'

export const USERDATA_SCHEMA: DatabaseSchema = {
  name: 'userdata',
  version: 14,
  tables: USERDATA_TABLES
}
