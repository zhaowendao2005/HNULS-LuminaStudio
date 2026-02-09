/**
 * 节点类型定义
 *
 * Structure 节点：通用编排逻辑，对工具节点无感知
 * Utils 节点：插件化工具，自描述元数据，可被 structure 节点调度
 */

/**
 * 工具节点描述符（类 MCP tool descriptor）
 *
 * 用途：
 * - 给 LLM 看：让规划节点理解"这个工具能干什么"
 * - 给开发者看：文档化工具节点的能力
 */
export interface UtilNodeDescriptor {
  /** 唯一 ID，同时也是 nodeKind（用于 IPC 事件路由） */
  id: string

  /** 人类可读名称 */
  name: string

  /** 功能描述：给 LLM 看的自然语言说明，描述工具的能力、适用场景 */
  description: string

  /** 输入参数说明：给 LLM 理解"调用时需要传什么" */
  inputDescription: string

  /** 输出格式说明：给 LLM 理解"它会返回什么" */
  outputDescription: string
}

/**
 * 工具节点注册体
 *
 * 将纯函数包装为带元数据的插件
 */
export interface UtilNodeRegistration {
  /** 工具元数据 */
  descriptor: UtilNodeDescriptor

  /**
   * 节点工厂函数
   *
   * 接收系统参数（apiKey, abortSignal 等），返回节点实例
   * 节点实例的 run() 方法接收用户参数（query, k 等）
   */
  nodeFactory: (systemParams: any) => {
    run: (userParams: any) => Promise<string>
  }
}

/**
 * 通用节点执行结果（structure-summary 节点消费）
 */
export interface ToolExecutionResult {
  /** 节点 ID */
  nodeId: string

  /** 调用参数（给 LLM 上下文） */
  params: Record<string, unknown>

  /** 节点返回的 JSON 字符串 */
  resultText: string
}
