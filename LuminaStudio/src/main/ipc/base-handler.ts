import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from 'electron'

/**
 * BaseIPCHandler
 *
 * IPC Handler 基类，提供自动注册和统一错误处理
 *
 * 使用方式：
 * 1. 继承此基类
 * 2. 实现 getChannelPrefix() 返回 channel 前缀
 * 3. 定义 handle* 方法（如 handleGet、handleUpdate）
 * 4. 在构造函数中调用 register()
 *
 * 示例：
 * ```typescript
 * class FooHandler extends BaseIPCHandler {
 *   protected getChannelPrefix(): string { return 'foo' }
 *   async handleGet() { return { success: true, data: ... } }
 * }
 * ```
 * 会自动注册 channel: 'foo:get'
 */
export abstract class BaseIPCHandler {
  /** 子类必须实现：返回 channel 前缀 */
  protected abstract getChannelPrefix(): string

  /**
   * 注册所有 handle* 方法到 ipcMain
   */
  protected register(): void {
    const methods = this.getHandlerMethods()
    methods.forEach((method) => {
      const channel = `${this.getChannelPrefix()}:${method}`
      ipcMain.handle(channel, this.createHandler(method))
    })
  }

  /**
   * 自动发现所有 handle* 方法
   */
  private getHandlerMethods(): string[] {
    const methods: string[] = []
    const prototype = Object.getPrototypeOf(this)

    Object.getOwnPropertyNames(prototype).forEach((name) => {
      if (
        name !== 'constructor' &&
        name !== 'register' &&
        name !== 'getChannelPrefix' &&
        typeof prototype[name] === 'function' &&
        name.startsWith('handle')
      ) {
        // 将 handleReadFile 转换为 readfile（全小写）
        const methodName = name.replace(/^handle/, '').toLowerCase()
        methods.push(methodName)
      }
    })

    return methods
  }

  /**
   * 创建 IPC handler 包装器（统一错误处理）
   */
  private createHandler(method: string) {
    return async (event: IpcMainInvokeEvent, ...args: unknown[]) => {
      try {
        const handlerName = `handle${method.charAt(0).toUpperCase() + method.slice(1)}`
        const handler = (this as never)[handlerName]

        if (typeof handler === 'function') {
          return await handler.call(this, event, ...args)
        } else {
          throw new Error(`Handler method ${handlerName} not found`)
        }
      } catch (error) {
        console.error(`IPC Error in ${this.getChannelPrefix()}:${method}:`, error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * 广播消息到所有窗口
   */
  protected broadcastToAll(channel: string, data: unknown): void {
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send(channel, data)
    })
  }

  /**
   * 发送消息到指定窗口
   */
  protected sendToWindow(windowId: number, channel: string, data: unknown): void {
    const window = BrowserWindow.fromId(windowId)
    if (window) {
      window.webContents.send(channel, data)
    }
  }
}
