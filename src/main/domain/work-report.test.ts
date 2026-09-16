import { describe, expect, it } from 'vitest'
import type { WorkspaceEntry, WorkspaceSnapshot } from '../../shared/ipc'
import { calculateDashboard, filterWorkEntries } from '../../shared/work-report'

function entry(id: number, overrides: Partial<WorkspaceEntry> = {}): WorkspaceEntry {
  return {
    accountId: 1,
    activityTypeId: 1,
    checklistValues: [],
    date: '2026-09-16',
    description: 'Implementation review',
    endTime: '10:30',
    id,
    startTime: '09:00',
    ticketNumber: 'MOWL-10',
    workDayId: 1,
    ...overrides
  }
}

function snapshot(): WorkspaceSnapshot {
  return {
    accounts: [
      {
        activeFrom: '2026-01-01',
        activeUntil: null,
        code: 'A',
        customerId: 1,
        id: 1,
        isActive: true,
        name: 'Alpha'
      },
      {
        activeFrom: '2026-01-01',
        activeUntil: null,
        code: 'B',
        customerId: 2,
        id: 2,
        isActive: true,
        name: 'Beta'
      }
    ],
    activityTypes: [],
    checklistDefinitions: [],
    customers: [
      { color: '#111111', id: 1, isActive: true, name: 'First' },
      { color: '#222222', id: 2, isActive: true, name: 'Second' }
    ],
    days: [],
    entries: [
      entry(1),
      entry(2, {
        accountId: 2,
        activityTypeId: 2,
        date: '2026-09-15',
        description: 'Testing release',
        ticketNumber: 'APP-20'
      }),
      entry(3, {
        accountId: null,
        activityTypeId: 3,
        date: '2026-09-14',
        description: 'Doctor',
        endTime: '12:00',
        startTime: '11:30',
        ticketNumber: null
      }),
      entry(4, { date: '2026-09-20', endTime: '11:00', startTime: '10:30' }),
      entry(5, { date: '2026-09-21' })
    ]
  }
}

describe('work-entry filtering', () => {
  it('combines date, customer, account, and activity filters with inclusive boundaries', () => {
    expect(
      filterWorkEntries(snapshot(), {
        accountId: 2,
        activityTypeId: 2,
        customerId: 2,
        dateFrom: '2026-09-15',
        dateTo: '2026-09-16'
      }).map((item) => item.id)
    ).toEqual([2])
  })

  it('combines case-insensitive description and ticket searches', () => {
    expect(
      filterWorkEntries(snapshot(), { description: 'release', ticketNumber: 'app-' }).map(
        (item) => item.id
      )
    ).toEqual([2])
    expect(filterWorkEntries(snapshot(), { customerId: 1, description: 'doctor' })).toEqual([])
  })
})

describe('dashboard calculations', () => {
  it('calculates Monday-to-Sunday totals with consistent work and filler breakdowns', () => {
    const report = calculateDashboard(snapshot(), '2026-09-16')
    expect(report.today).toEqual({ fillerMinutes: 0, totalMinutes: 90, workMinutes: 90 })
    expect(report.week).toEqual({ fillerMinutes: 30, totalMinutes: 240, workMinutes: 210 })
    expect(report.weekFrom).toBe('2026-09-14')
    expect(report.weekTo).toBe('2026-09-20')
  })

  it('summarizes weekly work by customer and orders recent entries newest first', () => {
    const report = calculateDashboard(snapshot(), '2026-09-16', 3)
    expect(report.byCustomer).toEqual([
      { color: '#111111', customerId: 1, customerName: 'First', minutes: 120 },
      { color: '#222222', customerId: 2, customerName: 'Second', minutes: 90 }
    ])
    expect(report.recentEntries.map((item) => item.id)).toEqual([5, 4, 1])
  })
})
