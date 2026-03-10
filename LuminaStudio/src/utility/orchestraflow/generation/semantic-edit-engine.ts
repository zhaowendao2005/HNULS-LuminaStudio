import type { OFGenerationGraphState, OFNode } from '@shared/Orchestraflow-types'
import { OFBlockEnum, buildOFStableOutputNamespace } from '@shared/Orchestraflow-types'
import { reduceGenerationGraphState, type GenerationGraphMutation } from './graph-state-reducer'

function createNode(id: string, type: OFBlockEnum, title: string, x: number, y: number): OFNode {
  return {
    id,
    type,
    position: { x, y },
    data: {
      title,
      desc: '',
      type,
      output_namespace: buildOFStableOutputNamespace(id, title),
      ...(type === OFBlockEnum.Start ? { input: { variables: [] } } : {}),
      ...(type === OFBlockEnum.End ? { output: { variables: [] } } : {}),
      ...(type === OFBlockEnum.LLM
        ? {
            model: { provider: '', name: '' },
            prompt_template: [],
            structured_output: { enabled: false, schema: null },
            output: { variables: [] }
          }
        : {}),
      ...(type === OFBlockEnum.IfElse
        ? { cases: [], elseCase: { handleId: 'else', label: 'ELSE' } }
        : {}),
      ...(type === OFBlockEnum.VariableAssign ? { rules: [], output: { variables: [] } } : {}),
      ...(type === OFBlockEnum.Iteration || type === OFBlockEnum.Loop
        ? { output: { variables: [] } }
        : {})
    } as OFNode['data']
  } as OFNode
}

export function applyPromptToGraphState(
  prompt: string,
  current?: OFGenerationGraphState
): OFGenerationGraphState {
  const mutations: GenerationGraphMutation[] = []
  const start = createNode('gen-start', OFBlockEnum.Start, '开始', 80, 220)
  const end = createNode('gen-end', OFBlockEnum.End, '结束', 1020, 220)
  const segments = buildSegmentsFromPrompt(prompt)

  mutations.push({
    type: 'replace',
    state:
      current ||
      ({
        version: 0,
        checkpoints_version: 0,
        nodes: [],
        edges: [],
        node_snapshots: []
      } as OFGenerationGraphState)
  })
  mutations.push({ type: 'upsert-node', node: start })
  let previousNode = start

  segments.forEach((segment, index) => {
    const node = createNode(
      `gen-node-${index + 1}`,
      inferBlockType(segment),
      segment.title,
      300 + index * 220,
      220 + (index % 2 === 0 ? 0 : 48)
    )
    mutations.push({ type: 'upsert-node', node })
    mutations.push({
      type: 'add-edge',
      edge: {
        id: `edge_${previousNode.id}_${node.id}`,
        source: previousNode.id,
        target: node.id,
        sourceHandle: previousNode.type === OFBlockEnum.IfElse ? 'else' : 'source',
        targetHandle: 'target'
      }
    })
    previousNode = node
  })

  mutations.push({ type: 'upsert-node', node: end })
  mutations.push({
    type: 'add-edge',
    edge: {
      id: `edge_${previousNode.id}_${end.id}`,
      source: previousNode.id,
      target: end.id,
      sourceHandle: previousNode.type === OFBlockEnum.IfElse ? 'else' : 'source',
      targetHandle: 'target'
    }
  })

  return reduceGenerationGraphState(current, mutations)
}

function buildSegmentsFromPrompt(prompt: string): Array<{ title: string; raw: string }> {
  const lines = prompt
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*\d.\s]+/, '').trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return [{ title: '生成节点', raw: prompt }]
  }

  return lines.slice(0, 6).map((line, index) => ({
    title: line.length > 20 ? line.slice(0, 20) : line || `步骤 ${index + 1}`,
    raw: line
  }))
}

function inferBlockType(segment: { title: string; raw: string }): OFBlockEnum {
  const text = `${segment.title} ${segment.raw}`.toLowerCase()
  if (
    text.includes('if') ||
    text.includes('branch') ||
    text.includes('条件') ||
    text.includes('分支')
  ) {
    return OFBlockEnum.IfElse
  }
  if (text.includes('loop') || text.includes('循环')) {
    return OFBlockEnum.Loop
  }
  if (text.includes('iterate') || text.includes('迭代')) {
    return OFBlockEnum.Iteration
  }
  if (text.includes('assign') || text.includes('变量') || text.includes('输出')) {
    return OFBlockEnum.VariableAssign
  }
  return OFBlockEnum.LLM
}
