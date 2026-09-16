export const IPC_CHANNELS = {
  app: {
    health: 'app:health'
  },
  database: {
    create: 'database:create',
    open: 'database:open',
    close: 'database:close'
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

export interface IpcContract {
  [IPC_CHANNELS.app.health]: {
    request: undefined
    response: HealthCheck
  }
  [IPC_CHANNELS.database.create]: {
    request: { filePath: string; displayName: string; description: string }
    response: never
  }
  [IPC_CHANNELS.database.open]: {
    request: { filePath: string }
    response: never
  }
  [IPC_CHANNELS.database.close]: {
    request: undefined
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
  health: () => Promise<HealthCheck>
}
