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
import { KnowledgeDatabaseBridgeService } from './services/knowledge-database-bridge'
import { KnowledgeDatabaseIPCHandler } from './ipc/knowledge-database-handler'
import { RerankModelService } from './services/rerank-model'
import { RerankModelIPCHandler } from './ipc/rerank-model-handler'
import { UserSettingsService } from './services/user-settings'
import { UserSettingsIPCHandler } from './ipc/user-settings-handler'
import { PaperRetrievalService } from './services/paper-retrieval'
import { PaperRetrievalIPCHandler } from './ipc/paper-retrieval-handler'
import { KnowledgeRetrievalService } from './services/knowledge-retrieval'
import { KGRetrievalService } from './services/kg-retrieval/kg-retrieval-service'
import { OrchestraflowWorkflowService } from './services/orchestraflow/orchestraflow-workflow-service'
import { OrchestraflowRerankModelService } from './services/orchestraflow/orchestraflow-rerank-model-service'
import { OrchestraflowIPCHandler } from './ipc/orchestraflow-handler'
import { OrchestflowGenerationEditorService } from './services/orchestflow-generation-editor'
import { OrchestflowGenerationEditorIPCHandler } from './ipc/orchestflow-generation-editor-handler'
import { orchestraflowBridge } from './services/orchestraflow-bridge'
import { logger } from './services/logger'
import { McpService } from './services/mcp'
import { McpIPCHandler } from './ipc/mcp-handler'
import { McpChatService } from './services/mcp-chat'
import { McpChatIPCHandler } from './ipc/mcp-chat-handler'
import { NormalChatService } from './services/normal-chat'
import { NormalChatIPCHandler } from './ipc/normal-chat-handler'

const log = logger.scope('Main')
let orchestflowGenerationEditorService: OrchestflowGenerationEditorService | null = null

if (!app.isPackaged) {
  app.setName('LuminaStudio')
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  windowService.bind(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  sqliteTestService.initialize()
  databaseManager.initialize()

  const modelConfigService = new ModelConfigService(databaseManager)
  new ModelConfigIPCHandler(modelConfigService)

  const knowledgeDatabaseService = new KnowledgeDatabaseBridgeService()

  const rerankModelService = new RerankModelService()
  new RerankModelIPCHandler(rerankModelService)

  const userSettingsService = new UserSettingsService(databaseManager)
  userSettingsService.initialize()
  new UserSettingsIPCHandler(userSettingsService)

  const paperRetrievalService = new PaperRetrievalService(userSettingsService)
  new PaperRetrievalIPCHandler(paperRetrievalService)

  const knowledgeRetrievalService = new KnowledgeRetrievalService(knowledgeDatabaseService)
  const kgRetrievalService = new KGRetrievalService(knowledgeDatabaseService)
  new KnowledgeDatabaseIPCHandler(
    knowledgeDatabaseService,
    knowledgeRetrievalService,
    kgRetrievalService
  )

  const orchestraflowRerankModelService = new OrchestraflowRerankModelService()

  const mcpService = new McpService()
  new McpIPCHandler(mcpService)
  const mcpChatService = new McpChatService(mcpService, modelConfigService, userSettingsService)
  new McpChatIPCHandler(mcpChatService)

  const normalChatService = new NormalChatService(databaseManager, paperRetrievalService)
  new NormalChatIPCHandler(normalChatService)

  const orchestraflowWorkflowService = new OrchestraflowWorkflowService()
  new OrchestraflowIPCHandler(
    orchestraflowWorkflowService,
    modelConfigService,
    orchestraflowRerankModelService
  )

  orchestflowGenerationEditorService = new OrchestflowGenerationEditorService(
    databaseManager,
    modelConfigService
  )
  new OrchestflowGenerationEditorIPCHandler(orchestflowGenerationEditorService)

  setTimeout(async () => {
    try {
      orchestraflowBridge.configureServices({
        knowledgeRetrievalService,
        paperRetrievalService
      })
      await orchestraflowBridge.spawn()
      orchestraflowBridge.init()
    } catch (err) {
      log.error('Failed to spawn orchestraflow bridge', err)
    }
  }, 1000)

  registerAllHandlers()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  orchestflowGenerationEditorService?.shutdown()
  orchestraflowBridge.kill()
  sqliteTestService.close()
  databaseManager.close()
})
