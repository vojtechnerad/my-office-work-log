import type { WorkspaceEntry, WorkspaceSnapshot } from './ipc'

export interface WorkEntryFilters {
  accountId?: number
  activityTypeId?: number
  customerId?: number
  dateFrom?: string
  dateTo?: string
  description?: string
  ticketNumber?: string
}

export interface DurationBreakdown {
  fillerMinutes: number
  totalMinutes: number
  workMinutes: number
}

export interface CustomerSummary {
  color: string | null
  customerId: number
  customerName: string
  minutes: number
}

export interface DashboardReport {
  byCustomer: CustomerSummary[]
  recentEntries: WorkspaceEntry[]
  today: DurationBreakdown
  week: DurationBreakdown
  weekFrom: string
  weekTo: string
}

export function entryDurationMinutes(entry: WorkspaceEntry): number {
  const [startHour, startMinute] = entry.startTime.split(':').map(Number)
  const [endHour, endMinute] = entry.endTime.split(':').map(Number)
  return endHour * 60 + endMinute - startHour * 60 - startMinute
}

export function filterWorkEntries(
  snapshot: WorkspaceSnapshot,
  filters: WorkEntryFilters
): WorkspaceEntry[] {
  const description = filters.description?.trim().toLocaleLowerCase()
  const ticketNumber = filters.ticketNumber?.trim().toLocaleLowerCase()

  return snapshot.entries.filter((entry) => {
    const account = snapshot.accounts.find((candidate) => candidate.id === entry.accountId)
    return (
      (!filters.dateFrom || entry.date >= filters.dateFrom) &&
      (!filters.dateTo || entry.date <= filters.dateTo) &&
      (!filters.customerId || account?.customerId === filters.customerId) &&
      (!filters.accountId || entry.accountId === filters.accountId) &&
      (!filters.activityTypeId || entry.activityTypeId === filters.activityTypeId) &&
      (!description || entry.description?.toLocaleLowerCase().includes(description)) &&
      (!ticketNumber || entry.ticketNumber?.toLocaleLowerCase().includes(ticketNumber))
    )
  })
}

function dateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function durationBreakdown(entries: WorkspaceEntry[]): DurationBreakdown {
  return entries.reduce<DurationBreakdown>(
    (summary, entry) => {
      const minutes = entryDurationMinutes(entry)
      summary.totalMinutes += minutes
      if (entry.accountId === null) summary.fillerMinutes += minutes
      else summary.workMinutes += minutes
      return summary
    },
    { fillerMinutes: 0, totalMinutes: 0, workMinutes: 0 }
  )
}

export function calculateDashboard(
  snapshot: WorkspaceSnapshot,
  selectedDate: string,
  recentLimit = 6
): DashboardReport {
  const selected = new Date(`${selectedDate}T12:00:00`)
  const mondayOffset = (selected.getDay() + 6) % 7
  const weekStart = new Date(selected)
  weekStart.setDate(selected.getDate() - mondayOffset)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const weekFrom = dateKey(weekStart)
  const weekTo = dateKey(weekEnd)
  const todayEntries = snapshot.entries.filter((entry) => entry.date === selectedDate)
  const weekEntries = snapshot.entries.filter(
    (entry) => entry.date >= weekFrom && entry.date <= weekTo
  )
  const minutesByCustomer = new Map<number, number>()
  for (const entry of weekEntries) {
    const account = snapshot.accounts.find((candidate) => candidate.id === entry.accountId)
    if (!account) continue
    minutesByCustomer.set(
      account.customerId,
      (minutesByCustomer.get(account.customerId) ?? 0) + entryDurationMinutes(entry)
    )
  }

  return {
    byCustomer: [...minutesByCustomer.entries()]
      .map(([customerId, minutes]) => {
        const customer = snapshot.customers.find((candidate) => candidate.id === customerId)
        return {
          color: customer?.color ?? null,
          customerId,
          customerName: customer?.name ?? 'Unknown customer',
          minutes
        }
      })
      .sort((first, second) => second.minutes - first.minutes),
    recentEntries: [...snapshot.entries]
      .sort((first, second) =>
        `${second.date} ${second.startTime}`.localeCompare(`${first.date} ${first.startTime}`)
      )
      .slice(0, recentLimit),
    today: durationBreakdown(todayEntries),
    week: durationBreakdown(weekEntries),
    weekFrom,
    weekTo
  }
}
