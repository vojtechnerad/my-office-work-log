import { sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const databaseMetadata = sqliteTable('database_metadata', {
  id: integer('id').primaryKey(),
  displayName: text('display_name').notNull(),
  description: text('description').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})

export const customers = sqliteTable(
  'customers',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    color: text('color'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [uniqueIndex('customers_name_unique').on(table.name)]
)

export const accounts = sqliteTable(
  'accounts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    code: text('code').notNull(),
    activeFrom: text('active_from').notNull(),
    activeUntil: text('active_until'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    uniqueIndex('accounts_code_unique').on(table.code),
    index('accounts_customer_id_index').on(table.customerId),
    check(
      'accounts_validity_period_check',
      sql`${table.activeUntil} IS NULL OR ${table.activeUntil} >= ${table.activeFrom}`
    )
  ]
)

export const activityTypes = sqliteTable(
  'activity_types',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    category: text('category', { enum: ['work', 'filler'] }).notNull(),
    color: text('color').notNull(),
    sortOrder: integer('sort_order').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    index('activity_types_category_sort_order_index').on(table.category, table.sortOrder),
    check('activity_types_category_check', sql`${table.category} IN ('work', 'filler')`)
  ]
)

export const workDays = sqliteTable(
  'work_days',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    date: text('date').notNull(),
    status: text('status', { enum: ['draft', 'confirmed'] })
      .notNull()
      .default('draft'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    uniqueIndex('work_days_date_unique').on(table.date),
    check('work_days_status_check', sql`${table.status} IN ('draft', 'confirmed')`)
  ]
)

export const workEntries = sqliteTable(
  'work_entries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    workDayId: integer('work_day_id')
      .notNull()
      .references(() => workDays.id, { onDelete: 'cascade' }),
    accountId: integer('account_id').references(() => accounts.id, { onDelete: 'restrict' }),
    date: text('date').notNull(),
    startTime: text('start_time').notNull(),
    endTime: text('end_time').notNull(),
    ticketNumber: text('ticket_number'),
    activityTypeId: integer('activity_type_id').references(() => activityTypes.id, {
      onDelete: 'restrict'
    }),
    description: text('description'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    index('work_entries_work_day_id_index').on(table.workDayId),
    index('work_entries_account_id_index').on(table.accountId),
    index('work_entries_activity_type_id_index').on(table.activityTypeId),
    index('work_entries_date_index').on(table.date),
    check('work_entries_time_order_check', sql`${table.startTime} < ${table.endTime}`)
  ]
)

export const customerChecklistDefinitions = sqliteTable(
  'customer_checklist_definitions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    uniqueIndex('customer_checklist_definitions_customer_name_unique').on(
      table.customerId,
      table.name
    ),
    index('customer_checklist_definitions_customer_sort_order_index').on(
      table.customerId,
      table.sortOrder
    )
  ]
)

export const workEntryChecklistValues = sqliteTable(
  'work_entry_checklist_values',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    workEntryId: integer('work_entry_id')
      .notNull()
      .references(() => workEntries.id, { onDelete: 'cascade' }),
    checklistDefinitionId: integer('checklist_definition_id')
      .notNull()
      .references(() => customerChecklistDefinitions.id, { onDelete: 'restrict' }),
    isChecked: integer('is_checked', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    uniqueIndex('work_entry_checklist_values_entry_definition_unique').on(
      table.workEntryId,
      table.checklistDefinitionId
    ),
    index('work_entry_checklist_values_definition_id_index').on(table.checklistDefinitionId)
  ]
)
