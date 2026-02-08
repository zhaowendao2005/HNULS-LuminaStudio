import type { MessageComponentMockCase } from './types'

type MockModule = {
  mockCase?: MessageComponentMockCase
  default?: MessageComponentMockCase
}

const modules = import.meta.glob('./MessageComponents-*.mock.ts', {
  eager: true
}) as Record<string, MockModule>

export const messageComponentMockCases: MessageComponentMockCase[] = Object.values(modules)
  .map((mod) => mod.mockCase ?? mod.default)
  .filter((item): item is MessageComponentMockCase => Boolean(item))
  .sort((a, b) => a.order - b.order)

export function getMessageComponentMockCaseById(id: string): MessageComponentMockCase | undefined {
  return messageComponentMockCases.find((item) => item.id === id)
}

export type { MessageComponentMockCase, MessageComponentMockDeps } from './types'

