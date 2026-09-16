import { existsSync, mkdirSync } from 'fs'
import { dirname, extname } from 'path'
import Database from 'better-sqlite3'
import { eq } from 'drizzle-orm'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import type { DatabaseMetadata } from '../../shared/ipc'
import * as schema from './schema'
import { activityTypes, databaseMetadata } from './schema'

type MowlDatabase = BetterSQLite3Database<typeof import('./schema')>

const defaultActivityTypes = [
  { category: 'work' as const, color: '#2563eb', name: 'analysis', sortOrder: 0 },
  { category: 'work' as const, color: '#16a34a', name: 'implementation', sortOrder: 1 },
  { category: 'work' as const, color: '#ca8a04', name: 'testing', sortOrder: 2 },
  { category: 'work' as const, color: '#dc2626', name: 'bugfixing', sortOrder: 3 },
  { category: 'work' as const, color: '#7c3aed', name: 'meeting', sortOrder: 4 },
  { category: 'filler' as const, color: '#0891b2', name: 'school', sortOrder: 0 },
  { category: 'filler' as const, color: '#db2777', name: 'doctor', sortOrder: 1 },
  { category: 'filler' as const, color: '#6b7280', name: 'time off', sortOrder: 2 }
]

export interface DatabaseConnection {
  database: MowlDatabase
  close: () => void
  metadata: DatabaseMetadata
}

export interface CreateDatabaseOptions {
  description: string
  displayName: string
  filePath: string
  migrationsFolder: string
}

export interface OpenDatabaseOptions {
  filePath: string
  migrationsFolder: string
}

function assertDatabaseFilePath(filePath: string): void {
  if (extname(filePath).toLowerCase() !== '.mowldb') {
    throw new Error('MOWL databases must use the .mowldb extension.')
  }
}

function toMetadata(row: typeof databaseMetadata.$inferSelect): DatabaseMetadata {
  return {
    createdAt: row.createdAt,
    description: row.description,
    displayName: row.displayName,
    updatedAt: row.updatedAt
  }
}

function migrateDatabase(
  filePath: string,
  migrationsFolder: string
): {
  database: MowlDatabase
  sqlite: Database.Database
} {
  mkdirSync(dirname(filePath), { recursive: true })

  const sqlite = new Database(filePath)
  sqlite.pragma('foreign_keys = ON')
  const database = drizzle({ client: sqlite, schema })
  migrate(database, { migrationsFolder })

  return { database, sqlite }
}

export function createDatabase(options: CreateDatabaseOptions): DatabaseConnection {
  assertDatabaseFilePath(options.filePath)

  const { database, sqlite } = migrateDatabase(options.filePath, options.migrationsFolder)
  const now = new Date().toISOString()

  database
    .insert(databaseMetadata)
    .values({
      id: 1,
      displayName: options.displayName,
      description: options.description,
      createdAt: now,
      updatedAt: now
    })
    .onConflictDoNothing()
    .run()

  const hasMetadata = database
    .select()
    .from(databaseMetadata)
    .where(eq(databaseMetadata.id, 1))
    .get()
  if (hasMetadata?.createdAt === now) {
    database
      .insert(activityTypes)
      .values(
        defaultActivityTypes.map((activityType) => ({
          ...activityType,
          createdAt: now,
          updatedAt: now
        }))
      )
      .run()
  }

  const metadata = database.select().from(databaseMetadata).where(eq(databaseMetadata.id, 1)).get()
  if (!metadata) {
    sqlite.close()
    throw new Error('Unable to initialize database metadata.')
  }

  return { database, close: () => sqlite.close(), metadata: toMetadata(metadata) }
}

export function openDatabase(options: OpenDatabaseOptions): DatabaseConnection {
  assertDatabaseFilePath(options.filePath)
  if (!existsSync(options.filePath)) {
    throw new Error('The selected MOWL database file does not exist.')
  }

  const { database, sqlite } = migrateDatabase(options.filePath, options.migrationsFolder)
  const metadata = database.select().from(databaseMetadata).where(eq(databaseMetadata.id, 1)).get()
  if (!metadata) {
    sqlite.close()
    throw new Error('The selected file is not an initialized MOWL database.')
  }

  return { database, close: () => sqlite.close(), metadata: toMetadata(metadata) }
}
