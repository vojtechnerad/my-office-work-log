import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import type { ReminderIntervalMinutes, ReminderSettings } from '../shared/ipc'

const supportedIntervals: ReminderIntervalMinutes[] = [15, 30, 60, 120]

export const defaultReminderSettings: ReminderSettings = {
  enabled: false,
  intervalMinutes: 30,
  language: 'en'
}

export interface ReminderSettingsStore {
  load: () => ReminderSettings
  save: (settings: ReminderSettings) => void
}

export interface ReminderTimer {
  clearInterval: (timer: ReturnType<typeof setInterval>) => void
  setInterval: (callback: () => void, milliseconds: number) => ReturnType<typeof setInterval>
}

export interface ReminderNotification {
  body: string
  title: string
}

export class JsonReminderSettingsStore implements ReminderSettingsStore {
  constructor(private readonly settingsPath: string) {}

  load(): ReminderSettings {
    if (!existsSync(this.settingsPath)) return defaultReminderSettings
    try {
      return normalizeSettings(JSON.parse(readFileSync(this.settingsPath, 'utf8')))
    } catch {
      return defaultReminderSettings
    }
  }

  save(settings: ReminderSettings): void {
    mkdirSync(dirname(this.settingsPath), { recursive: true })
    const temporaryPath = `${this.settingsPath}.tmp`
    writeFileSync(temporaryPath, JSON.stringify(settings, null, 2), 'utf8')
    renameSync(temporaryPath, this.settingsPath)
  }
}

export function normalizeSettings(settings: Partial<ReminderSettings>): ReminderSettings {
  return {
    enabled: settings.enabled === true,
    intervalMinutes: supportedIntervals.includes(
      settings.intervalMinutes as ReminderIntervalMinutes
    )
      ? (settings.intervalMinutes as ReminderIntervalMinutes)
      : defaultReminderSettings.intervalMinutes,
    language: settings.language === 'cs' ? 'cs' : 'en'
  }
}

export function reminderNotification(language: ReminderSettings['language']): ReminderNotification {
  return language === 'cs'
    ? { body: 'Zaznamenejte prosim odpracovany cas.', title: 'Pripomenuti MOWL' }
    : { body: 'Remember to record your work time.', title: 'MOWL reminder' }
}

export class ReminderService {
  private settings: ReminderSettings
  private timer: ReturnType<typeof setInterval> | undefined

  constructor(
    private readonly store: ReminderSettingsStore,
    private readonly timerApi: ReminderTimer,
    private readonly showNotification: (notification: ReminderNotification) => void
  ) {
    this.settings = store.load()
  }

  getSettings(): ReminderSettings {
    return this.settings
  }

  start(): void {
    this.reschedule()
  }

  update(settings: Partial<ReminderSettings>): ReminderSettings {
    this.settings = normalizeSettings({ ...this.settings, ...settings })
    this.store.save(this.settings)
    this.reschedule()
    return this.settings
  }

  stop(): void {
    if (this.timer !== undefined) {
      this.timerApi.clearInterval(this.timer)
      this.timer = undefined
    }
  }

  private reschedule(): void {
    this.stop()
    if (!this.settings.enabled) return
    this.timer = this.timerApi.setInterval(
      () => this.showNotification(reminderNotification(this.settings.language)),
      this.settings.intervalMinutes * 60 * 1000
    )
  }
}
