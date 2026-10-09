export type AuthMethod = 'oidc' | 'userPass' | 'guest'

export default interface User {
  sub: string
  email: string
  name: string
  display_name?: string | null
  default_currency: number | null
  hidden_default_account: number
  authentification_method: AuthMethod
}
