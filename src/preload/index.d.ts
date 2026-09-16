import type { MowlApi } from '../shared/ipc'

declare global {
  interface Window {
    mowl: MowlApi
  }
}
