import { mkdtempSync, rmSync, utimesSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  DatabaseRegistryStore,
  deriveDatabaseFileName,
  ensureDatabaseFileName,
  getDefaultDatabaseDirectory
} from './registry'

const temporaryDirectories: string[] = []

function createTemporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'mowl-registry-'))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

describe('MOWL database file management', () => {
  it('derives valid .mowldb file names and a Documents/MOWL default directory', () => {
    expect(deriveDatabaseFileName('  Client: Project  ')).toBe('Client- Project.mowldb')
    expect(ensureDatabaseFileName('work-log')).toBe('work-log.mowldb')
    expect(ensureDatabaseFileName('work-log.mowldb')).toBe('work-log.mowldb')
    expect(getDefaultDatabaseDirectory('C:/Users/Test/Documents')).toBe(
      join('C:/Users/Test/Documents', 'MOWL')
    )
  })

  it('lists metadata, the last used database, and unavailable files', () => {
    const directory = createTemporaryDirectory()
    const availablePath = join(directory, 'available.mowldb')
    const missingPath = join(directory, 'missing.mowldb')
    writeFileSync(availablePath, '')
    const modifiedAt = new Date('2026-09-16T08:00:00.000Z')
    utimesSync(availablePath, modifiedAt, modifiedAt)

    const registry = new DatabaseRegistryStore(join(directory, 'known-databases.json'))
    registry.remember(availablePath, {
      createdAt: '2026-09-16T07:00:00.000Z',
      description: 'Available log',
      displayName: 'Available',
      updatedAt: '2026-09-16T07:00:00.000Z'
    })
    registry.remember(missingPath, {
      createdAt: '2026-09-16T07:00:00.000Z',
      description: 'Missing log',
      displayName: 'Missing',
      updatedAt: '2026-09-16T07:00:00.000Z'
    })

    expect(registry.list()).toEqual({
      databases: [
        {
          createdAt: '2026-09-16T07:00:00.000Z',
          description: 'Available log',
          displayName: 'Available',
          filePath: availablePath,
          modifiedAt: modifiedAt.toISOString(),
          status: 'available',
          updatedAt: '2026-09-16T07:00:00.000Z'
        },
        {
          createdAt: '2026-09-16T07:00:00.000Z',
          description: 'Missing log',
          displayName: 'Missing',
          filePath: missingPath,
          modifiedAt: undefined,
          status: 'unavailable',
          updatedAt: '2026-09-16T07:00:00.000Z'
        }
      ],
      selectedFilePath: missingPath
    })
  })

  it('removes a missing database and clears it as the last-used selection', () => {
    const directory = createTemporaryDirectory()
    const missingPath = join(directory, 'missing.mowldb')
    const registry = new DatabaseRegistryStore(join(directory, 'known-databases.json'))
    registry.remember(missingPath, {
      createdAt: '2026-09-16T07:00:00.000Z',
      description: 'Missing log',
      displayName: 'Missing',
      updatedAt: '2026-09-16T07:00:00.000Z'
    })

    registry.remove(missingPath)
    expect(registry.list()).toEqual({ databases: [], selectedFilePath: undefined })
  })
})
