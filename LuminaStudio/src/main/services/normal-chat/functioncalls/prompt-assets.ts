import type { NormalChatFunctioncallHelper } from './contracts'

export function buildHelperDescriptionPrompt(helpers: NormalChatFunctioncallHelper[]): string {
  return helpers
    .map((helper) => {
      return [
        `Helper: ${helper.id}`,
        `Display Name: ${helper.displayName}`,
        helper.description
      ].join('\n')
    })
    .join('\n\n')
}

export function buildHelperSchemaPrompt(helper: NormalChatFunctioncallHelper): string {
  return [`Helper 参数契约: ${helper.id}`, helper.schemaPrompt].join('\n')
}

export function buildHelperProgressivePrompt(helper: NormalChatFunctioncallHelper): string {
  return [`Helper 渐进提示: ${helper.id}`, helper.progressivePrompt].join('\n')
}
