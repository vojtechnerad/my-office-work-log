import { existsSync, mkdirSync } from 'fs'
import { dirname, extname } from 'path'
import Database from 'better-sqlite3'
import { eq } from 'drizzle-orm'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import type { DatabaseMetadata } from '../../shared/ipc'
import * as schema from './schema'
import { databaseMetadata } from './schema'

type MowlDatabase = BetterSQLite3Database<typeof import('./schema')>

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
