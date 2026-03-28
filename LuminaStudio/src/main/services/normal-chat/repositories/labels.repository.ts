import type Database from 'better-sqlite3'
import type { NormalChatLabel } from '@preload/types'
import type { LabelRow } from '../shared/rows'

export class NormalChatLabelsRepository {
  constructor(private readonly db: Database.Database) {}

  count(): number {
    const row = this.db.prepare('SELECT COUNT(*) AS count FROM normal_chat_labels').get() as {
      count: number
    }
    return row.count
  }

  list(): NormalChatLabel[] {
    return (
      this.db
        .prepare(
          'SELECT id, name, sort_order FROM normal_chat_labels ORDER BY sort_order, created_at'
        )
        .all() as LabelRow[]
    ).map((row) => ({
      id: row.id,
      name: row.name,
      sortOrder: row.sort_order
    }))
  }

  create(labelId: string, name: string, sortOrder: number, timestamp: string): void {
    this.db
      .prepare(
        `INSERT INTO normal_chat_labels (id, name, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(labelId, name, sortOrder, timestamp, timestamp)
  }

  rename(labelId: string, name: string, timestamp: string): void {
    this.db
      .prepare('UPDATE normal_chat_labels SET name = ?, updated_at = ? WHERE id = ?')
      .run(name, timestamp, labelId)
  }

  delete(labelId: string): void {
    this.db.prepare('DELETE FROM normal_chat_labels WHERE id = ?').run(labelId)
  }
}
