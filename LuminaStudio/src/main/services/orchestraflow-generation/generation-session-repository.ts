import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { OFGenerationSession } from '@shared/Orchestraflow-types'
import { logger } from '@main/services/logger'

const log = logger.scope('OFGenerationSessionRepository')

function getGenerationSessionDir(): string {
  const dir = join(app.getPath('userData'), 'UserData', 'OrchestraflowGenerationSessions')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function getSessionPath(id: string): string {
  return join(getGenerationSessionDir(), `${id}.json`)
}

export class GenerationSessionRepository {
  list(): OFGenerationSession[] {
    const dir = getGenerationSessionDir()
    return readdirSync(dir)
      .filter((name) => name.endsWith('.json'))
      .map((name) => {
        try {
          return JSON.parse(readFileSync(join(dir, name), 'utf-8')) as OFGenerationSession
        } catch (error) {
          log.warn('Failed to parse generation session file', {
            name,
            error: error instanceof Error ? error.message : String(error)
          })
          return null
        }
      })
      .filter(Boolean) as OFGenerationSession[]
  }

  get(id: string): OFGenerationSession | null {
    const path = getSessionPath(id)
    if (!existsSync(path)) return null
    return JSON.parse(readFileSync(path, 'utf-8')) as OFGenerationSession
  }

  save(session: OFGenerationSession): OFGenerationSession {
    writeFileSync(getSessionPath(session.id), JSON.stringify(session, null, 2), 'utf-8')
    return session
  }

  delete(id: string): boolean {
    const path = getSessionPath(id)
    if (!existsSync(path)) return false
    unlinkSync(path)
    return true
  }
}
