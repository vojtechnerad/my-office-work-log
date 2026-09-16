import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, type MowlApi } from '../shared/ipc'

const mowl: MowlApi = {
  health: () => ipcRenderer.invoke(IPC_CHANNELS.app.health)
}

contextBridge.exposeInMainWorld('mowl', mowl)
