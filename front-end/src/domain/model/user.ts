export type AuthMethod = 'oidc' | 'userPass' | 'guest' | 'demo'

export interface UserPreferences {
  gettingStartedDismissed?: boolean
  categoryTutorialDone?: boolean
  costsGrossIncome?: number
  costsIncomeCategoryId?: number
  costsIncomeCategoryIds?: number[]
}

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
}
