import { and, asc, eq } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { accounts, activityTypes, customers, workEntries } from './schema'

type MowlDatabase = BetterSQLite3Database<typeof import('./schema')>
type ActivityCategory = 'filler' | 'work'
type Customer = typeof customers.$inferSelect
type Account = typeof accounts.$inferSelect
type ActivityType = typeof activityTypes.$inferSelect

export interface CustomerInput {
  color?: string | null
  name: string
}

export interface AccountInput {
  activeFrom: string
  activeUntil?: string | null
  code: string
  customerId: number
  name: string
}

export interface ActivityTypeInput {
  color: string
  name: string
  sortOrder: number
}

export class ReferenceDataError extends Error {
  constructor(readonly code: 'reference-item-not-found' | 'reference-item-used') {
    super(code)
    this.name = 'ReferenceDataError'
  }
}

export class ReferenceDataService {
  constructor(private readonly database: MowlDatabase) {}

  listCustomers(activeOnly = false): Customer[] {
    return this.database
      .select()
      .from(customers)
      .where(activeOnly ? eq(customers.isActive, true) : undefined)
      .orderBy(asc(customers.name))
      .all()
  }

  createCustomer(input: CustomerInput): Customer {
    const now = new Date().toISOString()
    const result = this.database
      .insert(customers)
      .values({ ...input, color: input.color ?? null, createdAt: now, updatedAt: now })
      .run()
    return this.customerById(Number(result.lastInsertRowid))
  }

  updateCustomer(id: number, input: CustomerInput): Customer {
    this.assertCustomerExists(id)
    this.database
      .update(customers)
      .set({ ...input, color: input.color ?? null, updatedAt: new Date().toISOString() })
      .where(eq(customers.id, id))
      .run()
    return this.customerById(id)
  }

  deactivateCustomer(id: number): Customer {
    this.assertCustomerExists(id)
    this.database
      .update(customers)
      .set({ isActive: false, updatedAt: new Date().toISOString() })
      .where(eq(customers.id, id))
      .run()
    return this.customerById(id)
  }

  deleteCustomer(id: number): void {
    this.assertCustomerExists(id)
    if (this.database.select().from(accounts).where(eq(accounts.customerId, id)).get()) {
      throw new ReferenceDataError('reference-item-used')
    }
    this.database.delete(customers).where(eq(customers.id, id)).run()
  }

  listAccounts(customerId?: number, activeOnly = false): Account[] {
    const conditions = [
      customerId === undefined ? undefined : eq(accounts.customerId, customerId),
      activeOnly ? eq(accounts.isActive, true) : undefined
    ].filter((condition) => condition !== undefined)
    return this.database
      .select()
      .from(accounts)
      .where(and(...conditions))
      .orderBy(asc(accounts.code))
      .all()
  }

  createAccount(input: AccountInput): Account {
    const now = new Date().toISOString()
    const result = this.database
      .insert(accounts)
      .values({ ...input, activeUntil: input.activeUntil ?? null, createdAt: now, updatedAt: now })
      .run()
    return this.accountById(Number(result.lastInsertRowid))
  }

  updateAccount(id: number, input: AccountInput): Account {
    this.assertAccountExists(id)
    this.database
      .update(accounts)
      .set({
        ...input,
        activeUntil: input.activeUntil ?? null,
        updatedAt: new Date().toISOString()
      })
      .where(eq(accounts.id, id))
      .run()
    return this.accountById(id)
  }

  deactivateAccount(id: number): Account {
    this.assertAccountExists(id)
    this.database
      .update(accounts)
      .set({ isActive: false, updatedAt: new Date().toISOString() })
      .where(eq(accounts.id, id))
      .run()
    return this.accountById(id)
  }

  deleteAccount(id: number): void {
    this.assertAccountExists(id)
    if (this.database.select().from(workEntries).where(eq(workEntries.accountId, id)).get()) {
      throw new ReferenceDataError('reference-item-used')
    }
    this.database.delete(accounts).where(eq(accounts.id, id)).run()
  }

  listActivityTypes(category: ActivityCategory, activeOnly = false): ActivityType[] {
    return this.database
      .select()
      .from(activityTypes)
      .where(
        and(
          eq(activityTypes.category, category),
          activeOnly ? eq(activityTypes.isActive, true) : undefined
        )
      )
      .orderBy(asc(activityTypes.sortOrder), asc(activityTypes.name))
      .all()
  }

  createActivityType(category: ActivityCategory, input: ActivityTypeInput): ActivityType {
    const now = new Date().toISOString()
    const result = this.database
      .insert(activityTypes)
      .values({ ...input, category, createdAt: now, updatedAt: now })
      .run()
    return this.activityTypeById(Number(result.lastInsertRowid))
  }

  updateActivityType(id: number, input: ActivityTypeInput): ActivityType {
    this.assertActivityTypeExists(id)
    this.database
      .update(activityTypes)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(activityTypes.id, id))
      .run()
    return this.activityTypeById(id)
  }

  deactivateActivityType(id: number): ActivityType {
    this.assertActivityTypeExists(id)
    this.database
      .update(activityTypes)
      .set({ isActive: false, updatedAt: new Date().toISOString() })
      .where(eq(activityTypes.id, id))
      .run()
    return this.activityTypeById(id)
  }

  deleteActivityType(id: number): void {
    this.assertActivityTypeExists(id)
    if (this.database.select().from(workEntries).where(eq(workEntries.activityTypeId, id)).get()) {
      throw new ReferenceDataError('reference-item-used')
    }
    this.database.delete(activityTypes).where(eq(activityTypes.id, id)).run()
  }

  private customerById(id: number): Customer {
    const customer = this.database.select().from(customers).where(eq(customers.id, id)).get()
    if (!customer) throw new ReferenceDataError('reference-item-not-found')
    return customer
  }

  private accountById(id: number): Account {
    const account = this.database.select().from(accounts).where(eq(accounts.id, id)).get()
    if (!account) throw new ReferenceDataError('reference-item-not-found')
    return account
  }

  private activityTypeById(id: number): ActivityType {
    const activityType = this.database
      .select()
      .from(activityTypes)
      .where(eq(activityTypes.id, id))
      .get()
    if (!activityType) throw new ReferenceDataError('reference-item-not-found')
    return activityType
  }

  private assertCustomerExists(id: number): void {
    this.customerById(id)
  }

  private assertAccountExists(id: number): void {
    this.accountById(id)
  }

  private assertActivityTypeExists(id: number): void {
    this.activityTypeById(id)
  }
}
