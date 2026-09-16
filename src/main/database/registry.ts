import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'fs'
import { basename, dirname, extname, join } from 'path'
import type { DatabaseFile, DatabaseMetadata, DatabaseRegistry } from '../../shared/ipc'

interface StoredDatabase extends DatabaseMetadata {
  filePath: string
}

interface StoredRegistry {
  databases: StoredDatabase[]
  lastUsedFilePath?: string
}

export function getDefaultDatabaseDirectory(documentsPath: string): string {
  return join(documentsPath, 'MOWL')
}

export function deriveDatabaseFileName(displayName: string): string {
  const baseName = displayName
    .trim()
    .replace(/[<>:"/\\|?*]/g, '-')
    .split('')
    .filter((character) => character.charCodeAt(0) >= 32)
    .join('')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')

  if (!baseName) {
    throw new Error('A database name is required.')
  }

  return `${baseName}.mowldb`
}

export function ensureDatabaseFileName(fileName: string): string {
  const name = basename(fileName.trim())
  if (name !== fileName.trim() || !name) {
    throw new Error('The database file name must not include a path.')
  }

  return extname(name).toLowerCase() === '.mowldb' ? name : `${name}.mowldb`
}

export class DatabaseRegistryStore {
  constructor(private readonly registryPath: string) {}

  list(): DatabaseRegistry {
    const registry = this.read()
    const databases = registry.databases.map((database) => this.toDatabaseFile(database))

    return {
      databases,
      selectedFilePath: registry.lastUsedFilePath
    }
  }

  remember(filePath: string, metadata: DatabaseMetadata): void {
    const registry = this.read()
    const database: StoredDatabase = { filePath, ...metadata }
    const existingIndex = registry.databases.findIndex((entry) => entry.filePath === filePath)

    if (existingIndex === -1) {
      registry.databases.push(database)
    } else {
      registry.databases[existingIndex] = database
    }

    registry.lastUsedFilePath = filePath
    this.write(registry)
  }

  remove(filePath: string): void {
    const registry = this.read()
    registry.databases = registry.databases.filter((database) => database.filePath !== filePath)
    if (registry.lastUsedFilePath === filePath) {
      registry.lastUsedFilePath = undefined
    }
    this.write(registry)
  }

  relocate(missingFilePath: string, filePath: string, metadata: DatabaseMetadata): void {
    const registry = this.read()
    registry.databases = registry.databases.filter(
      (database) => database.filePath !== missingFilePath
    )
    const database: StoredDatabase = { filePath, ...metadata }
    const existingIndex = registry.databases.findIndex((entry) => entry.filePath === filePath)

    if (existingIndex === -1) {
      registry.databases.push(database)
    } else {
      registry.databases[existingIndex] = database
    }

    registry.lastUsedFilePath = filePath
    this.write(registry)
  }

  private read(): StoredRegistry {
    if (!existsSync(this.registryPath)) {
      return { databases: [] }
    }

    return JSON.parse(readFileSync(this.registryPath, 'utf8')) as StoredRegistry
  }

  private toDatabaseFile(database: StoredDatabase): DatabaseFile {
    if (!existsSync(database.filePath)) {
      return { ...database, modifiedAt: undefined, status: 'unavailable' }
    }

    return {
      ...database,
      modifiedAt: statSync(database.filePath).mtime.toISOString(),
      status: 'available'
    }
  }

  private write(registry: StoredRegistry): void {
    mkdirSync(dirname(this.registryPath), { recursive: true })
    const temporaryPath = `${this.registryPath}.tmp`
    writeFileSync(temporaryPath, JSON.stringify(registry, null, 2), 'utf8')
    renameSync(temporaryPath, this.registryPath)
  }
}
