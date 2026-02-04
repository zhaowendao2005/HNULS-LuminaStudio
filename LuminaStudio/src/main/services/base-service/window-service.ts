import type { BrowserWindow } from 'electron'

/**
 * WindowService
 * 负责窗口级能力：最小化/最大化/关闭/全屏等（供 IPC handler 调用）。
 */
export class WindowService {
  minimize(win: BrowserWindow): void {
    win.minimize()
  }

  toggleMaximize(win: BrowserWindow): void {
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  }

  close(win: BrowserWindow): void {
    win.close()
  }

  isMaximized(win: BrowserWindow): boolean {
    return win.isMaximized()
  }

  toggleFullScreen(win: BrowserWindow): void {
    win.setFullScreen(!win.isFullScreen())
  }

  /**
   * 将窗口状态变化广播给渲染进程，用于标题栏按钮状态同步。
   */
  bind(win: BrowserWindow): void {
    const publish = () => {
      win.webContents.send('window:maximized-changed', { isMaximized: win.isMaximized() })
    }

    win.on('maximize', publish)
    win.on('unmaximize', publish)
  }
}

export const windowService = new WindowService()
