import { setupI18n, type I18n } from '@lingui/core'
import { compileMessage } from '@lingui/message-utils/compileMessage'
import type { AppLanguage } from './ipc'
import { csMessages, enMessages, type MessageKey } from './messages'

export function messagesFor(language: AppLanguage): Record<MessageKey, string> {
  return language === 'cs' ? csMessages : enMessages
}

export function createI18n(language: AppLanguage): I18n {
  const i18n = setupI18n()
  i18n.setMessagesCompiler(compileMessage)
  i18n.loadAndActivate({ locale: language, messages: messagesFor(language) })
  return i18n
}

export function translate(language: AppLanguage, key: MessageKey, values?: Record<string, unknown>): string {
  return createI18n(language)._(key, values)
}