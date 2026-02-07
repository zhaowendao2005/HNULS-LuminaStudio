import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerAllHandlers } from './ipc'
import { windowService } from './services/base-service/window-service'
import { sqliteTestService } from './services/base-service/sqlite-test-service'
import { databaseManager } from './services/database-sqlite'
import { ModelConfigService } from './services/model-config'
import { ModelConfigIPCHandler } from './ipc/model-config-handler'
import { AiChatService } from './services/ai-chat/ai-chat-service'
import { AiChatIPCHandler } from './ipc/ai-chat-handler'
import { KnowledgeDatabaseBridgeService } from './services/knowledge-database-bridge'
import { KnowledgeDatabaseIPCHandler } from './ipc/knowledge-database-handler'
import { RerankModelService } from './services/rerank-model'
import { RerankModelIPCHandler } from './ipc/rerank-model-handler'
import { langchainClientBridge } from './services/langchain-client-bridge'

// 确保开发环境也使用 LuminaStudio 作为应用名称（生产环境自动使用 productName）
if (!app.isPackaged) {
  app.setName('LuminaStudio')
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // 标题栏相关事件同步（最大化/还原）
  windowService.bind(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 初始化 SQLite 测试数据库
  sqliteTestService.initialize()

  // 初始化 DatabaseManager（正式数据库）
  databaseManager.initialize()

  // 初始化 Model Config Service 和 IPC Handler
  const modelConfigService = new ModelConfigService(databaseManager)
  new ModelConfigIPCHandler(modelConfigService)

  // 初始化 AI Chat Service 和 IPC Handler
  const aiChatService = new AiChatService(
    databaseManager,
    modelConfigService,
    langchainClientBridge
  )
  new AiChatIPCHandler(aiChatService)

  // 初始化 KnowledgeDatabase Bridge Service 和 IPC Handler
  const knowledgeDatabaseService = new KnowledgeDatabaseBridgeService()
  new KnowledgeDatabaseIPCHandler(knowledgeDatabaseService)

  // 初始化 RerankModel Service 和 IPC Handler
  const rerankModelService = new RerankModelService()
  new RerankModelIPCHandler(rerankModelService)

  // 注册所有 IPC handlers
  registerAllHandlers()

  createWindow()

  // LangChain Agent runs on-demand via aiChat:start (mode='agent')

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 应用退出前清理数据库连接
app.on('before-quit', () => {
  langchainClientBridge.kill()
  sqliteTestService.close()
  databaseManager.close()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
