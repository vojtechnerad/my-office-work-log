import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { createDatabase } from './index'
import { ReferenceDataService } from './reference-data-service'
import { workDays, workEntries } from './schema'

const migrationsFolder = resolve(process.cwd(), 'resources/migrations')
const temporaryDirectories: string[] = []
const closeConnections: Array<() => void> = []

function createService(): {
  database: ReturnType<typeof createDatabase>['database']
  service: ReferenceDataService
} {
  const directory = mkdtempSync(join(tmpdir(), 'mowl-reference-data-'))
  temporaryDirectories.push(directory)
  const connection = createDatabase({
    description: 'Test data',
    displayName: 'Test database',
    filePath: join(directory, 'test.mowldb'),
    migrationsFolder
  })
  closeConnections.push(connection.close)
  return { database: connection.database, service: new ReferenceDataService(connection.database) }
}

afterEach(() => {
  for (const close of closeConnections.splice(0)) close()
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

describe('reference data service', () => {
  it('creates, updates, deactivates, and deletes unused customers', () => {
    const { service } = createService()
    const customer = service.createCustomer({ color: '#123456', name: 'Acme' })
    expect(customer).toMatchObject({ isActive: true, name: 'Acme' })

    expect(service.updateCustomer(customer.id, { name: 'Acme Europe' })).toMatchObject({
      color: null,
      name: 'Acme Europe'
    })
    expect(service.deactivateCustomer(customer.id).isActive).toBe(false)
    expect(service.listCustomers(true)).not.toContainEqual(
      expect.objectContaining({ id: customer.id })
    )

    service.deleteCustomer(customer.id)
    expect(service.listCustomers()).not.toContainEqual(expect.objectContaining({ id: customer.id }))
  })

  it('creates, updates, deactivates, and deletes unused accounts', () => {
    const { service } = createService()
    const customer = service.createCustomer({ name: 'Acme' })
    const account = service.createAccount({
      activeFrom: '2026-01-01',
      code: 'ACME-1',
      customerId: customer.id,
      name: 'Primary'
    })
    expect(
      service.updateAccount(account.id, {
        activeFrom: '2026-01-01',
        activeUntil: '2026-12-31',
        code: 'ACME-2',
        customerId: customer.id,
        name: 'Renamed'
      })
    ).toMatchObject({ code: 'ACME-2', name: 'Renamed' })
    expect(service.deactivateAccount(account.id).isActive).toBe(false)
    expect(service.listAccounts(undefined, true)).not.toContainEqual(
      expect.objectContaining({ id: account.id })
    )

    service.deleteAccount(account.id)
    expect(service.listAccounts()).not.toContainEqual(expect.objectContaining({ id: account.id }))
  })

  it('creates, updates, deactivates, and deletes unused filler activities', () => {
    const { service } = createService()
    const activity = service.createActivityType('filler', {
      color: '#123456',
      name: 'errand',
      sortOrder: 10
    })
    expect(
      service.updateActivityType(activity.id, {
        color: '#abcdef',
        name: 'personal errand',
        sortOrder: 11
      })
    ).toMatchObject({ category: 'filler', name: 'personal errand' })
    expect(service.deactivateActivityType(activity.id).isActive).toBe(false)
    expect(service.listActivityTypes('filler', true)).not.toContainEqual(
      expect.objectContaining({ id: activity.id })
    )

    service.deleteActivityType(activity.id)
    expect(service.listActivityTypes('filler')).not.toContainEqual(
      expect.objectContaining({ id: activity.id })
    )
  })

  it('retains historical account and activity references while preventing their deletion', () => {
    const { database, service } = createService()
    const customer = service.createCustomer({ name: 'Acme' })
    const account = service.createAccount({
      activeFrom: '2026-01-01',
      code: 'ACME-1',
      customerId: customer.id,
      name: 'Primary'
    })
    const activity = service.listActivityTypes('work', true)[0]
    const now = new Date().toISOString()
    const day = database
      .insert(workDays)
      .values({ createdAt: now, date: '2026-02-10', updatedAt: now })
      .run()
    database
      .insert(workEntries)
      .values({
        accountId: account.id,
        activityTypeId: activity.id,
        createdAt: now,
        date: '2026-02-10',
        endTime: '10:00',
        startTime: '09:00',
        updatedAt: now,
        workDayId: Number(day.lastInsertRowid)
      })
      .run()

    service.deactivateAccount(account.id)
    service.deactivateActivityType(activity.id)
    expect(service.listAccounts()).toContainEqual(
      expect.objectContaining({ id: account.id, isActive: false })
    )
    expect(service.listActivityTypes('work')).toContainEqual(
      expect.objectContaining({ id: activity.id, isActive: false })
    )
    expect(() => service.deleteAccount(account.id)).toThrow(
      expect.objectContaining({ code: 'reference-item-used' })
    )
    expect(() => service.deleteActivityType(activity.id)).toThrow(
      expect.objectContaining({ code: 'reference-item-used' })
    )
    expect(() => service.deleteCustomer(customer.id)).toThrow(
      expect.objectContaining({ code: 'reference-item-used' })
    )
  })
})
