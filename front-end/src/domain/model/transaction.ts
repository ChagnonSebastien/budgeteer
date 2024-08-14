import Account from "./account"
import Category from "./category"
import Currency from "./currency"
import Unique from "./Unique"

export type AugmentedTransaction = Transaction & {
  readonly currency: Currency
  readonly category: Category
  readonly sender?: Account
  readonly receiver?: Account

}

export default class Transaction implements Unique {
  readonly id: number
  readonly amount: number
  readonly currencyId: number
  readonly senderId: number | null
  readonly receiverId: number | null
  readonly categoryId: number
  readonly date: Date
  readonly note: string

  constructor(
    id: number,
    amount: number,
    currencyId: number,
    categoryId: number,
    date: Date,
    senderId: number | null,
    receiverId: number | null,
    note: string,
  ) {
    this.id = id
    this.amount = amount
    this.currencyId = currencyId
    this.senderId = senderId
    this.receiverId = receiverId
    this.categoryId = categoryId
    this.date = date
    this.note = note
  }
}