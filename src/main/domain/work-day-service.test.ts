import { describe, expect, it } from 'vitest'
import {
  WorkDayService,
  type Account,
  type ActivityType,
  type ChecklistDefinition,
  type WorkDay
} from './work-day-service'

const workAccount: Account = {
  activeFrom: '2026-01-01',
  activeUntil: null,
  id: 1,
  isActive: true
}
const inactiveAccount: Account = { ...workAccount, id: 2, isActive: false }
const expiredAccount: Account = { ...workAccount, activeUntil: '2026-01-31', id: 3 }
const workActivity: ActivityType = { category: 'work', id: 1, isActive: true }
const fillerActivity: ActivityType = { category: 'filler', id: 2, isActive: true }
const customerAccount: Account = { ...workAccount, customerId: 10 }
const checklistDefinitions: ChecklistDefinition[] = [
  { customerId: 10, id: 1, isActive: true, name: 'Reviewed', sortOrder: 0 },
  { customerId: 10, id: 2, isActive: false, name: 'Legacy check', sortOrder: 1 }
]

function createDay(status: WorkDay['status'] = 'draft'): WorkDay {
  return { date: '2026-02-10', entries: [], id: 1, status }
}

function expectRule(rule: string, callback: () => unknown): void {
  expect(callback).toThrow(expect.objectContaining({ code: rule }))
}

describe('work entry validation', () => {
  it('requires account, date, start time, and end time for work entries', () => {
    const service = new WorkDayService([workAccount], [workActivity, fillerActivity])
    const day = createDay()

    expectRule('work-account-required', () =>
      service.addEntry(day, { date: day.date, endTime: '10:00', startTime: '09:00' })
    )
    expectRule('entry-date-required', () =>
      service.addEntry(day, { accountId: 1, endTime: '10:00', startTime: '09:00' })
    )
    expectRule('entry-start-time-required', () =>
      service.addEntry(day, { accountId: 1, date: day.date, endTime: '10:00' })
    )
    expectRule('entry-end-time-required', () =>
      service.addEntry(day, { accountId: 1, date: day.date, startTime: '09:00' })
    )
  })

  it('requires date, times, and an active filler activity for filler entries', () => {
    const service = new WorkDayService([workAccount], [workActivity, fillerActivity])
    const day = createDay()

    expectRule('filler-activity-required', () =>
      service.addEntry(day, {
        date: day.date,
        endTime: '10:00',
        kind: 'filler',
        startTime: '09:00'
      })
    )
    expectRule('filler-activity-invalid', () =>
      service.addEntry(day, {
        activityTypeId: workActivity.id,
        date: day.date,
        endTime: '10:00',
        kind: 'filler',
        startTime: '09:00'
      })
    )
  })

  it('rejects invalid time formats, non-positive intervals, and cross-day dates', () => {
    const service = new WorkDayService([workAccount], [workActivity, fillerActivity])
    const day = createDay()

    expectRule('entry-time-invalid', () =>
      service.addEntry(day, { accountId: 1, date: day.date, endTime: '10:00', startTime: '9:00' })
    )
    expectRule('entry-time-order-invalid', () =>
      service.addEntry(day, { accountId: 1, date: day.date, endTime: '09:00', startTime: '10:00' })
    )
    expectRule('entry-crosses-midnight', () =>
      service.addEntry(day, {
        accountId: 1,
        date: '2026-02-11',
        endTime: '10:00',
        startTime: '09:00'
      })
    )
  })

  it('only permits active accounts valid on the selected date', () => {
    const service = new WorkDayService(
      [workAccount, inactiveAccount, expiredAccount],
      [workActivity]
    )

    expect(service.validAccountsForDate('2026-01-15')).toEqual([workAccount, expiredAccount])
    expect(service.validAccountsForDate('2026-02-10')).toEqual([workAccount])
    expectRule('account-invalid-for-date', () =>
      service.addEntry(createDay(), {
        accountId: expiredAccount.id,
        date: '2026-02-10',
        endTime: '10:00',
        startTime: '09:00'
      })
    )
  })
})

describe('work-day workflow', () => {
  it('saves overlaps with a warning shared by work and filler entries', () => {
    const service = new WorkDayService([workAccount], [workActivity, fillerActivity])
    const day = createDay()
    service.addEntry(day, { accountId: 1, date: day.date, endTime: '10:00', startTime: '09:00' })

    const result = service.addEntry(day, {
      activityTypeId: fillerActivity.id,
      date: day.date,
      endTime: '10:30',
      startTime: '09:30'
    })

    expect(result.warnings).toEqual([{ code: 'entry-overlap', entryIds: [1] }])
    expect(day.entries).toHaveLength(2)
  })

  it('cannot confirm empty or overlapping days', () => {
    const service = new WorkDayService([workAccount], [workActivity, fillerActivity])
    const emptyDay = createDay()
    expectRule('work-day-empty', () => service.confirmDay(emptyDay))

    service.addEntry(emptyDay, {
      accountId: 1,
      date: emptyDay.date,
      endTime: '10:00',
      startTime: '09:00'
    })
    service.addEntry(emptyDay, {
      accountId: 1,
      date: emptyDay.date,
      endTime: '10:30',
      startTime: '09:30'
    })
    expectRule('work-day-overlaps', () => service.confirmDay(emptyDay))
  })

  it('locks entry additions, deletions, and structural changes after confirmation', () => {
    const service = new WorkDayService([workAccount], [workActivity])
    const day = createDay()
    const entry = service.addEntry(day, {
      accountId: 1,
      date: day.date,
      endTime: '10:00',
      startTime: '09:00'
    }).entry
    service.confirmDay(day)

    expectRule('work-day-confirmed-locked', () =>
      service.addEntry(day, { accountId: 1, date: day.date, endTime: '12:00', startTime: '11:00' })
    )
    expectRule('work-day-confirmed-locked', () => service.deleteEntry(day, entry.id))
    expectRule('work-day-confirmed-locked', () =>
      service.updateEntry(day, entry.id, { startTime: '08:30' })
    )
    expectRule('work-day-confirmed-locked', () =>
      service.updateEntry(day, entry.id, { date: '2026-02-11' })
    )
  })

  it('allows non-structural entry fields and checklist values after confirmation', () => {
    const service = new WorkDayService([workAccount], [workActivity])
    const day = createDay()
    const entry = service.addEntry(day, {
      accountId: 1,
      date: day.date,
      endTime: '10:00',
      startTime: '09:00'
    }).entry
    service.confirmDay(day)

    service.updateEntry(day, entry.id, { description: 'Reviewed', ticketNumber: 'MOWL-1' })
    service.setChecklistValue(entry, 42, true)
    expect(entry.description).toBe('Reviewed')
    expect(entry.ticketNumber).toBe('MOWL-1')
    expect(entry.checklistValues).toEqual([{ checklistDefinitionId: 42, isChecked: true }])
  })

  it('shows inherited checklist definitions only for work entries and retains checked inactive items', () => {
    const service = new WorkDayService(
      [customerAccount],
      [workActivity, fillerActivity],
      checklistDefinitions
    )
    const day = createDay()
    const workEntry = service.addEntry(day, {
      accountId: customerAccount.id,
      date: day.date,
      endTime: '10:00',
      startTime: '09:00'
    }).entry
    const fillerEntry = service.addEntry(day, {
      activityTypeId: fillerActivity.id,
      date: day.date,
      endTime: '11:00',
      kind: 'filler',
      startTime: '10:00'
    }).entry

    expect(
      service.visibleChecklistDefinitions(workEntry).map((definition) => definition.id)
    ).toEqual([1])
    expect(service.visibleChecklistDefinitions(fillerEntry)).toEqual([])
    service.confirmDay(day)
    service.setChecklistValue(workEntry, 2, true)
    expect(
      service.visibleChecklistDefinitions(workEntry).map((definition) => definition.id)
    ).toEqual([1, 2])
    service.setChecklistValue(workEntry, 2, false)
    expect(
      service.visibleChecklistDefinitions(workEntry).map((definition) => definition.id)
    ).toEqual([1])
  })

  it('requires explicit confirmation before returning a day to draft', () => {
    const service = new WorkDayService([workAccount], [workActivity])
    const day = createDay()
    service.addEntry(day, { accountId: 1, date: day.date, endTime: '10:00', startTime: '09:00' })
    service.confirmDay(day)

    expectRule('work-day-unlock-confirmation-required', () => service.returnDayToDraft(day, false))
    service.returnDayToDraft(day, true)
    expect(day.status).toBe('draft')
  })
})
