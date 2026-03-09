import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { ModelConfigService, type ModelConfig } from './model-config-service'
import { BASE_CONFIG_TABLES } from '../database-sqlite/schema/base-config/tables'

function createService() {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')

  for (const table of BASE_CONFIG_TABLES) {
    db.exec(table.createSQL)
  }

  const databaseManager = {
    getDatabase: () => db
  }

  const service = new ModelConfigService(databaseManager as never)
  return { db, service }
}

function createConfig(): ModelConfig {
  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    activeProviderId: 'provider-a',
    providers: [
      {
        id: 'provider-a',
        name: 'Provider A',
        protocol: 'openai',
        enabled: true,
        baseUrl: 'https://a.example.com',
        apiKey: 'key-a',
        models: [
          { id: 'shared-model', displayName: 'Shared Model' },
          { id: 'provider-a-only', displayName: 'Provider A Only' }
        ]
      },
      {
        id: 'provider-b',
        name: 'Provider B',
        protocol: 'openai',
        enabled: true,
        baseUrl: 'https://b.example.com',
        apiKey: 'key-b',
        models: [
          { id: 'shared-model', displayName: 'Shared Model' },
          { id: 'provider-b-only', displayName: 'Provider B Only' }
        ]
      }
    ]
  }
}

describe('ModelConfigService', () => {
  let db: Database.Database
  let service: ModelConfigService

  beforeEach(() => {
    const setup = createService()
    db = setup.db
    service = setup.service
  })

  it('allows the same model id to be saved under different providers', async () => {
    const saved = await service.updateConfig(createConfig())

    expect(saved.version).toBe(2)
    expect(saved.providers).toHaveLength(2)
    expect(saved.providers[0].models.map((model) => model.id)).toContain('shared-model')
    expect(saved.providers[1].models.map((model) => model.id)).toContain('shared-model')

    const rows = db
      .prepare('SELECT provider_id, id FROM model_configs WHERE id = ? ORDER BY provider_id')
      .all('shared-model') as Array<{ provider_id: string; id: string }>

    expect(rows).toEqual([
      { provider_id: 'provider-a', id: 'shared-model' },
      { provider_id: 'provider-b', id: 'shared-model' }
    ])
  })

  it('rejects duplicate model ids within the same provider and rolls back the transaction', async () => {
    const invalidConfig = createConfig()
    invalidConfig.providers[0].models.push({
      id: 'shared-model',
      displayName: 'Duplicate Shared Model'
    })

    await expect(service.updateConfig(invalidConfig)).rejects.toThrow(
      'Duplicate model id "shared-model" found in provider "provider-a". Model ids must be unique within a provider.'
    )

    const providerCount = db.prepare('SELECT COUNT(*) AS count FROM model_providers').get() as {
      count: number
    }
    const modelCount = db.prepare('SELECT COUNT(*) AS count FROM model_configs').get() as {
      count: number
    }

    expect(providerCount.count).toBe(0)
    expect(modelCount.count).toBe(0)
  })
})
