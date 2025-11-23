import User from './domain/model/user'

const KEY_USER = 'user'
const KEY_GROSS_INCOME = 'gross_income'
const KEY_INCOME_CATEGORY = 'incomeCategory'
const KEY_PRIVACY_MODE = 'privacyMode'

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

  public getGrossIncome() {
    const grossIncome = this.storage.getItem(KEY_GROSS_INCOME)
    if (grossIncome == null) {
      return null
    }

    return parseInt(grossIncome)
  }

  public upsertGrossIncome(grossIncome: number) {
    this.storage.setItem(KEY_GROSS_INCOME, grossIncome.toString())
  }

  public getIncomeCategoryId() {
    const incomeCategory = this.storage.getItem(KEY_INCOME_CATEGORY)
    if (incomeCategory == null) {
      return null
    }

    return parseInt(incomeCategory)
  }

  public upsertIncomeCategoryId(categoryId: number) {
    this.storage.setItem(KEY_INCOME_CATEGORY, categoryId.toString())
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

  public clear() {
    this.storage.removeItem(KEY_USER)
    this.storage.removeItem(KEY_GROSS_INCOME)
    this.storage.removeItem(KEY_INCOME_CATEGORY)
    this.storage.removeItem(KEY_PRIVACY_MODE)
  }
}
