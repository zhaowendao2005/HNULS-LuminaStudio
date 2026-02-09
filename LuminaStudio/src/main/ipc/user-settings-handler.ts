import { ipcMain } from 'electron'
import type { UserSettingsService, UserSettings, ApiKeysConfig } from '../services/user-settings'
import { logger } from '../services/logger'

const log = logger.scope('UserSettingsIPCHandler')

/**
 * UserSettingsIPCHandler
 *
 * 处理用户设置相关的 IPC 通信
 */
export class UserSettingsIPCHandler {
  constructor(private userSettingsService: UserSettingsService) {
    this.registerHandlers()
  }

  private registerHandlers(): void {
    // 获取用户设置
    ipcMain.handle('userSettings:getSettings', async () => {
      try {
        log.debug('IPC: getSettings')
        return await this.userSettingsService.getSettings()
      } catch (error) {
        log.error('Failed to get user settings', error)
        throw error
      }
    })

    // 更新用户设置
    ipcMain.handle(
      'userSettings:updateSettings',
      async (_, patch: Partial<UserSettings>) => {
        try {
          log.debug('IPC: updateSettings', { patch })
          return await this.userSettingsService.updateSettings(patch)
        } catch (error) {
          log.error('Failed to update user settings', error)
          throw error
        }
      }
    )

    // 获取 API Keys
    ipcMain.handle('userSettings:getApiKeys', async () => {
      try {
        log.debug('IPC: getApiKeys')
        return await this.userSettingsService.getApiKeys()
      } catch (error) {
        log.error('Failed to get API keys', error)
        throw error
      }
    })

    // 更新 API Keys
    ipcMain.handle('userSettings:updateApiKeys', async (_, keys: Partial<ApiKeysConfig>) => {
      try {
        log.debug('IPC: updateApiKeys', { keys: Object.keys(keys) })
        return await this.userSettingsService.updateApiKeys(keys)
      } catch (error) {
        log.error('Failed to update API keys', error)
        throw error
      }
    })

    log.info('User settings IPC handlers registered')
  }
}
