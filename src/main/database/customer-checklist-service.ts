import { and, asc, eq } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import {
  accounts,
  customerChecklistDefinitions,
  workEntries,
  workEntryChecklistValues
} from './schema'

type MowlDatabase = BetterSQLite3Database<typeof import('./schema')>
type ChecklistDefinition = typeof customerChecklistDefinitions.$inferSelect
type EntryChecklistItem = ChecklistDefinition & { isChecked: boolean }

export interface ChecklistDefinitionInput {
  name: string
  sortOrder: number
}

export class CustomerChecklistError extends Error {
  constructor(
    readonly code:
      | 'checklist-definition-not-found'
      | 'checklist-definition-used'
      | 'checklist-entry-not-found'
      | 'checklist-filler-entry-forbidden'
      | 'checklist-definition-not-available'
  ) {
    super(code)
    this.name = 'CustomerChecklistError'
  }
}

export class CustomerChecklistService {
  constructor(private readonly database: MowlDatabase) {}

  createDefinition(customerId: number, input: ChecklistDefinitionInput): ChecklistDefinition {
    const now = new Date().toISOString()
    const result = this.database
      .insert(customerChecklistDefinitions)
      .values({ customerId, ...input, createdAt: now, updatedAt: now })
      .run()
    return this.definitionById(Number(result.lastInsertRowid))
  }

  listDefinitions(customerId: number, activeOnly = false): ChecklistDefinition[] {
    return this.database
      .select()
      .from(customerChecklistDefinitions)
      .where(
        and(
          eq(customerChecklistDefinitions.customerId, customerId),
          activeOnly ? eq(customerChecklistDefinitions.isActive, true) : undefined
        )
      )
      .orderBy(asc(customerChecklistDefinitions.sortOrder), asc(customerChecklistDefinitions.name))
      .all()
  }

  renameDefinition(id: number, name: string): ChecklistDefinition {
    this.definitionById(id)
    this.database
      .update(customerChecklistDefinitions)
      .set({ name, updatedAt: new Date().toISOString() })
      .where(eq(customerChecklistDefinitions.id, id))
      .run()
    return this.definitionById(id)
  }

  deactivateDefinition(id: number): ChecklistDefinition {
    this.definitionById(id)
    this.database
      .update(customerChecklistDefinitions)
      .set({ isActive: false, updatedAt: new Date().toISOString() })
      .where(eq(customerChecklistDefinitions.id, id))
      .run()
    return this.definitionById(id)
  }

  deleteDefinition(id: number): void {
    this.definitionById(id)
    if (
      this.database
        .select()
        .from(workEntryChecklistValues)
        .where(
          and(
            eq(workEntryChecklistValues.checklistDefinitionId, id),
            eq(workEntryChecklistValues.isChecked, true)
          )
        )
        .get()
    ) {
      throw new CustomerChecklistError('checklist-definition-used')
    }

    this.database
      .delete(workEntryChecklistValues)
      .where(eq(workEntryChecklistValues.checklistDefinitionId, id))
      .run()
    this.database
      .delete(customerChecklistDefinitions)
      .where(eq(customerChecklistDefinitions.id, id))
      .run()
  }

  listItemsForEntry(workEntryId: number): EntryChecklistItem[] {
    const entry = this.database
      .select({ accountId: workEntries.accountId })
      .from(workEntries)
      .where(eq(workEntries.id, workEntryId))
      .get()
    if (!entry) throw new CustomerChecklistError('checklist-entry-not-found')
    if (entry.accountId === null) return []

    const account = this.database
      .select({ customerId: accounts.customerId })
      .from(accounts)
      .where(eq(accounts.id, entry.accountId))
      .get()
    if (!account) throw new CustomerChecklistError('checklist-entry-not-found')

    const definitions = this.listDefinitions(account.customerId)
    const values = this.database
      .select()
      .from(workEntryChecklistValues)
      .where(eq(workEntryChecklistValues.workEntryId, workEntryId))
      .all()
    const valuesByDefinitionId = new Map(
      values.map((value) => [value.checklistDefinitionId, value])
    )

    return definitions
      .filter(
        (definition) => definition.isActive || valuesByDefinitionId.get(definition.id)?.isChecked
      )
      .map((definition) => ({
        ...definition,
        isChecked: valuesByDefinitionId.get(definition.id)?.isChecked ?? false
      }))
  }

  setEntryValue(workEntryId: number, checklistDefinitionId: number, isChecked: boolean): void {
    const entry = this.database
      .select({ accountId: workEntries.accountId })
      .from(workEntries)
      .where(eq(workEntries.id, workEntryId))
      .get()
    if (!entry) throw new CustomerChecklistError('checklist-entry-not-found')
    if (entry.accountId === null)
      throw new CustomerChecklistError('checklist-filler-entry-forbidden')

    const definition = this.definitionById(checklistDefinitionId)
    const account = this.database
      .select({ customerId: accounts.customerId })
      .from(accounts)
      .where(eq(accounts.id, entry.accountId))
      .get()
    if (!account || account.customerId !== definition.customerId) {
      throw new CustomerChecklistError('checklist-definition-not-available')
    }

    const now = new Date().toISOString()
    this.database
      .insert(workEntryChecklistValues)
      .values({ checklistDefinitionId, createdAt: now, isChecked, updatedAt: now, workEntryId })
      .onConflictDoUpdate({
        target: [
          workEntryChecklistValues.workEntryId,
          workEntryChecklistValues.checklistDefinitionId
        ],
        set: { isChecked, updatedAt: now }
      })
      .run()
  }

  private definitionById(id: number): ChecklistDefinition {
    const definition = this.database
      .select()
      .from(customerChecklistDefinitions)
      .where(eq(customerChecklistDefinitions.id, id))
      .get()
    if (!definition) throw new CustomerChecklistError('checklist-definition-not-found')
    return definition
  }
}
