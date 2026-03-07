/**
 * OrchestraFlow 工作流运行 Mock 数据
 *
 * 说明：
 * 这里是前端演示专用的 mock 注入链路，不代表最终后端运行时协议。
 * 当前会为迭代节点额外注入两层变量语义：
 * 1. 上下维度：迭代节点接收 array，产出 array。
 * 2. 内外维度：迭代节点会向内图起点注入当前迭代组变量 `index` 和 `item`。
 *
 * TODO:
 * 接后端真实运行时后，删除这里的前端注入逻辑，改为消费后端返回的 iteration scope。
 */
import type { OFNode, OFNodeTracing, OFWorkflowRunResult } from '@shared/Orchestraflow-types'
import {
  OF_ITERATION_INDEX_VARIABLE_NAME,
  OF_ITERATION_ITEM_VARIABLE_NAME,
  OFWorkflowRunningStatus,
  OFNodeRunningStatus,
  OFBlockEnum
} from '@shared/Orchestraflow-types'

function firstNodeByType(nodes: OFNode[], type: OFBlockEnum): OFNode | undefined {
  return nodes.find((node) => node.data.type === type)
}

function normalizeIterationInputArray(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw
  if (raw == null || raw === '') return []
  return [raw]
}

function resolveIterationDemoInput(nodes: OFNode[], inputs?: Record<string, any>) {
  const iterationNode = firstNodeByType(nodes, OFBlockEnum.Iteration)
  const iterationData =
    iterationNode?.data.type === OFBlockEnum.Iteration ? iterationNode.data : null
  const selector = iterationData?.input?.variables?.[0]?.value_selector || []
  const selectorPath = selector.join('.')

  if (selectorPath && inputs && selectorPath in inputs) {
    return {
      sourcePath: selectorPath,
      items: normalizeIterationInputArray(inputs[selectorPath])
    }
  }

  const firstArrayEntry = Object.entries(inputs || {}).find(([, value]) => Array.isArray(value))
  if (firstArrayEntry) {
    return {
      sourcePath: firstArrayEntry[0],
      items: normalizeIterationInputArray(firstArrayEntry[1])
    }
  }

  return {
    sourcePath: selectorPath || 'demo.iteration_input',
    items: [
      { title: '候选段落 A', content: '第一段待整理内容' },
      { title: '候选段落 B', content: '第二段待整理内容' }
    ]
  }
}

function buildIterationScopedInputs(items: any[]) {
  return items.map((item, index) => ({
    [OF_ITERATION_INDEX_VARIABLE_NAME]: index,
    [OF_ITERATION_ITEM_VARIABLE_NAME]: item
  }))
}

function createDefaultTrace(): OFWorkflowRunResult {
  return {
    status: OFWorkflowRunningStatus.Succeeded,
    elapsed_time: 2.34,
    total_tokens: 156,
    tracing: [
      {
        nodeId: 'start-1',
        nodeType: OFBlockEnum.Start,
        status: OFNodeRunningStatus.Succeeded,
        elapsed_time: 0.01,
        inputs: {
          query: '你好，请帮我总结一下这段文章的主要内容',
          context: ''
        }
      },
      {
        nodeId: 'llm-1',
        nodeType: OFBlockEnum.LLM,
        status: OFNodeRunningStatus.Succeeded,
        elapsed_time: 2.3,
        inputs: {
          model: {
            provider: 'openai',
            name: 'gpt-4'
          },
          prompt: [
            {
              role: 'system',
              text: '你是一个专业的文章总结助手。请用简洁的语言总结用户提供的文章内容。'
            },
            {
              role: 'user',
              text: '请总结以下文章：\n{{query}}'
            }
          ]
        },
        outputs: {
          text: '这段文章主要讲述了人工智能在现代软件开发中的应用。'
        }
      },
      {
        nodeId: 'end-1',
        nodeType: OFBlockEnum.End,
        status: OFNodeRunningStatus.Succeeded,
        elapsed_time: 0.03,
        outputs: {
          result: '这段文章主要讲述了人工智能在现代软件开发中的应用。'
        }
      }
    ],
    outputs: {
      result: '这段文章主要讲述了人工智能在现代软件开发中的应用。'
    }
  }
}

function createIterationTrace(nodes: OFNode[], inputs?: Record<string, any>): OFWorkflowRunResult {
  const startNode = firstNodeByType(nodes, OFBlockEnum.Start)
  const iterationNode = firstNodeByType(nodes, OFBlockEnum.Iteration)
  const endNode = firstNodeByType(nodes, OFBlockEnum.End)
  const iterationData =
    iterationNode?.data.type === OFBlockEnum.Iteration ? iterationNode.data : null
  const demoInput = resolveIterationDemoInput(nodes, inputs)
  const scopedInputs = buildIterationScopedInputs(demoInput.items)
  const fallbackIterations = scopedInputs.map((scope, index) => ({
    index: index + 1,
    title: `第 ${index + 1} 轮`,
    input: JSON.stringify(scope[OF_ITERATION_ITEM_VARIABLE_NAME], null, 2),
    outputSummary: `使用 ${OF_ITERATION_ITEM_VARIABLE_NAME} 和 ${OF_ITERATION_INDEX_VARIABLE_NAME} 完成第 ${index + 1} 轮演示整理`,
    status: OFNodeRunningStatus.Succeeded
  }))
  const iterations =
    iterationData?.mockRun?.iterations?.length
      ? iterationData.mockRun.iterations.map((item, index) => ({
          ...item,
          input:
            item.input ||
            JSON.stringify(scopedInputs[index]?.[OF_ITERATION_ITEM_VARIABLE_NAME] || '', null, 2)
        }))
      : fallbackIterations

  const tracing: OFNodeTracing[] = []

  if (startNode) {
    tracing.push({
      nodeId: startNode.id,
      nodeType: OFBlockEnum.Start,
      status: OFNodeRunningStatus.Succeeded,
      elapsed_time: 0.01,
      inputs: inputs || {},
      outputs: inputs || {}
    })
  }

  if (iterationNode && iterationData) {
    tracing.push({
      nodeId: iterationNode.id,
      nodeType: OFBlockEnum.Iteration,
      status: OFNodeRunningStatus.Succeeded,
      elapsed_time: 1.28,
      inputs: {
        sourcePath: demoInput.sourcePath,
        inputArray: demoInput.items,
        iterationScopePreview: scopedInputs,
        iterationCount: iterationData.iterationCount,
        iterationMode: iterationData.iterationMode,
        mockTemplateId: iterationData.mockTemplateId,
        // 演示态显式暴露内图变量注入结果，便于联调 UI。
        injectedInnerVariables: {
          [OF_ITERATION_INDEX_VARIABLE_NAME]: '当前轮次索引',
          [OF_ITERATION_ITEM_VARIABLE_NAME]: '当前轮次项目'
        }
      },
      outputs: {
        iterations,
        summary: iterationData.mockRun.summary,
        finalOutput: iterationData.mockRun.finalOutput,
        items: demoInput.items
      }
    })
  }

  if (endNode) {
    tracing.push({
      nodeId: endNode.id,
      nodeType: OFBlockEnum.End,
      status: OFNodeRunningStatus.Succeeded,
      elapsed_time: 0.03,
      outputs: {
        result: iterationData?.mockRun.finalOutput || '这是迭代节点的最终模拟输出。'
      }
    })
  }

  return {
    status: OFWorkflowRunningStatus.Succeeded,
    elapsed_time: 1.32,
    total_tokens: 428,
    tracing,
    outputs: {
      summary: iterationData?.mockRun.summary || '已完成模拟循环。',
      finalOutput: iterationData?.mockRun.finalOutput || '这是迭代节点的最终模拟输出。'
    }
  }
}

export function createMockRunResult(
  nodes: OFNode[] = [],
  inputs?: Record<string, any>
): OFWorkflowRunResult {
  if (nodes.some((node) => node.data.type === OFBlockEnum.Iteration)) {
    return createIterationTrace(nodes, inputs)
  }
  return createDefaultTrace()
}

export function createMockProgressSequence(
  nodes: OFNode[] = [],
  inputs?: Record<string, any>
): OFNodeTracing[] {
  const result = createMockRunResult(nodes, inputs)
  return result.tracing.map((item, index) => {
    if (index === result.tracing.length - 1) {
      return item
    }
    return {
      ...item,
      status: OFNodeRunningStatus.Running
    }
  })
}

export function createStreamingChunks(): string[] {
  return [
    '这段文章',
    '主要讲述',
    '了人工',
    '智能在',
    '现代软',
    '件开发',
    '中的应',
    '用。',
    '\n\n',
    '作者从',
    '以下几',
    '个方面',
    '进行了',
    '阐述：',
    '\n\n',
    '**1. 自动化测试**：AI可以自动生成测试用例，提高代码覆盖率。\n',
    '**2. 代码审查**：机器学习模型能够识别潜在的bug和安全漏洞。\n',
    '**3. 智能补全**：基于上下文的代码补全建议大幅提升开发效率。\n',
    '**4. 文档生成**：自动生成API文档和技术文档。\n\n',
    '总结来说，AI正在改变软件开发的方式，让开发者能够专注于更具创造性的工作。'
  ]
}

export function createFailedRunResult(errorMessage: string = 'Unknown error'): OFWorkflowRunResult {
  return {
    status: OFWorkflowRunningStatus.Failed,
    elapsed_time: 0.5,
    tracing: [
      {
        nodeId: 'start-1',
        nodeType: OFBlockEnum.Start,
        status: OFNodeRunningStatus.Succeeded,
        elapsed_time: 0.01,
        inputs: {
          query: '测试查询'
        }
      },
      {
        nodeId: 'llm-1',
        nodeType: OFBlockEnum.LLM,
        status: OFNodeRunningStatus.Failed,
        elapsed_time: 0.4,
        error: errorMessage
      }
    ],
    error: errorMessage
  }
}
