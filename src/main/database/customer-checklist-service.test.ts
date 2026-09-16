import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { createDatabase } from './index'
import { CustomerChecklistService } from './customer-checklist-service'
import { ReferenceDataService } from './reference-data-service'
import { workDays, workEntries } from './schema'

const migrationsFolder = resolve(process.cwd(), 'resources/migrations')
const temporaryDirectories: string[] = []
const closeConnections: Array<() => void> = []

function createServices() {
  const directory = mkdtempSync(join(tmpdir(), 'mowl-customer-checklist-'))
  temporaryDirectories.push(directory)
  const connection = createDatabase({
    description: 'Test data',
    displayName: 'Test database',
    filePath: join(directory, 'test.mowldb'),
    migrationsFolder
  })
  closeConnections.push(connection.close)
  return {
    checklist: new CustomerChecklistService(connection.database),
    database: connection.database,
    referenceData: new ReferenceDataService(connection.database)
  }
}

function createEntry(
  database: ReturnType<typeof createDatabase>['database'],
  accountId: number | null,
  date: string
): number {
  const now = new Date().toISOString()
  const day = database.insert(workDays).values({ createdAt: now, date, updatedAt: now }).run()
  const entry = database
    .insert(workEntries)
    .values({
      accountId,
      createdAt: now,
      date,
      endTime: '10:00',
      startTime: '09:00',
      updatedAt: now,
      workDayId: Number(day.lastInsertRowid)
    })
    .run()
  return Number(entry.lastInsertRowid)
}

afterEach(() => {
  for (const close of closeConnections.splice(0)) close()
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

describe('customer checklist service', () => {
  it('inherits definitions for every work entry under a customer and stores values per entry', () => {
    const { checklist, database, referenceData } = createServices()
    const customer = referenceData.createCustomer({ name: 'Acme' })
    const otherCustomer = referenceData.createCustomer({ name: 'Other' })
    const firstAccount = referenceData.createAccount({
      activeFrom: '2026-01-01',
      code: 'ACME-1',
      customerId: customer.id,
      name: 'First'
    })
    const secondAccount = referenceData.createAccount({
      activeFrom: '2026-01-01',
      code: 'ACME-2',
      customerId: customer.id,
      name: 'Second'
    })
    const otherAccount = referenceData.createAccount({
      activeFrom: '2026-01-01',
      code: 'OTHER-1',
      customerId: otherCustomer.id,
      name: 'Other'
    })
    const definition = checklist.createDefinition(customer.id, { name: 'Reviewed', sortOrder: 0 })
    const firstEntryId = createEntry(database, firstAccount.id, '2026-02-10')
    const secondEntryId = createEntry(database, secondAccount.id, '2026-02-11')

    expect(checklist.listItemsForEntry(firstEntryId)).toContainEqual(
      expect.objectContaining({ id: definition.id, isChecked: false })
    )
    expect(checklist.listItemsForEntry(secondEntryId)).toContainEqual(
      expect.objectContaining({ id: definition.id, isChecked: false })
    )
    expect(
      checklist.listItemsForEntry(createEntry(database, otherAccount.id, '2026-02-12'))
    ).toEqual([])
    expect(checklist.listItemsForEntry(createEntry(database, null, '2026-02-13'))).toEqual([])

    checklist.setEntryValue(firstEntryId, definition.id, true)
    expect(checklist.listItemsForEntry(firstEntryId)).toContainEqual(
      expect.objectContaining({ id: definition.id, isChecked: true })
    )
    expect(checklist.listItemsForEntry(secondEntryId)).toContainEqual(
      expect.objectContaining({ id: definition.id, isChecked: false })
    )
  })

  it('allows rename and deletion only while every stored value is unchecked', () => {
    const { checklist, database, referenceData } = createServices()
    const customer = referenceData.createCustomer({ name: 'Acme' })
    const account = referenceData.createAccount({
      activeFrom: '2026-01-01',
      code: 'ACME-1',
      customerId: customer.id,
      name: 'Primary'
    })
    const definition = checklist.createDefinition(customer.id, { name: 'Reviewed', sortOrder: 0 })
    const entryId = createEntry(database, account.id, '2026-02-10')

    expect(checklist.renameDefinition(definition.id, 'Peer reviewed').name).toBe('Peer reviewed')
    checklist.setEntryValue(entryId, definition.id, true)
    expect(() => checklist.deleteDefinition(definition.id)).toThrow(
      expect.objectContaining({ code: 'checklist-definition-used' })
    )

    checklist.setEntryValue(entryId, definition.id, false)
    checklist.deleteDefinition(definition.id)
    expect(checklist.listDefinitions(customer.id)).toEqual([])
  })

  it('hides deactivated definitions except where a historical entry remains checked', () => {
    const { checklist, database, referenceData } = createServices()
    const customer = referenceData.createCustomer({ name: 'Acme' })
    const account = referenceData.createAccount({
      activeFrom: '2026-01-01',
      code: 'ACME-1',
      customerId: customer.id,
      name: 'Primary'
    })
    const definition = checklist.createDefinition(customer.id, { name: 'Reviewed', sortOrder: 0 })
    const checkedEntryId = createEntry(database, account.id, '2026-02-10')
    const newEntryId = createEntry(database, account.id, '2026-02-11')
    checklist.setEntryValue(checkedEntryId, definition.id, true)

    checklist.deactivateDefinition(definition.id)
    expect(checklist.listDefinitions(customer.id, true)).toEqual([])
    expect(checklist.listItemsForEntry(checkedEntryId)).toContainEqual(
      expect.objectContaining({ id: definition.id, isChecked: true })
    )
    expect(checklist.listItemsForEntry(newEntryId)).toEqual([])

    checklist.setEntryValue(checkedEntryId, definition.id, false)
    expect(checklist.listItemsForEntry(checkedEntryId)).toEqual([])
  })
})
