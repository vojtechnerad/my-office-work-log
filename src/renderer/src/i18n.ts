import { I18nProvider, useLingui } from '@lingui/react'
import { createElement, type ReactNode } from 'react'
import type { AppLanguage } from '../../shared/ipc'
import { createI18n, messagesFor } from '../../shared/localization'
import type { MessageKey } from '../../shared/messages'

const i18n = createI18n('cs')

export type Translate = (key: MessageKey, values?: Record<string, unknown>) => string

export function activateLanguage(language: AppLanguage): void {
  i18n.loadAndActivate({ locale: language, messages: messagesFor(language) })
}

export function LocalizationProvider({ children }: { children: ReactNode }): React.JSX.Element {
  return createElement(I18nProvider, { i18n }, children)
}

export function useT(): Translate {
  const { _ } = useLingui()
  return (key, values) => _({ id: key, values })
}