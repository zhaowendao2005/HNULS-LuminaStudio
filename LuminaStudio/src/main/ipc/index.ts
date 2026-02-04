/**
 * IPC Handlers 统一注册
 */

import { registerWindowHandlers } from './window-handler'

export function registerAllHandlers(): void {
  registerWindowHandlers()
}
