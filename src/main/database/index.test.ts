import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import Database from 'better-sqlite3'
import { asc } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'
import { createDatabase, openDatabase } from './index'
import { activityTypes } from './schema'

const migrationsFolder = resolve(process.cwd(), 'resources/migrations')
const temporaryDirectories: string[] = []

function createTemporaryPath(): string {
  const directory = mkdtempSync(join(tmpdir(), 'mowl-database-'))
  temporaryDirectories.push(directory)
  return join(directory, 'work-log.mowldb')
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

describe('MOWL database initialization', () => {
  it('creates metadata and applies migrations to a new .mowldb file', () => {
    const filePath = createTemporaryPath()
    const connection = createDatabase({
      description: 'Local work log',
      displayName: 'Work log',
      filePath,
      migrationsFolder
    })

    expect(existsSync(filePath)).toBe(true)
    expect(connection.metadata).toMatchObject({
      description: 'Local work log',
      displayName: 'Work log'
    })
    expect(connection.metadata.createdAt).toBe(connection.metadata.updatedAt)
    const seededActivities = connection.database
      .select({ category: activityTypes.category, name: activityTypes.name })
      .from(activityTypes)
      .orderBy(asc(activityTypes.category), asc(activityTypes.sortOrder))
      .all()
    connection.close()

    const sqlite = new Database(filePath, { readonly: true })
    expect(
      sqlite
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'database_metadata'"
        )
        .get()
    ).toBeDefined()
    expect(
      sqlite.prepare('SELECT COUNT(*) AS count FROM __drizzle_migrations').get()
    ).toMatchObject({ count: 3 })
    expect(
      sqlite
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('customers', 'accounts', 'activity_types', 'work_days', 'work_entries', 'customer_checklist_definitions', 'work_entry_checklist_values')"
        )
        .all()
    ).toHaveLength(7)
    expect(sqlite.prepare("PRAGMA index_list('accounts')").all()).toContainEqual(
      expect.objectContaining({ name: 'accounts_code_unique', unique: 1 })
    )
    expect(sqlite.prepare("PRAGMA foreign_key_list('work_entries')").all()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: 'account_id', table: 'accounts' }),
        expect.objectContaining({ from: 'activity_type_id', table: 'activity_types' }),
        expect.objectContaining({ from: 'work_day_id', table: 'work_days' })
      ])
    )
    expect(seededActivities).toEqual([
      { category: 'filler', name: 'school' },
      { category: 'filler', name: 'doctor' },
      { category: 'filler', name: 'time off' },
      { category: 'work', name: 'analysis' },
      { category: 'work', name: 'implementation' },
      { category: 'work', name: 'testing' },
      { category: 'work', name: 'bugfixing' },
      { category: 'work', name: 'meeting' }
    ])
    sqlite.close()
  })

  it('runs migrations safely when opening an existing database', () => {
    const filePath = createTemporaryPath()
    const created = createDatabase({
      description: 'Local work log',
      displayName: 'Work log',
      filePath,
      migrationsFolder
    })
    created.close()

    const opened = openDatabase({ filePath, migrationsFolder })
    expect(opened.metadata).toEqual(created.metadata)
    opened.close()
  })

  it('rejects missing files, invalid extensions, and uninitialized database files', () => {
    const missingPath = createTemporaryPath()
    expect(() => openDatabase({ filePath: missingPath, migrationsFolder })).toThrow(
      'does not exist'
    )

    expect(() =>
      openDatabase({ filePath: missingPath.replace('.mowldb', '.sqlite'), migrationsFolder })
    ).toThrow('.mowldb extension')

    const invalidPath = createTemporaryPath()
    writeFileSync(invalidPath, '')
    expect(() => openDatabase({ filePath: invalidPath, migrationsFolder })).toThrow(
      'not an initialized MOWL database'
    )
  })
})
