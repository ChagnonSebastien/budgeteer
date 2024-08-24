import Account from "./account"
import Category from "./category"
import Currency from "./currency"
import Unique from "./Unique"

export type AugmentedTransaction = Transaction & {
  readonly currency: Currency
  readonly category?: Category
  readonly sender?: Account
  readonly receiver?: Account
  readonly receiverCurrency: Currency
}

export default class Transaction implements Unique {
  constructor(
    readonly id: number,
    readonly amount: number,
    readonly currencyId: number,
    readonly categoryId: number | null,
    readonly date: Date,
    readonly senderId: number | null,
    readonly receiverId: number | null,
    readonly note: string,
    readonly receiverCurrencyId: number,
    readonly receiverAmount: number,
  ) {
  }
}