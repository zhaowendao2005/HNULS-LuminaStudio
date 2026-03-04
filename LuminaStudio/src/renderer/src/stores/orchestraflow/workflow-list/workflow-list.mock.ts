/**
 * OrchestraFlow 工作流列表 Mock 数据
 */
import type { OFWorkflowMeta } from '@shared/Orchestraflow-types'

export const mockWorkflows: OFWorkflowMeta[] = [
  {
    id: 'of-wf-001',
    name: '客户服务自动回复',
    description: '根据用户问题自动生成回复',
    icon: 'RobotIcon',
    iconBackground: '#FFEAD5',
    author: '赵文道',
    createdAt: 1740000000,
    updatedAt: 1740086400,
    status: 'draft',
    nodeCount: 3,
    tags: ['客服', '自动化']
  },
  {
    id: 'of-wf-002',
    name: '文档摘要生成',
    description: '自动提取文档关键信息并生成摘要',
    icon: 'DocumentTextIcon',
    iconBackground: '#E0F2FE',
    author: '赵文道',
    createdAt: 1739913600,
    updatedAt: 1740000000,
    status: 'published',
    nodeCount: 4,
    tags: ['文档', '摘要']
  },
  {
    id: 'of-wf-003',
    name: '智能问答系统',
    description: '基于知识库的智能问答工作流',
    icon: 'ChatBubbleLeftRightIcon',
    iconBackground: '#F3E8FF',
    author: '赵文道',
    createdAt: 1739827200,
    updatedAt: 1739913600,
    status: 'draft',
    nodeCount: 5,
    tags: ['问答', '知识库']
  }
]
