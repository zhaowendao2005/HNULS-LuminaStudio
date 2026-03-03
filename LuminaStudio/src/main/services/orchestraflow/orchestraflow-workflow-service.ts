/**
 * OrchestraFlow Workflow Service
 * 工作流服务 - 负责工作流数据的持久化
 */
import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import { logger } from '../logger'
import type { OFWorkflow, OFWorkflowMeta } from '../../../Public/ShareTypes/Orchestraflow-types'

const log = logger.scope('OrchestraflowWorkflowService')

// 工作流存储目录
function getWorkflowDir(): string {
  const dir = join(app.getPath('userData'), 'UserData', 'Orchestraflow')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

// 生成6位随机字符串
function generateRandomSuffix(): string {
  return Math.random().toString(36).substring(2, 8)
}

// 从文件名提取工作流ID
function extractWorkflowId(filename: string): string {
  return filename.replace('.json', '')
}

// 检查文件是否存在
function workflowExists(filename: string): boolean {
  return existsSync(join(getWorkflowDir(), filename))
}

export class OrchestraflowWorkflowService {
  /**
   * 获取工作流列表
   */
  async list(params?: {
    keyword?: string
    page?: number
    pageSize?: number
  }): Promise<{ workflows: OFWorkflowMeta[]; total: number }> {
    const dir = getWorkflowDir()
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'))

    const workflows: OFWorkflowMeta[] = []
    for (const file of files) {
      try {
        const content = readFileSync(join(dir, file), 'utf-8')
        const workflow: OFWorkflow = JSON.parse(content)

        // 关键词过滤
        if (
          params?.keyword &&
          !workflow.name.toLowerCase().includes(params.keyword.toLowerCase())
        ) {
          continue
        }

        workflows.push({
          id: workflow.id,
          name: workflow.name,
          description: workflow.description,
          author: workflow.author,
          createdAt: workflow.createdAt,
          updatedAt: workflow.updatedAt,
          status: workflow.status,
          nodeCount: workflow.graph?.nodes?.length || 0
        })
      } catch (e) {
        log.error(`Failed to read workflow file: ${file}`, e)
      }
    }

    // 按更新时间倒序
    workflows.sort((a, b) => b.updatedAt - a.updatedAt)

    // 分页
    const page = params?.page || 1
    const pageSize = params?.pageSize || 20
    const total = workflows.length
    const paged = workflows.slice((page - 1) * pageSize, page * pageSize)

    return { workflows: paged, total }
  }

  /**
   * 获取单个工作流
   */
  async get(workflowId: string): Promise<OFWorkflow | null> {
    const dir = getWorkflowDir()
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'))

    for (const file of files) {
      const id = extractWorkflowId(file)
      if (id === workflowId) {
        try {
          const content = readFileSync(join(dir, file), 'utf-8')
          return JSON.parse(content)
        } catch (e) {
          log.error(`Failed to read workflow: ${file}`, e)
          return null
        }
      }
    }
    return null
  }

  /**
   * 创建工作流
   */
  async create(data: { name: string; description?: string }): Promise<OFWorkflow> {
    const now = Math.floor(Date.now() / 1000)
    const randomSuffix = generateRandomSuffix()
    const workflowId = `${data.name}-${randomSuffix}`

    const workflow: OFWorkflow = {
      id: workflowId,
      name: data.name,
      description: data.description,
      author: '赵文道',
      createdAt: now,
      updatedAt: now,
      status: 'draft',
      graph: { nodes: [], edges: [] }
    }

    const filename = `${workflowId}.json`
    const filepath = join(getWorkflowDir(), filename)
    writeFileSync(filepath, JSON.stringify(workflow, null, 2), 'utf-8')

    log.info(`Workflow created: ${workflowId}`)
    return workflow
  }

  /**
   * 更新工作流
   */
  async update(workflowId: string, data: Partial<OFWorkflow>): Promise<OFWorkflow | null> {
    const existing = await this.get(workflowId)
    if (!existing) return null

    const updated: OFWorkflow = {
      ...existing,
      ...data,
      id: workflowId, // 保持ID不变
      updatedAt: Math.floor(Date.now() / 1000)
    }

    const dir = getWorkflowDir()
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'))

    for (const file of files) {
      const id = extractWorkflowId(file)
      if (id === workflowId) {
        const filepath = join(dir, file)
        writeFileSync(filepath, JSON.stringify(updated, null, 2), 'utf-8')
        log.info(`Workflow updated: ${workflowId}`)
        return updated
      }
    }
    return null
  }

  /**
   * 删除工作流
   */
  async delete(workflowId: string): Promise<boolean> {
    const dir = getWorkflowDir()
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'))

    for (const file of files) {
      const id = extractWorkflowId(file)
      if (id === workflowId) {
        const filepath = join(dir, file)
        unlinkSync(filepath)
        log.info(`Workflow deleted: ${workflowId}`)
        return true
      }
    }
    return false
  }
}

export const orchestraflowWorkflowService = new OrchestraflowWorkflowService()
