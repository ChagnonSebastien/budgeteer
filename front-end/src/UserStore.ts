const KEY_USER = "user"

export type AuthMethod = "oidc" | "userPass";

export interface User {
  authMethod: AuthMethod
  id: string
  email: string
  username: string
  firstName: string
  lastName: string
}

export default class UserStore {
  constructor(private storage: Storage) {
  }

  public getUser() {
    const userString = this.storage.getItem(KEY_USER)
    if (userString == null) {
      return null
    }

    return JSON.parse(userString)
  }

  public upsertUser(user: Omit<User, "authMethod">, authMethod: AuthMethod) {
    this.storage.setItem(KEY_USER, JSON.stringify({...user, authMethod}))
  }

  public clear() {
    this.storage.removeItem(KEY_USER)
  }

}
