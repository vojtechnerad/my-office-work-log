export interface Account {
  activeFrom: string
  activeUntil: string | null
  customerId?: number
  id: number
  isActive: boolean
}

export interface ChecklistDefinition {
  customerId: number
  id: number
  isActive: boolean
  name: string
  sortOrder: number
}

export interface ActivityType {
  category: 'filler' | 'work'
  id: number
  isActive: boolean
}

export interface ChecklistValue {
  checklistDefinitionId: number
  isChecked: boolean
}

export interface WorkEntry {
  accountId: number | null
  activityTypeId: number | null
  checklistValues: ChecklistValue[]
  date: string
  description: string | null
  endTime: string
  id: number
  startTime: string
  ticketNumber: string | null
}

export interface WorkDay {
  date: string
  entries: WorkEntry[]
  id: number
  status: 'confirmed' | 'draft'
}

export interface EntryInput {
  accountId?: number | null
  activityTypeId?: number | null
  checklistValues?: ChecklistValue[]
  date?: string
  description?: string | null
  endTime?: string
  kind?: 'filler' | 'work'
  startTime?: string
  ticketNumber?: string | null
}

export interface EntryResult {
  entry: WorkEntry
  warnings: Array<{ code: 'entry-overlap'; entryIds: number[] }>
}

export class DomainValidationError extends Error {
  constructor(readonly code: string) {
    super(code)
    this.name = 'DomainValidationError'
  }
}

function assert(condition: unknown, code: string): asserts condition {
  if (!condition) {
    throw new DomainValidationError(code)
  }
}

function isTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function overlaps(first: WorkEntry, second: WorkEntry): boolean {
  return first.startTime < second.endTime && second.startTime < first.endTime
}

export class WorkDayService {
  constructor(
    private readonly accounts: Account[],
    private readonly activityTypes: ActivityType[],
    private readonly checklistDefinitions: ChecklistDefinition[] = []
  ) {}

  validAccountsForDate(date: string): Account[] {
    return this.accounts.filter(
      (account) =>
        account.isActive &&
        account.activeFrom <= date &&
        (account.activeUntil === null || account.activeUntil >= date)
    )
  }

  addEntry(day: WorkDay, input: EntryInput): EntryResult {
    this.assertDraft(day)
    const entry = this.createEntry(day, input)
    const warnings = this.overlapWarnings(day.entries, entry)
    day.entries.push(entry)
    return { entry, warnings }
  }

  deleteEntry(day: WorkDay, entryId: number): void {
    this.assertDraft(day)
    const entryIndex = day.entries.findIndex((entry) => entry.id === entryId)
    assert(entryIndex !== -1, 'entry-not-found')
    day.entries.splice(entryIndex, 1)
  }

  updateEntry(day: WorkDay, entryId: number, changes: EntryInput): EntryResult {
    const entry = day.entries.find((candidate) => candidate.id === entryId)
    assert(entry, 'entry-not-found')

    if (
      day.status === 'confirmed' &&
      (changes.date !== undefined ||
        changes.startTime !== undefined ||
        changes.endTime !== undefined)
    ) {
      throw new DomainValidationError('work-day-confirmed-locked')
    }

    const updatedEntry = this.createEntry(day, { ...entry, ...changes }, entry.id)
    const warnings = this.overlapWarnings(
      day.entries.filter((candidate) => candidate.id !== entry.id),
      updatedEntry
    )
    Object.assign(entry, updatedEntry)
    return { entry, warnings }
  }

  confirmDay(day: WorkDay): void {
    assert(day.entries.length > 0, 'work-day-empty')
    const hasOverlaps = day.entries.some((entry, index) =>
      day.entries.slice(index + 1).some((candidate) => overlaps(entry, candidate))
    )
    assert(!hasOverlaps, 'work-day-overlaps')
    day.status = 'confirmed'
  }

  returnDayToDraft(day: WorkDay, confirmed: boolean): void {
    assert(day.status === 'confirmed', 'work-day-not-confirmed')
    assert(confirmed, 'work-day-unlock-confirmation-required')
    day.status = 'draft'
  }

  setChecklistValue(entry: WorkEntry, checklistDefinitionId: number, isChecked: boolean): void {
    assert(entry.accountId !== null, 'filler-entry-checklist-forbidden')
    const existingValue = entry.checklistValues.find(
      (value) => value.checklistDefinitionId === checklistDefinitionId
    )
    if (existingValue) {
      existingValue.isChecked = isChecked
      return
    }
    entry.checklistValues.push({ checklistDefinitionId, isChecked })
  }

  visibleChecklistDefinitions(entry: WorkEntry): ChecklistDefinition[] {
    if (entry.accountId === null) return []
    const account = this.accounts.find((candidate) => candidate.id === entry.accountId)
    if (!account?.customerId) return []

    return this.checklistDefinitions.filter((definition) => {
      if (definition.customerId !== account.customerId) return false
      return (
        definition.isActive ||
        entry.checklistValues.some(
          (value) => value.checklistDefinitionId === definition.id && value.isChecked
        )
      )
    })
  }

  private assertDraft(day: WorkDay): void {
    assert(day.status === 'draft', 'work-day-confirmed-locked')
  }

  private createEntry(day: WorkDay, input: EntryInput, id?: number): WorkEntry {
    const date = input.date
    const startTime = input.startTime
    const endTime = input.endTime
    const accountId = input.accountId ?? null
    const activityTypeId = input.activityTypeId ?? null

    assert(date, 'entry-date-required')
    assert(startTime, 'entry-start-time-required')
    assert(endTime, 'entry-end-time-required')
    assert(date === day.date, 'entry-crosses-midnight')
    assert(isTime(startTime) && isTime(endTime), 'entry-time-invalid')
    assert(startTime < endTime, 'entry-time-order-invalid')

    const activityType = this.activityTypes.find((candidate) => candidate.id === activityTypeId)
    const isFiller =
      input.kind === 'filler' || (accountId === null && activityType?.category === 'filler')

    if (isFiller) {
      const activityType = this.activityTypes.find((candidate) => candidate.id === activityTypeId)
      assert(activityTypeId !== null, 'filler-activity-required')
      assert(
        activityType?.isActive && activityType.category === 'filler',
        'filler-activity-invalid'
      )
    } else {
      assert(accountId !== null, 'work-account-required')
      assert(
        this.validAccountsForDate(date).some((account) => account.id === accountId),
        'account-invalid-for-date'
      )
    }

    return {
      accountId,
      activityTypeId,
      checklistValues: input.checklistValues ?? [],
      date,
      description: input.description ?? null,
      endTime,
      id: id ?? Math.max(0, ...day.entries.map((entry) => entry.id)) + 1,
      startTime,
      ticketNumber: input.ticketNumber ?? null
    }
  }

  private overlapWarnings(entries: WorkEntry[], entry: WorkEntry): EntryResult['warnings'] {
    const entryIds = entries
      .filter((candidate) => overlaps(candidate, entry))
      .map((candidate) => candidate.id)
    return entryIds.length === 0 ? [] : [{ code: 'entry-overlap', entryIds }]
  }
}
