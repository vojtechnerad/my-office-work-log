import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, IPC_EVENTS, type MowlApi } from '../shared/ipc'

const mowl: MowlApi = {
  database: {
    chooseDirectory: () => ipcRenderer.invoke(IPC_CHANNELS.database.chooseDirectory),
    close: () => ipcRenderer.invoke(IPC_CHANNELS.database.close),
    create: (request) => ipcRenderer.invoke(IPC_CHANNELS.database.create, request),
    open: (request) => ipcRenderer.invoke(IPC_CHANNELS.database.open, request),
    list: () => ipcRenderer.invoke(IPC_CHANNELS.database.list),
    locate: (request) => ipcRenderer.invoke(IPC_CHANNELS.database.locate, request),
    remove: (request) => ipcRenderer.invoke(IPC_CHANNELS.database.remove, request),
    onExternalOpen: (listener) => {
      const handler = (_: Electron.IpcRendererEvent, event: Parameters<typeof listener>[0]): void =>
        listener(event)
      ipcRenderer.on(IPC_EVENTS.databaseOpened, handler)
      return () => ipcRenderer.removeListener(IPC_EVENTS.databaseOpened, handler)
    }
  },
  health: () => ipcRenderer.invoke(IPC_CHANNELS.app.health),
  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.settings.get),
    update: (request) => ipcRenderer.invoke(IPC_CHANNELS.settings.update, request)
  },
  workspace: {
    deleteEntry: (request) => ipcRenderer.invoke(IPC_CHANNELS.workspace.deleteEntry, request),
    get: () => ipcRenderer.invoke(IPC_CHANNELS.workspace.get),
    mutateReference: (request) =>
      ipcRenderer.invoke(IPC_CHANNELS.workspace.mutateReference, request),
    saveEntry: (request) => ipcRenderer.invoke(IPC_CHANNELS.workspace.saveEntry, request),
    setChecklistValue: (request) =>
      ipcRenderer.invoke(IPC_CHANNELS.workspace.setChecklistValue, request),
    setDayStatus: (request) => ipcRenderer.invoke(IPC_CHANNELS.workspace.setDayStatus, request)
  }
}

contextBridge.exposeInMainWorld('mowl', mowl)
