import { app, shell, BrowserWindow, dialog, ipcMain, Notification } from 'electron'
import { existsSync } from 'fs'
import { extname, join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { createDatabase, openDatabase, type DatabaseConnection } from './database'
import {
  DatabaseRegistryStore,
  deriveDatabaseFileName,
  ensureDatabaseFileName,
  getDefaultDatabaseDirectory
} from './database/registry'
import { IPC_CHANNELS, type HealthCheck, type IpcContract } from '../shared/ipc'
import { registerWorkspaceIpc } from './workspace-ipc'
import { JsonReminderSettingsStore, ReminderService } from './reminder-service'

let activeDatabase: DatabaseConnection | undefined
let databaseRegistry: DatabaseRegistryStore | undefined
let reminderService: ReminderService | undefined

function getMigrationsFolder(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'migrations')
    : join(app.getAppPath(), 'resources', 'migrations')
}

function getDatabaseFilePathFromArguments(arguments_: string[]): string | undefined {
  return arguments_.find((argument) => extname(argument).toLowerCase() === '.mowldb')
}

function openAndRememberDatabase(filePath: string): DatabaseConnection {
  const connection = openDatabase({ filePath, migrationsFolder: getMigrationsFolder() })
  activeDatabase?.close()
  activeDatabase = connection
  databaseRegistry?.remember(filePath, connection.metadata)
  return connection
}

function focusMainWindow(): void {
  const mainWindow = BrowserWindow.getAllWindows()[0]
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    title: 'MOWL',
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

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
  electronApp.setAppUserModelId('com.mowl.app')
  databaseRegistry = new DatabaseRegistryStore(
    join(app.getPath('userData'), 'known-databases.json')
  )
  reminderService = new ReminderService(
    new JsonReminderSettingsStore(join(app.getPath('userData'), 'reminder-settings.json')),
    global,
    (notification) => {
      const systemNotification = new Notification(notification)
      systemNotification.on('click', focusMainWindow)
      systemNotification.show()
    }
  )
  reminderService.start()

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle(IPC_CHANNELS.app.health, (): HealthCheck => ({ status: 'ok' }))
  ipcMain.handle(IPC_CHANNELS.settings.get, () => reminderService?.getSettings())
  ipcMain.handle(
    IPC_CHANNELS.settings.update,
    (_, request: IpcContract[typeof IPC_CHANNELS.settings.update]['request']) =>
      reminderService?.update(request)
  )
  registerWorkspaceIpc(() => activeDatabase?.database)
  ipcMain.handle(
    IPC_CHANNELS.database.create,
    (_, request: IpcContract[typeof IPC_CHANNELS.database.create]['request']) => {
      const directory = request.directory ?? getDefaultDatabaseDirectory(app.getPath('documents'))
      const fileName = request.fileName
        ? ensureDatabaseFileName(request.fileName)
        : deriveDatabaseFileName(request.displayName)
      const filePath = join(directory, fileName)
      if (existsSync(filePath)) {
        throw new Error('A database file with this name already exists.')
      }

      const connection = createDatabase({
        description: request.description,
        displayName: request.displayName,
        filePath,
        migrationsFolder: getMigrationsFolder()
      })
      activeDatabase?.close()
      activeDatabase = connection
      databaseRegistry?.remember(filePath, connection.metadata)
      return connection.metadata
    }
  )
  ipcMain.handle(
    IPC_CHANNELS.database.open,
    (_, request: IpcContract[typeof IPC_CHANNELS.database.open]['request']) => {
      return openAndRememberDatabase(request.filePath).metadata
    }
  )
  ipcMain.handle(IPC_CHANNELS.database.close, () => {
    activeDatabase?.close()
    activeDatabase = undefined
  })
  ipcMain.handle(IPC_CHANNELS.database.list, () => databaseRegistry?.list() ?? { databases: [] })
  ipcMain.handle(IPC_CHANNELS.database.chooseDirectory, async () => {
    const result = await dialog.showOpenDialog({
      defaultPath: getDefaultDatabaseDirectory(app.getPath('documents')),
      properties: ['createDirectory', 'openDirectory']
    })
    return result.canceled ? undefined : result.filePaths[0]
  })
  ipcMain.handle(
    IPC_CHANNELS.database.locate,
    async (_, request: IpcContract[typeof IPC_CHANNELS.database.locate]['request']) => {
      const result = await dialog.showOpenDialog({
        filters: [{ extensions: ['mowldb'], name: 'MOWL databases' }],
        properties: ['openFile']
      })
      if (result.canceled || !result.filePaths[0]) {
        return undefined
      }

      const connection = openAndRememberDatabase(result.filePaths[0])
      databaseRegistry?.relocate(request.missingFilePath, result.filePaths[0], connection.metadata)
      return connection.metadata
    }
  )
  ipcMain.handle(
    IPC_CHANNELS.database.remove,
    (_, request: IpcContract[typeof IPC_CHANNELS.database.remove]['request']) => {
      if (activeDatabase && databaseRegistry?.list().selectedFilePath === request.filePath) {
        activeDatabase.close()
        activeDatabase = undefined
      }
      databaseRegistry?.remove(request.filePath)
    }
  )

  const associatedDatabaseFile = getDatabaseFilePathFromArguments(process.argv)
  const lastUsedFilePath = databaseRegistry.list().selectedFilePath
  const databaseFileToOpen = associatedDatabaseFile ?? lastUsedFilePath
  if (databaseFileToOpen && existsSync(databaseFileToOpen)) {
    try {
      openAndRememberDatabase(databaseFileToOpen)
    } catch (error) {
      console.error('Unable to open MOWL database:', error)
    }
  }

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

if (app.requestSingleInstanceLock()) {
  app.on('second-instance', (_, commandLine) => {
    const databaseFilePath = getDatabaseFilePathFromArguments(commandLine)
    if (databaseFilePath && existsSync(databaseFilePath)) {
      try {
        openAndRememberDatabase(databaseFilePath)
      } catch (error) {
        console.error('Unable to open MOWL database:', error)
      }
    }
    focusMainWindow()
  })
} else {
  app.quit()
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  activeDatabase?.close()
  activeDatabase = undefined

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  reminderService?.stop()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
