export type AuthMethod = 'oidc' | 'userPass' | 'guest' | 'demo'

export interface UserPreferences {
  gettingStartedDismissed?: boolean
  categoryTutorialDone?: boolean
  visitedPages?: string[]
  costsGrossIncome?: number
  costsEmploymentIncomeCategoryIds?: number[]
  costsOtherIncomeCategoryIds?: number[]
  costsTaxesCategoryIds?: number[]
  sharedExpensesOnly?: boolean
}

export const costsCategoryListKeys = [
  'costsEmploymentIncomeCategoryIds',
  'costsOtherIncomeCategoryIds',
  'costsTaxesCategoryIds',
] as const

export type UserPreferencesPatch = { [K in keyof UserPreferences]?: UserPreferences[K] | null }

export default interface User {
  sub: string
  email: string
  name: string
  display_name?: string | null
  default_currency: number | null
  hidden_default_account: number
  authentification_method: AuthMethod
  preferences?: UserPreferences
  is_admin?: boolean
}

export const hasGuestView = (user: User) =>
  user.authentification_method === 'guest' || user.preferences?.sharedExpensesOnly === true

export const needsUsageChoice = (user: User) =>
  user.preferences?.sharedExpensesOnly === undefined && user.default_currency === null

export interface ManagedUser {
  id: string
  email: string
  name: string
  loginMethod: 'oidc' | null
  sharedExpensesOnly: boolean | null
  isAdmin: boolean
  lastSeenAt: Date | null
}

export interface UserDeletionImpact {
  accounts: number
  transactions: number
  categories: number
  currencies: number
  movedToUnconfirmed: number
  deletedTransactionGroups: string[]
  blockingTransactionGroups: string[]
}
