import Transaction, {
  AugmentedTransaction,
  AugmentedTransactionGroupData,
  TransactionGroupData,
  TransactionID,
} from './transaction'
import { AugmentedTransactionGroup, Email, TransactionGroupID } from './transactionGroup'
import Unique from './Unique'

export type SettlementID = number

export default class Settlement implements Unique<SettlementID, Settlement> {
  constructor(
    readonly id: SettlementID,
    readonly transactionGroupId: TransactionGroupID,
    readonly amount: number, // in the group currency
    readonly date: Date,
    readonly note: string,
    readonly payer: Email,
    readonly receiver: Email,
    readonly createdBy: Email,
    readonly proposedBy: Email,
    readonly completed: boolean,
    readonly ownTransactionId: TransactionID | null,
  ) {}

  isEnd(email: Email): boolean {
    return this.payer === email || this.receiver === email
  }

  equals(other: Settlement): boolean {
    return (
      this.id === other.id &&
      this.transactionGroupId === other.transactionGroupId &&
      this.amount === other.amount &&
      this.date.getTime() === other.date.getTime() &&
      this.note === other.note &&
      this.payer === other.payer &&
      this.receiver === other.receiver &&
      this.createdBy === other.createdBy &&
      this.proposedBy === other.proposedBy &&
      this.completed === other.completed &&
      this.ownTransactionId === other.ownTransactionId
    )
  }
}

export type SettlementUpdatableFields = Pick<Settlement, 'amount' | 'date' | 'note'>

export class SettlementAugmentedTransaction extends AugmentedTransaction {
  constructor(
    readonly settlement: Settlement,
    transactionGroup: AugmentedTransactionGroup,
  ) {
    const transactionGroupData = new TransactionGroupData(transactionGroup.id, null)
    super(
      new Transaction(
        settlement.id,
        settlement.payer,
        settlement.amount,
        transactionGroup.augmentedCurrency.id,
        null,
        settlement.date,
        null,
        null,
        settlement.note,
        transactionGroup.augmentedCurrency.id,
        settlement.amount,
        null,
        transactionGroupData,
      ),
      null,
      new AugmentedTransactionGroupData(transactionGroupData, transactionGroup),
      transactionGroup.augmentedCurrency,
      transactionGroup.augmentedCurrency,
    )
  }

  getUserContribution(user: string): number {
    if (user === this.settlement.payer) return this.amount
    if (user === this.settlement.receiver) return -this.amount
    return 0
  }

  get listKey(): string {
    return `settlement-${this.settlement.id}`
  }

  splitSummary(): string | null {
    return null
  }
}
