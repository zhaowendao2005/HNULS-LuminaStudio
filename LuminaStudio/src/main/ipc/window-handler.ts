import { ipcMain } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import { BrowserWindow } from 'electron'
import { windowService } from '../services/base-service/window-service'

function getSenderWindow(event: IpcMainInvokeEvent): BrowserWindow {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) throw new Error('No BrowserWindow for IPC sender')
  return win
}

export function registerWindowHandlers(): void {
  ipcMain.handle('window:minimize', (event) => {
    windowService.minimize(getSenderWindow(event))
  })

  ipcMain.handle('window:toggle-maximize', (event) => {
    windowService.toggleMaximize(getSenderWindow(event))
  })

  ipcMain.handle('window:close', (event) => {
    windowService.close(getSenderWindow(event))
  })

  ipcMain.handle('window:is-maximized', (event) => {
    return windowService.isMaximized(getSenderWindow(event))
  })

  ipcMain.handle('window:toggle-fullscreen', (event) => {
    windowService.toggleFullScreen(getSenderWindow(event))
  })
}
