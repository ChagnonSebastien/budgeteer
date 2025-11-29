export type AuthMethod = 'oidc' | 'userPass' | 'guest'

export default interface User {
  sub: string
  email: string
  preferred_username: string
  name: string
  default_currency: number | null
  hidden_default_account: number
  authentification_method: AuthMethod
}
