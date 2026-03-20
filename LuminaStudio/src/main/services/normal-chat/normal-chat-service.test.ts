import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import type { NormalChatWorkspaceSnapshot } from '@preload/types'
import { USERDATA_TABLES } from '../database-sqlite/schema/userdata/tables'
import { NormalChatService } from './normal-chat-service'

function createService() {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')

  for (const table of USERDATA_TABLES) {
    db.exec(table.createSQL)
  }

  const databaseManager = {
    getDatabase: () => db
  }

  const service = new NormalChatService(databaseManager as never)
  return { db, service }
}

function getOnlyAssistantId(snapshot: NormalChatWorkspaceSnapshot): string {
  expect(snapshot.assistants).toHaveLength(1)
  return snapshot.assistants[0].id
}

describe('NormalChatService', () => {
  let db: Database.Database
  let service: NormalChatService

  beforeEach(() => {
    const setup = createService()
    db = setup.db
    service = setup.service
  })

  it('bootstraps an empty userdata database with a default assistant and topic', async () => {
    const bootstrap = await service.getBootstrap()

    expect(bootstrap.templates.map((template) => template.key)).toEqual(['base-agent'])
    expect(bootstrap.workspace.assistants).toHaveLength(1)

    const assistant = bootstrap.workspace.assistants[0]
    const topics = bootstrap.workspace.topicsByAssistantId[assistant.id]

    expect(assistant.templateKey).toBe('base-agent')
    expect(topics).toHaveLength(1)
    expect(topics[0].title).toBe('默认话题')
    expect(bootstrap.workspace.activeAssistantId).toBe(assistant.id)
    expect(bootstrap.workspace.activeTopicId).toBe(topics[0].id)
  })

  it('creates an assistant and immediately seeds a default topic for it', async () => {
    const initial = await service.getBootstrap()
    const nextSnapshot = await service.createAssistant('base-agent')

    expect(nextSnapshot.assistants).toHaveLength(2)
    expect(nextSnapshot.activeAssistantId).not.toBe(initial.workspace.activeAssistantId)

    const activeTopics = nextSnapshot.topicsByAssistantId[nextSnapshot.activeAssistantId]
    expect(activeTopics).toHaveLength(1)
    expect(activeTopics[0].title).toBe('默认话题')
    expect(nextSnapshot.activeTopicId).toBe(activeTopics[0].id)
  })

  it('recreates a default topic when deleting the last topic of an assistant', async () => {
    const bootstrap = await service.getBootstrap()
    const assistantId = getOnlyAssistantId(bootstrap.workspace)
    const topicId = bootstrap.workspace.topicsByAssistantId[assistantId][0].id

    const nextSnapshot = await service.deleteTopic({ assistantId, topicId })
    const topics = nextSnapshot.topicsByAssistantId[assistantId]

    expect(topics).toHaveLength(1)
    expect(topics[0].title).toBe('默认话题')
    expect(topics[0].id).not.toBe(topicId)
    expect(nextSnapshot.activeTopicId).toBe(topics[0].id)
  })

  it('keeps override topic prompts independent from assistant default prompt updates', async () => {
    const bootstrap = await service.getBootstrap()
    const assistantId = getOnlyAssistantId(bootstrap.workspace)
    const inheritedTopicId = bootstrap.workspace.topicsByAssistantId[assistantId][0].id

    const overrideSnapshot = await service.createTopic(assistantId)
    const overrideTopic = overrideSnapshot.topicsByAssistantId[assistantId].find(
      (topic) => topic.id !== inheritedTopicId
    )
    expect(overrideTopic).toBeTruthy()

    const overrideTopicId = overrideTopic!.id
    await service.updateTopicPrompt({
      assistantId,
      topicId: overrideTopicId,
      mode: 'override',
      promptOverride: '只给当前话题使用的覆盖提示词'
    })

    const afterAssistantUpdate = await service.updateAssistant({
      assistantId,
      defaultSystemPrompt: '新的助手默认提示词'
    })

    const inheritedTopic = afterAssistantUpdate.topicsByAssistantId[assistantId].find(
      (topic) => topic.id === inheritedTopicId
    )
    const updatedOverrideTopic = afterAssistantUpdate.topicsByAssistantId[assistantId].find(
      (topic) => topic.id === overrideTopicId
    )

    expect(afterAssistantUpdate.assistants[0].defaultSystemPrompt).toBe('新的助手默认提示词')
    expect(inheritedTopic?.systemPromptMode).toBe('inherit')
    expect(updatedOverrideTopic?.systemPromptMode).toBe('override')
    expect(updatedOverrideTopic?.systemPromptOverride).toBe('只给当前话题使用的覆盖提示词')

    const row = db
      .prepare(
        `
          SELECT system_prompt_mode, system_prompt_override
          FROM normal_chat_topics
          WHERE id = ?
        `
      )
      .get(overrideTopicId) as { system_prompt_mode: string; system_prompt_override: string }

    expect(row).toEqual({
      system_prompt_mode: 'override',
      system_prompt_override: '只给当前话题使用的覆盖提示词'
    })
  })
})
