// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DatabaseMetadata, MowlApi, WorkspaceSnapshot } from '../../shared/ipc'
import App from './App'
import { LocalizationProvider } from './i18n'

const metadata: DatabaseMetadata = {
  createdAt: '2026-09-16T09:00:00.000Z',
  description: 'Team work',
  displayName: 'Team log',
  updatedAt: '2026-09-16T09:00:00.000Z'
}

const emptyWorkspace: WorkspaceSnapshot = {
  accounts: [],
  activityTypes: [],
  checklistDefinitions: [],
  customers: [],
  days: [],
  entries: []
}

function createMowlApi(): MowlApi {
  return {
    database: {
      chooseDirectory: vi.fn(),
      close: vi.fn(),
      create: vi.fn().mockResolvedValue(metadata),
      list: vi.fn().mockResolvedValue({ databases: [], selectedFilePath: undefined }),
      locate: vi.fn(),
      onExternalOpen: vi.fn().mockReturnValue(() => undefined),
      open: vi.fn(),
      remove: vi.fn()
    },
    health: vi.fn(),
    settings: {
      get: vi.fn().mockResolvedValue({ enabled: false, intervalMinutes: 30, language: 'cs' }),
      update: vi.fn()
    },
    workspace: {
      deleteEntry: vi.fn(),
      get: vi.fn().mockResolvedValue(emptyWorkspace),
      mutateReference: vi.fn(),
      saveEntry: vi.fn(),
      setChecklistValue: vi.fn(),
      setDayStatus: vi.fn()
    }
  }
}

describe('application startup workflow', () => {
  beforeEach(() => {
    window.mowl = createMowlApi()
  })

  it('creates a database from the picker and opens its workspace', async () => {
    const user = userEvent.setup()
    render(
      <LocalizationProvider>
        <App />
      </LocalizationProvider>
    )

    expect(await screen.findByRole('heading', { name: 'Vyberte vykaz prace' })).toBeDefined()
    await user.click(screen.getByRole('button', { name: 'Nova databaze' }))
    await user.type(screen.getByLabelText('Nazev'), 'Team log')
    await user.type(screen.getByLabelText('Popis'), 'Team work')
    await user.click(screen.getByRole('button', { name: 'Vytvorit' }))

    expect(window.mowl.database.create).toHaveBeenCalledWith({
      description: 'Team work',
      displayName: 'Team log',
      fileName: undefined
    })
    expect(await screen.findByText('Team log')).toBeDefined()

    await user.click(screen.getByRole('button', { name: 'Pracovni polozky' }))
    expect(await screen.findByRole('heading', { name: 'Pracovni polozky' })).toBeDefined()
    await user.click(screen.getByRole('button', { name: 'Pracovni polozka' }))
    expect(await screen.findByRole('heading', { name: 'Nova pracovni polozka' })).toBeDefined()
  })
})