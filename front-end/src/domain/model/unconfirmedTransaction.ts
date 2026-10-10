import Transaction, {
  AugmentedTransaction,
  AugmentedTransactionGroupData,
  SplitOverride,
  TransactionGroupData,
} from './transaction'
import { AugmentedTransactionGroup, Email, TransactionGroupID } from './transactionGroup'
import Unique from './Unique'

export type UnconfirmedTransactionID = number

export default class UnconfirmedTransaction implements Unique<UnconfirmedTransactionID, UnconfirmedTransaction> {
  constructor(
    readonly id: UnconfirmedTransactionID,
    readonly transactionGroupId: TransactionGroupID,
    readonly owner: Email,
    readonly createdBy: Email,
    readonly amount: number, // in the group currency
    readonly date: Date,
    readonly note: string,
    readonly splitOverride: SplitOverride | null,
  ) {}

  equals(other: UnconfirmedTransaction): boolean {
    if (this.id !== other.id) return false
    if (this.transactionGroupId !== other.transactionGroupId) return false
    if (this.owner !== other.owner) return false
    if (this.createdBy !== other.createdBy) return false
    if (this.amount !== other.amount) return false
    if (this.date.getTime() !== other.date.getTime()) return false
    if (this.note !== other.note) return false
    if ((this.splitOverride === null) !== (other.splitOverride === null)) return false
    if (this.splitOverride !== null && !this.splitOverride.equals(other.splitOverride!)) return false
    return true
  }
}

export class UnconfirmedAugmentedTransaction extends AugmentedTransaction {
  constructor(
    readonly unconfirmed: UnconfirmedTransaction,
    transactionGroup: AugmentedTransactionGroup,
  ) {
    const transactionGroupData = new TransactionGroupData(transactionGroup.id, unconfirmed.splitOverride)
    super(
      new Transaction(
        unconfirmed.id,
        unconfirmed.owner,
        unconfirmed.amount,
        transactionGroup.augmentedCurrency.id,
        null,
        unconfirmed.date,
        null,
        null,
        unconfirmed.note,
        transactionGroup.augmentedCurrency.id,
        unconfirmed.amount,
        null,
        transactionGroupData,
      ),
      null,
      new AugmentedTransactionGroupData(transactionGroupData, transactionGroup),
      transactionGroup.augmentedCurrency,
      transactionGroup.augmentedCurrency,
    )
  }

  get listKey(): string {
    return `unconfirmed-${this.unconfirmed.id}`
  }
}

export type UnconfirmedTransactionUpdatableFields = Pick<
  UnconfirmedTransaction,
  'transactionGroupId' | 'owner' | 'createdBy' | 'amount' | 'date' | 'note' | 'splitOverride'
>

export interface PromotionFields {
  amount: number
  currencyId: number
  senderId: number | null
  receiverId: number | null
  categoryId: number | null
  date: Date
  note: string
  receiverCurrencyId: number
  receiverAmount: number
}
