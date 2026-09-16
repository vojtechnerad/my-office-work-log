import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, type MowlApi } from '../shared/ipc'

const mowl: MowlApi = {
  database: {
    close: () => ipcRenderer.invoke(IPC_CHANNELS.database.close),
    create: (request) => ipcRenderer.invoke(IPC_CHANNELS.database.create, request),
    open: (request) => ipcRenderer.invoke(IPC_CHANNELS.database.open, request)
  },
  health: () => ipcRenderer.invoke(IPC_CHANNELS.app.health)
}

contextBridge.exposeInMainWorld('mowl', mowl)
