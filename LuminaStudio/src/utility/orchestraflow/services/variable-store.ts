/**
 * VariableStore - 节点间变量传递存储
 *
 * 用于在 workflow 执行过程中维护上下文变量
 */
export class VariableStore {
  private variables: Map<string, any> = new Map()

  set(key: string, value: any): void {
    this.variables.set(key, value)
  }

  get(key: string): any {
    return this.variables.get(key)
  }

  has(key: string): boolean {
    return this.variables.has(key)
  }

  getAll(): Record<string, any> {
    const result: Record<string, any> = {}
    this.variables.forEach((value, key) => {
      result[key] = value
    })
    return result
  }

  clear(): void {
    this.variables.clear()
  }

  /**
   * 根据 value_selector 获取嵌套值
   * value_selector: ['nodeId', 'outputKey'] 或 ['outputKey']
   */
  getBySelector(selector: string[]): any {
    if (!selector || selector.length === 0) return undefined

    if (selector.length === 1) {
      return this.get(selector[0])
    }

    // 第一个元素是变量名（存储的 key）
    const key = selector[0]
    const value = this.get(key)
    if (!value) return undefined

    // 剩余部分是对象路径
    let result = value
    for (let i = 1; i < selector.length; i++) {
      if (result === null || result === undefined) return undefined
      result = result[selector[i]]
    }
    return result
  }
}
