export default interface User {
  sub: string
  email: string
  preferred_username: string
  name: string
  default_currency: number | null
  hidden_default_account: number
  is_guest: boolean | undefined
}
