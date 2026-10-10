import { createContext } from 'react'

export interface ReadOnlyReason {
  label: string
  explanation: string
}

export const offlineReason: ReadOnlyReason = {
  label: 'Unavailable offline',
  explanation: 'You are offline. Changes can be saved once you reconnect.',
}

export const demoReason: ReadOnlyReason = {
  label: 'Unavailable in the demo',
  explanation: 'This is a demo with generated data. Changes cannot be saved.',
}

export const ReadOnlyContext = createContext<ReadOnlyReason | null>(null)
