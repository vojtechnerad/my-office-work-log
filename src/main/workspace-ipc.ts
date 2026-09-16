import { asc, eq } from 'drizzle-orm'
import { ipcMain } from 'electron'
import {
  IPC_CHANNELS,
  type IpcContract,
  type ReferenceMutation,
  type SaveEntryRequest,
  type WorkspaceSnapshot
} from '../shared/ipc'
import type { DatabaseConnection } from './database'
import { CustomerChecklistService } from './database/customer-checklist-service'
import { ReferenceDataService } from './database/reference-data-service'
import {
  accounts,
  activityTypes,
  customerChecklistDefinitions,
  customers,
  workDays,
  workEntries,
  workEntryChecklistValues
} from './database/schema'

type Database = DatabaseConnection['database']

function requiredDatabase(getDatabase: () => Database | undefined): Database {
  const database = getDatabase()
  if (!database) throw new Error('database-not-open')
  return database
}

function getSnapshot(database: Database): WorkspaceSnapshot {
  const values = database.select().from(workEntryChecklistValues).all()
  return {
    accounts: database.select().from(accounts).orderBy(asc(accounts.code)).all(),
    activityTypes: database
      .select()
      .from(activityTypes)
      .orderBy(asc(activityTypes.category), asc(activityTypes.sortOrder))
      .all(),
    checklistDefinitions: database
      .select()
      .from(customerChecklistDefinitions)
      .orderBy(
        asc(customerChecklistDefinitions.customerId),
        asc(customerChecklistDefinitions.sortOrder)
      )
      .all(),
    customers: database.select().from(customers).orderBy(asc(customers.name)).all(),
    days: database.select().from(workDays).orderBy(asc(workDays.date)).all(),
    entries: database
      .select()
      .from(workEntries)
      .orderBy(asc(workEntries.date), asc(workEntries.startTime))
      .all()
      .map((entry) => ({
        ...entry,
        checklistValues: values
          .filter((value) => value.workEntryId === entry.id)
          .map((value) => ({
            checklistDefinitionId: value.checklistDefinitionId,
            isChecked: value.isChecked
          }))
      }))
  }
}

function saveEntry(database: Database, request: SaveEntryRequest): void {
  const now = new Date().toISOString()
  const existing = request.id
    ? database.select().from(workEntries).where(eq(workEntries.id, request.id)).get()
    : undefined
  const existingDay = existing
    ? database.select().from(workDays).where(eq(workDays.id, existing.workDayId)).get()
    : undefined

  if (existingDay?.status === 'confirmed') {
    if (
      existing?.date !== request.date ||
      existing.startTime !== request.startTime ||
      existing.endTime !== request.endTime
    ) {
      throw new Error('work-day-confirmed-locked')
    }
  }

  let day = database.select().from(workDays).where(eq(workDays.date, request.date)).get()
  if (!day) {
    const result = database
      .insert(workDays)
      .values({ createdAt: now, date: request.date, updatedAt: now })
      .run()
    day = database
      .select()
      .from(workDays)
      .where(eq(workDays.id, Number(result.lastInsertRowid)))
      .get()
  }
  if (!day || (!existing && day.status === 'confirmed'))
    throw new Error('work-day-confirmed-locked')

  const values = {
    accountId: request.accountId,
    activityTypeId: request.activityTypeId,
    date: request.date,
    description: request.description,
    endTime: request.endTime,
    startTime: request.startTime,
    ticketNumber: request.ticketNumber,
    updatedAt: now,
    workDayId: day.id
  }
  if (existing) {
    database.update(workEntries).set(values).where(eq(workEntries.id, existing.id)).run()
  } else {
    database
      .insert(workEntries)
      .values({ ...values, createdAt: now })
      .run()
  }
}

function setDayStatus(
  database: Database,
  request: IpcContract[typeof IPC_CHANNELS.workspace.setDayStatus]['request']
): void {
  const day = database.select().from(workDays).where(eq(workDays.date, request.date)).get()
  if (!day) throw new Error('work-day-not-found')
  if (request.status === 'confirmed') {
    const entries = database
      .select()
      .from(workEntries)
      .where(eq(workEntries.workDayId, day.id))
      .orderBy(asc(workEntries.startTime))
      .all()
    if (entries.length === 0) throw new Error('work-day-empty')
    const overlaps = entries.some((entry, index) =>
      entries
        .slice(index + 1)
        .some(
          (candidate) => entry.startTime < candidate.endTime && candidate.startTime < entry.endTime
        )
    )
    if (overlaps) throw new Error('work-day-overlaps')
  }
  database
    .update(workDays)
    .set({ status: request.status, updatedAt: new Date().toISOString() })
    .where(eq(workDays.id, day.id))
    .run()
}

function mutateReference(database: Database, request: ReferenceMutation): void {
  const references = new ReferenceDataService(database)
  const checklists = new CustomerChecklistService(database)
  if (request.action === 'deactivate' || request.action === 'delete') {
    const operation = request.action
    if (request.entity === 'customer') references[`${operation}Customer`](request.id)
    if (request.entity === 'account') references[`${operation}Account`](request.id)
    if (request.entity === 'activity') references[`${operation}ActivityType`](request.id)
    if (request.entity === 'checklist') checklists[`${operation}Definition`](request.id)
    return
  }
  if (!('value' in request)) return

  if (request.entity === 'customer') {
    if (request.action === 'create') references.createCustomer(request.value)
    else references.updateCustomer(request.id, request.value)
  }
  if (request.entity === 'account') {
    if (request.action === 'create') references.createAccount(request.value)
    else references.updateAccount(request.id, request.value)
  }
  if (request.entity === 'activity') {
    const { category, ...value } = request.value
    if (request.action === 'create') references.createActivityType(category, value)
    else references.updateActivityType(request.id, value)
  }
  if (request.entity === 'checklist') {
    if (request.action === 'create')
      checklists.createDefinition(request.value.customerId, request.value)
    else checklists.renameDefinition(request.id, request.value.name)
  }
}

export function registerWorkspaceIpc(getDatabase: () => Database | undefined): void {
  ipcMain.handle(IPC_CHANNELS.workspace.get, () => getSnapshot(requiredDatabase(getDatabase)))
  ipcMain.handle(IPC_CHANNELS.workspace.saveEntry, (_, request: SaveEntryRequest) =>
    saveEntry(requiredDatabase(getDatabase), request)
  )
  ipcMain.handle(IPC_CHANNELS.workspace.deleteEntry, (_, request: { id: number }) => {
    const database = requiredDatabase(getDatabase)
    const entry = database.select().from(workEntries).where(eq(workEntries.id, request.id)).get()
    if (!entry) return
    const day = database.select().from(workDays).where(eq(workDays.id, entry.workDayId)).get()
    if (day?.status === 'confirmed') throw new Error('work-day-confirmed-locked')
    database.delete(workEntries).where(eq(workEntries.id, request.id)).run()
  })
  ipcMain.handle(IPC_CHANNELS.workspace.setDayStatus, (_, request) =>
    setDayStatus(requiredDatabase(getDatabase), request)
  )
  ipcMain.handle(IPC_CHANNELS.workspace.setChecklistValue, (_, request) =>
    new CustomerChecklistService(requiredDatabase(getDatabase)).setEntryValue(
      request.workEntryId,
      request.checklistDefinitionId,
      request.isChecked
    )
  )
  ipcMain.handle(IPC_CHANNELS.workspace.mutateReference, (_, request: ReferenceMutation) =>
    mutateReference(requiredDatabase(getDatabase), request)
  )
}
