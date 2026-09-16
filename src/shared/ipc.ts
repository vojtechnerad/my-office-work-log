export const IPC_CHANNELS = {
  app: {
    health: 'app:health'
  },
  database: {
    create: 'database:create',
    open: 'database:open',
    close: 'database:close',
    list: 'database:list',
    chooseDirectory: 'database:choose-directory',
    locate: 'database:locate',
    remove: 'database:remove'
  },
  settings: {
    get: 'settings:get',
    update: 'settings:update'
  },
  dialogs: {
    openDatabase: 'dialogs:open-database',
    saveDatabase: 'dialogs:save-database'
  },
  notifications: {
    show: 'notifications:show'
  }
} as const

export interface HealthCheck {
  status: 'ok'
}

export interface DatabaseMetadata {
  createdAt: string
  description: string
  displayName: string
  updatedAt: string
}

export interface DatabaseFile extends DatabaseMetadata {
  filePath: string
  modifiedAt: string | undefined
  status: 'available' | 'unavailable'
}

export interface DatabaseRegistry {
  databases: DatabaseFile[]
  selectedFilePath: string | undefined
}

export interface IpcContract {
  [IPC_CHANNELS.app.health]: {
    request: undefined
    response: HealthCheck
  }
  [IPC_CHANNELS.database.create]: {
    request: { description: string; displayName: string; directory?: string; fileName?: string }
    response: DatabaseMetadata
  }
  [IPC_CHANNELS.database.open]: {
    request: { filePath: string }
    response: DatabaseMetadata
  }
  [IPC_CHANNELS.database.close]: {
    request: undefined
    response: undefined
  }
  [IPC_CHANNELS.database.list]: {
    request: undefined
    response: DatabaseRegistry
  }
  [IPC_CHANNELS.database.chooseDirectory]: {
    request: undefined
    response: string | undefined
  }
  [IPC_CHANNELS.database.locate]: {
    request: { missingFilePath: string }
    response: DatabaseMetadata | undefined
  }
  [IPC_CHANNELS.database.remove]: {
    request: { filePath: string }
    response: undefined
  }
  [IPC_CHANNELS.settings.get]: {
    request: undefined
    response: never
  }
  [IPC_CHANNELS.settings.update]: {
    request: Record<string, never>
    response: never
  }
  [IPC_CHANNELS.dialogs.openDatabase]: {
    request: undefined
    response: string | undefined
  }
  [IPC_CHANNELS.dialogs.saveDatabase]: {
    request: undefined
    response: string | undefined
  }
  [IPC_CHANNELS.notifications.show]: {
    request: { title: string; body: string }
    response: undefined
  }
}

export interface MowlApi {
  database: {
    chooseDirectory: () => Promise<string | undefined>
    close: () => Promise<void>
    create: (
      request: IpcContract[typeof IPC_CHANNELS.database.create]['request']
    ) => Promise<DatabaseMetadata>
    open: (
      request: IpcContract[typeof IPC_CHANNELS.database.open]['request']
    ) => Promise<DatabaseMetadata>
    list: () => Promise<DatabaseRegistry>
    locate: (
      request: IpcContract[typeof IPC_CHANNELS.database.locate]['request']
    ) => Promise<DatabaseMetadata | undefined>
    remove: (request: IpcContract[typeof IPC_CHANNELS.database.remove]['request']) => Promise<void>
  }
  health: () => Promise<HealthCheck>
}
