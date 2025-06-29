import Account, { AccountID } from './account'
import { AugmentedCategory, CategoryID } from './category'
import Currency, { CurrencyID } from './currency'
import Unique from './Unique'

export type TransactionID = number

export default class Transaction implements Unique<TransactionID> {
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
