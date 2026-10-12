import User from './domain/model/user'

const KEY_USER = 'user'
const KEY_PRIVACY_MODE = 'privacyMode'
const KEY_NAV_COLLAPSED = 'navCollapsed'

export default class UserStore {
  constructor(private storage: Storage) {}

  public getUser() {
    const userString = this.storage.getItem(KEY_USER)
    if (userString == null) {
      return null
    }

    return JSON.parse(userString)
  }

  public upsertUser(user: User) {
    this.storage.setItem(KEY_USER, JSON.stringify({ ...user }))
  }

  public getPrivacyMode() {
    const privacyMode = this.storage.getItem(KEY_PRIVACY_MODE)
    if (privacyMode == null) {
      return false
    }

    return JSON.parse(privacyMode) as boolean
  }

  public upsertPrivacyMode(privacyMode: boolean) {
    this.storage.setItem(KEY_PRIVACY_MODE, JSON.stringify(privacyMode))
  }

  public getNavCollapsed() {
    return this.storage.getItem(KEY_NAV_COLLAPSED) === 'true'
  }

  public upsertNavCollapsed(collapsed: boolean) {
    this.storage.setItem(KEY_NAV_COLLAPSED, JSON.stringify(collapsed))
  }

  public clear() {
    this.storage.removeItem(KEY_USER)
    this.storage.removeItem(KEY_PRIVACY_MODE)
  }
}
