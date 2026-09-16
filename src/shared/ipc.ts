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
  workspace: {
    get: 'workspace:get',
    saveEntry: 'workspace:save-entry',
    deleteEntry: 'workspace:delete-entry',
    setDayStatus: 'workspace:set-day-status',
    setChecklistValue: 'workspace:set-checklist-value',
    mutateReference: 'workspace:mutate-reference'
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

export type ReminderIntervalMinutes = 15 | 30 | 60 | 120
export type AppLanguage = 'cs' | 'en'

export interface ReminderSettings {
  enabled: boolean
  intervalMinutes: ReminderIntervalMinutes
  language: AppLanguage
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

export interface WorkspaceCustomer {
  color: string | null
  id: number
  isActive: boolean
  name: string
}

export interface WorkspaceAccount {
  activeFrom: string
  activeUntil: string | null
  code: string
  customerId: number
  id: number
  isActive: boolean
  name: string
}

export interface WorkspaceActivityType {
  category: 'filler' | 'work'
  color: string
  id: number
  isActive: boolean
  name: string
  sortOrder: number
}

export interface WorkspaceChecklistDefinition {
  customerId: number
  id: number
  isActive: boolean
  name: string
  sortOrder: number
}

export interface WorkspaceChecklistValue {
  checklistDefinitionId: number
  isChecked: boolean
}

export interface WorkspaceEntry {
  accountId: number | null
  activityTypeId: number | null
  checklistValues: WorkspaceChecklistValue[]
  date: string
  description: string | null
  endTime: string
  id: number
  startTime: string
  ticketNumber: string | null
  workDayId: number
}

export interface WorkspaceDay {
  date: string
  id: number
  status: 'confirmed' | 'draft'
}

export interface WorkspaceSnapshot {
  accounts: WorkspaceAccount[]
  activityTypes: WorkspaceActivityType[]
  checklistDefinitions: WorkspaceChecklistDefinition[]
  customers: WorkspaceCustomer[]
  days: WorkspaceDay[]
  entries: WorkspaceEntry[]
}

export interface SaveEntryRequest {
  accountId: number | null
  activityTypeId: number | null
  date: string
  description: string | null
  endTime: string
  id?: number
  startTime: string
  ticketNumber: string | null
}

export type ReferenceMutation =
  | { action: 'create'; entity: 'customer'; value: { color: string | null; name: string } }
  | {
      action: 'update'
      entity: 'customer'
      id: number
      value: { color: string | null; name: string }
    }
  | { action: 'create'; entity: 'account'; value: Omit<WorkspaceAccount, 'id' | 'isActive'> }
  | {
      action: 'update'
      entity: 'account'
      id: number
      value: Omit<WorkspaceAccount, 'id' | 'isActive'>
    }
  | { action: 'create'; entity: 'activity'; value: Omit<WorkspaceActivityType, 'id' | 'isActive'> }
  | {
      action: 'update'
      entity: 'activity'
      id: number
      value: Omit<WorkspaceActivityType, 'id' | 'isActive'>
    }
  | {
      action: 'create'
      entity: 'checklist'
      value: Omit<WorkspaceChecklistDefinition, 'id' | 'isActive'>
    }
  | {
      action: 'update'
      entity: 'checklist'
      id: number
      value: { name: string; sortOrder: number }
    }
  | {
      action: 'deactivate' | 'delete'
      entity: 'customer' | 'account' | 'activity' | 'checklist'
      id: number
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
  [IPC_CHANNELS.workspace.get]: {
    request: undefined
    response: WorkspaceSnapshot
  }
  [IPC_CHANNELS.workspace.saveEntry]: {
    request: SaveEntryRequest
    response: undefined
  }
  [IPC_CHANNELS.workspace.deleteEntry]: {
    request: { id: number }
    response: undefined
  }
  [IPC_CHANNELS.workspace.setDayStatus]: {
    request: { date: string; status: 'confirmed' | 'draft' }
    response: undefined
  }
  [IPC_CHANNELS.workspace.setChecklistValue]: {
    request: { checklistDefinitionId: number; isChecked: boolean; workEntryId: number }
    response: undefined
  }
  [IPC_CHANNELS.workspace.mutateReference]: {
    request: ReferenceMutation
    response: undefined
  }
  [IPC_CHANNELS.settings.get]: {
    request: undefined
    response: ReminderSettings
  }
  [IPC_CHANNELS.settings.update]: {
    request: Partial<ReminderSettings>
    response: ReminderSettings
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
  settings: {
    get: () => Promise<ReminderSettings>
    update: (request: Partial<ReminderSettings>) => Promise<ReminderSettings>
  }
  workspace: {
    deleteEntry: (request: { id: number }) => Promise<void>
    get: () => Promise<WorkspaceSnapshot>
    mutateReference: (request: ReferenceMutation) => Promise<void>
    saveEntry: (request: SaveEntryRequest) => Promise<void>
    setChecklistValue: (request: {
      checklistDefinitionId: number
      isChecked: boolean
      workEntryId: number
    }) => Promise<void>
    setDayStatus: (request: { date: string; status: 'confirmed' | 'draft' }) => Promise<void>
  }
}
