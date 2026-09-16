import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, type MowlApi } from '../shared/ipc'

const mowl: MowlApi = {
  database: {
    chooseDirectory: () => ipcRenderer.invoke(IPC_CHANNELS.database.chooseDirectory),
    close: () => ipcRenderer.invoke(IPC_CHANNELS.database.close),
    create: (request) => ipcRenderer.invoke(IPC_CHANNELS.database.create, request),
    open: (request) => ipcRenderer.invoke(IPC_CHANNELS.database.open, request),
    list: () => ipcRenderer.invoke(IPC_CHANNELS.database.list),
    locate: (request) => ipcRenderer.invoke(IPC_CHANNELS.database.locate, request),
    remove: (request) => ipcRenderer.invoke(IPC_CHANNELS.database.remove, request)
  },
  health: () => ipcRenderer.invoke(IPC_CHANNELS.app.health)
}

contextBridge.exposeInMainWorld('mowl', mowl)
