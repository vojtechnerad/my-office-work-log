import { describe, expect, it } from 'vitest'
import type { ReminderSettings } from '../shared/ipc'
import {
  defaultReminderSettings,
  ReminderService,
  type ReminderNotification,
  type ReminderSettingsStore,
  type ReminderTimer
} from './reminder-service'

class MemoryStore implements ReminderSettingsStore {
  saved: ReminderSettings[] = []
  constructor(private current: ReminderSettings = defaultReminderSettings) {}
  load(): ReminderSettings {
    return this.current
  }
  save(settings: ReminderSettings): void {
    this.current = settings
    this.saved.push(settings)
  }
}

class FakeTimer implements ReminderTimer {
  callbacks = new Map<number, () => void>()
  cleared: number[] = []
  intervals: number[] = []
  private nextId = 1
  clearInterval(timer: ReturnType<typeof setInterval>): void {
    this.cleared.push(timer as unknown as number)
    this.callbacks.delete(timer as unknown as number)
  }
  setInterval(callback: () => void, milliseconds: number): ReturnType<typeof setInterval> {
    const id = this.nextId++
    this.callbacks.set(id, callback)
    this.intervals.push(milliseconds)
    return id as unknown as ReturnType<typeof setInterval>
  }
  fire(): void {
    for (const callback of this.callbacks.values()) callback()
  }
}

describe('work-hour reminders', () => {
  it('is disabled by default and does not schedule notifications', () => {
    const timer = new FakeTimer()
    const service = new ReminderService(new MemoryStore(), timer, () => undefined)
    service.start()
    expect(service.getSettings()).toEqual(defaultReminderSettings)
    expect(timer.intervals).toEqual([])
  })

  it('enables notifications with persisted settings and the selected interval', () => {
    const timer = new FakeTimer()
    const notifications: ReminderNotification[] = []
    const store = new MemoryStore()
    const service = new ReminderService(store, timer, (notification) =>
      notifications.push(notification)
    )

    service.update({ enabled: true, intervalMinutes: 15, language: 'cs' })
    timer.fire()
    expect(store.saved).toEqual([{ enabled: true, intervalMinutes: 15, language: 'cs' }])
    expect(timer.intervals).toEqual([900000])
    expect(notifications).toEqual([
      { body: 'Nezapomente zaznamenat odpracovany cas.', title: 'Pripomenuti MOWL' }
    ])
  })

  it('restores the selected language from persisted settings', () => {
    const store = new MemoryStore()
    const service = new ReminderService(store, new FakeTimer(), () => undefined)

    service.update({ language: 'en' })
    const restartedService = new ReminderService(store, new FakeTimer(), () => undefined)
    restartedService.start()

    expect(restartedService.getSettings().language).toBe('en')
  })

  it('reschedules when the interval changes and stops notifications when disabled', () => {
    const timer = new FakeTimer()
    const service = new ReminderService(
      new MemoryStore({ ...defaultReminderSettings, enabled: true }),
      timer,
      () => undefined
    )
    service.start()
    service.update({ intervalMinutes: 120 })
    service.update({ enabled: false })
    expect(timer.intervals).toEqual([1800000, 7200000])
    expect(timer.cleared).toEqual([1, 2])
  })

  it('cleans up the active timer when the application exits', () => {
    const timer = new FakeTimer()
    const service = new ReminderService(
      new MemoryStore({ ...defaultReminderSettings, enabled: true }),
      timer,
      () => undefined
    )
    service.start()
    service.stop()
    expect(timer.cleared).toEqual([1])
  })
})
