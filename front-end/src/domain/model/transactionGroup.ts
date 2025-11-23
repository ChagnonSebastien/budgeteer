import Unique from './Unique'

export type TransactionGroupID = number

export enum SplitType {
  EQUAL,
  PERCENTAGE,
  SHARES,
}

export default class TransactionGroup implements Unique<TransactionGroupID, TransactionGroup> {
  constructor(
    readonly id: TransactionGroupID,
    readonly name: string,
    readonly originalCurrency: string,
    readonly splitType: SplitType,
  ) {}

  equals(other: TransactionGroup): boolean {
    if (this.id !== other.id) return false
    if (this.name !== other.name) return false
    if (this.originalCurrency !== other.originalCurrency) return false
    if (this.splitType !== other.splitType) return false
    return true
  }
}

export type TransactionGroupUpdatableFields = Pick<TransactionGroup, 'name' | 'splitType'>
