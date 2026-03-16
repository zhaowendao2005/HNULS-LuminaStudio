import { listOFAuthoringNodeDefinitions } from '@shared/Orchestraflow-types'

export function buildBaseWorkflowSpecPrompt(): string {
  const blocks = listOFAuthoringNodeDefinitions().map((definition) => {
    const fieldList = definition.authoring.toml.fields
      .map((field) => `- ${field.key}${field.required ? ' (required)' : ''}: ${field.summary}`)
      .join('\n')
    return [
      `## ${definition.authoring.title}`,
      definition.authoring.description.summary,
      fieldList,
      '示例：',
      definition.authoring.toml.exampleBlocks[0] || ''
    ].join('\n')
  })

  return [
    '你正在生成 OrchestraFlow 标准 TOML。',
    '请严格遵守以下节点作者态结构：',
    ...blocks
  ].join('\n\n')
}
