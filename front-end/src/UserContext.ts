import { createContext } from "react"

const KEY_USER = "user"

export interface User {
  id: string
  email: string
  username: string
  firstName: string
  lastName: string
}

class UserStore {
  constructor(private storage: Storage) {

  }

  public upsertUser(user: User) {
    this.storage.setItem(KEY_USER, JSON.stringify(user))
  }

  public getUser(): User | null {
    const userString = this.storage.getItem(KEY_USER)
    if (userString == null) {
      return null
    }

    return JSON.parse(userString)
  }

  public clearUser() {
    this.storage.removeItem(KEY_USER)
  }
}

export default createContext(new UserStore(localStorage))
