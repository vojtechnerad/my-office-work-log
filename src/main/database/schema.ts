import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const databaseMetadata = sqliteTable('database_metadata', {
  id: integer('id').primaryKey(),
  displayName: text('display_name').notNull(),
  description: text('description').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})
