export default interface User {
  sub: string
  email: string
  preferred_username: string
  name: string
  default_currency: number | null
}
