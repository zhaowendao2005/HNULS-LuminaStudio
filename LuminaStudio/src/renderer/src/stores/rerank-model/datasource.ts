/**
 * Rerank Model DataSource
 *
 * 数据源适配器：负责 Renderer ↔ Preload API 之间的数据转换
 */
import type { RerankModel, RerankModelGroups } from './types'

/**
 * Rerank Model 数据源
 */
export const RerankModelDataSource = {
  /**
   * 获取重排模型列表
   */
  async listRerankModels(): Promise<RerankModel[]> {
    const res = await window.api.rerankModel.listRerankModels()
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to load rerank models')
    }
    return res.data.models
  },

  /**
   * 获取按分组组织的重排模型列表
   */
  async listRerankModelsGrouped(): Promise<RerankModelGroups> {
    const models = await this.listRerankModels()
    const groups: RerankModelGroups = {}

    for (const model of models) {
      const groupName = model.group || model.providerName || 'default'
      if (!groups[groupName]) {
        groups[groupName] = []
      }
      groups[groupName].push(model)
    }

    // 按组名排序
    const sortedGroups: RerankModelGroups = {}
    Object.keys(groups)
      .sort()
      .forEach((key) => {
        sortedGroups[key] = groups[key]
      })

    return sortedGroups
  }
}
