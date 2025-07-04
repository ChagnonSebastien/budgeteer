import Account, { AccountID } from './account'
import { AugmentedCategory, CategoryID } from './category'
import Currency, { CurrencyID } from './currency'
import Unique from './Unique'

export type TransactionID = number

export default class Transaction implements Unique<TransactionID, Transaction> {
  constructor(
    readonly id: TransactionID,
    readonly amount: number,
    readonly currencyId: CurrencyID,
    readonly categoryId: CategoryID | null,
    readonly date: Date,
    readonly senderId: AccountID | null,
    readonly receiverId: AccountID | null,
    readonly note: string,
    readonly receiverCurrencyId: CurrencyID,
    readonly receiverAmount: number,
  ) {}

  equals(other: Transaction): boolean {
    if (this.id !== other.id) return false
    if (this.amount !== other.amount) return false
    if (this.currencyId !== other.currencyId) return false
    if (this.categoryId !== other.categoryId) return false
    if (this.date.getTime() !== other.date.getTime()) return false
    if (this.senderId !== other.senderId) return false
    if (this.receiverId !== other.receiverId) return false
    if (this.note !== other.note) return false
    if (this.receiverCurrencyId !== other.receiverCurrencyId) return false
    return this.receiverAmount === other.receiverAmount
  }
}

export class AugmentedTransaction extends Transaction {
  constructor(
    transaction: Transaction,
    public readonly currency: Currency,
    public readonly receiverCurrency: Currency,
    public readonly category?: AugmentedCategory,
    public readonly sender?: Account,
    public readonly receiver?: Account,
  ) {
    super(
      transaction.id,
      transaction.amount,
      transaction.currencyId,
      transaction.categoryId,
      transaction.date,
      transaction.senderId,
      transaction.receiverId,
      transaction.note,
      transaction.receiverCurrencyId,
      transaction.receiverAmount,
    )
  }
}

export type TransactionUpdatableFields = Pick<
  Transaction,
  | 'amount'
  | 'currencyId'
  | 'categoryId'
  | 'date'
  | 'senderId'
  | 'receiverId'
  | 'note'
  | 'receiverCurrencyId'
  | 'receiverAmount'
>
